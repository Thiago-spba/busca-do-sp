import { useCallback, useEffect, useState } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  where,
  limit,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";

const TAMANHO_INICIAL = 30;
const INCREMENTO_PAGINA = 20;
const LISTA_PADRAO = "Favoritos";

function colecaoBuscas(uid) {
  return collection(db, "usuarios_autorizados", uid, "buscas");
}

function docBusca(uid, id) {
  return doc(db, "usuarios_autorizados", uid, "buscas", id);
}

function docMetaListas(uid) {
  return doc(db, "usuarios_autorizados", uid, "meta", "listas");
}

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

/**
 * Gerencia o historico de buscas do usuario logado (privado por usuario em
 * usuarios_autorizados/{uid}/buscas) e as "Minhas Listas" de acompanhamento.
 *
 * Cada busca pode pertencer a varias listas ao mesmo tempo (campo `listas`,
 * array de nomes). "Favoritos" e uma lista padrao que sempre existe; listas
 * extras ficam guardadas em meta/listas.
 */
export function useHistoricoBuscas() {
  const [buscas, setBuscas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [limiteAtual, setLimiteAtual] = useState(TAMANHO_INICIAL);
  const [temMais, setTemMais] = useState(false);

  // Nomes das listas EXTRAS (alem de "Favoritos") e os membros de todas as listas.
  const [nomesListas, setNomesListas] = useState([]);
  const [itensListas, setItensListas] = useState([]);

  const carregarListas = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setNomesListas([]);
      setItensListas([]);
      return;
    }
    try {
      const metaSnap = await getDoc(docMetaListas(uid));
      const extras = metaSnap.exists() ? metaSnap.data().nomes || [] : [];
      setNomesListas(extras);

      // Uma unica query traz todas as buscas que estao em qualquer lista.
      const todas = [LISTA_PADRAO, ...extras];
      const q = query(colecaoBuscas(uid), where("listas", "array-contains-any", todas));
      const snap = await getDocs(q);
      setItensListas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar listas:", err);
    }
  }, []);

  /**
   * Carrega as `limite` buscas mais recentes. Busca uma a mais do que o limite
   * so para saber se ha mais alem dele (`temMais`). Se `silencioso`, nao mostra
   * o estado "Carregando..." (usado nas recargas apos acoes, para nao piscar).
   */
  const carregarComLimite = useCallback(async (limite, { comoCarregandoMais = false, silencioso = false } = {}) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setBuscas([]);
      setCarregando(false);
      setCarregandoMais(false);
      return;
    }
    if (comoCarregandoMais) setCarregandoMais(true);
    else if (!silencioso) setCarregando(true);
    try {
      const q = query(colecaoBuscas(uid), orderBy("criadoEm", "desc"), limit(limite + 1));
      const snap = await getDocs(q);
      setTemMais(snap.docs.length > limite);
      setBuscas(snap.docs.slice(0, limite).map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar historico de buscas:", err);
    } finally {
      setCarregando(false);
      setCarregandoMais(false);
    }
  }, []);

  // Recarrega SILENCIOSAMENTE (sem piscar) o historico e as listas. Usado apos
  // qualquer acao (salvar/atualizar/excluir/favoritar/criar lista/etc).
  const recarregar = useCallback(async () => {
    await carregarComLimite(limiteAtual, { silencioso: true });
    await carregarListas();
  }, [carregarComLimite, limiteAtual, carregarListas]);

  const carregarMais = useCallback(async () => {
    const novoLimite = limiteAtual + INCREMENTO_PAGINA;
    await carregarComLimite(novoLimite, { comoCarregandoMais: true });
    setLimiteAtual(novoLimite);
  }, [limiteAtual, carregarComLimite]);

  useEffect(() => {
    // Carga inicial ao montar (sincroniza com o Firestore). Aqui SIM mostra "Carregando".
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarComLimite(TAMANHO_INICIAL);
    carregarListas();
  }, [carregarComLimite, carregarListas]);

  const salvarBusca = useCallback(async ({ termos, fromDate, toDate, totalAtual, totalHistorico, idsAtual, idsHistorico, itensAtual, itensHistorico, diagnostico }) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await addDoc(colecaoBuscas(uid), {
        termos,
        nomePrincipal: termos[0] || "",
        filtros: termos.slice(1),
        fromDate,
        toDate,
        totalAtual,
        totalHistorico,
        idsAtual,
        idsHistorico,
        itensAtual: itensAtual || [],
        itensHistorico: itensHistorico || [],
        diagnostico: diagnostico || null,
        listas: [],
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
      await recarregar();
    } catch (err) {
      console.error("Erro ao salvar busca no historico:", err);
    }
  }, [recarregar]);

  /**
   * Reexecuta a busca de uma entrada (do fromDate original ate hoje), compara os
   * IDs encontrados com os salvos e atualiza o registro. Retorna quantos sao novos.
   */
  const atualizarBusca = useCallback(async (entrada, buscarFn) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return { novosAtual: 0, novosHistorico: 0 };

    const toDate = hojeISO();
    const resultado = await buscarFn(entrada.termos, entrada.fromDate, toDate);
    if (!resultado) return { novosAtual: 0, novosHistorico: 0 };

    const idsAtualAntigos = new Set(entrada.idsAtual || []);
    const idsHistoricoAntigos = new Set(entrada.idsHistorico || []);
    const novosAtual = resultado.idsAtual.filter((id) => !idsAtualAntigos.has(id)).length;
    const novosHistorico = resultado.idsHistorico.filter((id) => !idsHistoricoAntigos.has(id)).length;

    try {
      await updateDoc(docBusca(uid, entrada.id), {
        toDate,
        totalAtual: resultado.totalAtual,
        totalHistorico: resultado.totalHistorico,
        idsAtual: resultado.idsAtual,
        idsHistorico: resultado.idsHistorico,
        itensAtual: resultado.itensAtual || [],
        itensHistorico: resultado.itensHistorico || [],
        diagnostico: resultado.diagnostico || null,
        atualizadoEm: serverTimestamp(),
      });
      await recarregar();
    } catch (err) {
      console.error("Erro ao atualizar busca no historico:", err);
    }

    return { novosAtual, novosHistorico };
  }, [recarregar]);

  /** Exclui uma busca do historico definitivamente (confirmacao acontece na UI). */
  const excluirBusca = useCallback(async (id) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await deleteDoc(docBusca(uid, id));
      await recarregar();
    } catch (err) {
      console.error("Erro ao excluir busca do historico:", err);
    }
  }, [recarregar]);

  /** Cria uma nova lista de favoritos (nome livre). */
  const criarLista = useCallback(async (nome) => {
    const uid = auth.currentUser?.uid;
    const limpo = (nome || "").trim();
    if (!uid || !limpo || limpo === LISTA_PADRAO) return;
    try {
      await setDoc(docMetaListas(uid), { nomes: arrayUnion(limpo) }, { merge: true });
      await carregarListas();
    } catch (err) {
      console.error("Erro ao criar lista:", err);
    }
  }, [carregarListas]);

  /**
   * Exclui uma lista inteira: tira o nome de meta/listas e remove essa lista de
   * todas as buscas que estavam nela (a busca continua no historico, so sai da
   * lista). "Favoritos" nao pode ser excluida.
   */
  const excluirLista = useCallback(async (nome) => {
    const uid = auth.currentUser?.uid;
    if (!uid || nome === LISTA_PADRAO) return;
    try {
      await setDoc(docMetaListas(uid), { nomes: arrayRemove(nome) }, { merge: true });
      const membros = itensListas.filter((b) => (b.listas || []).includes(nome));
      await Promise.all(membros.map((b) => updateDoc(docBusca(uid, b.id), { listas: arrayRemove(nome) })));
      await recarregar();
    } catch (err) {
      console.error("Erro ao excluir lista:", err);
    }
  }, [recarregar, itensListas]);

  /** Adiciona (incluir=true) ou remove (incluir=false) uma busca de uma lista. */
  const definirMembroLista = useCallback(async (id, nome, incluir) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await updateDoc(docBusca(uid, id), {
        listas: incluir ? arrayUnion(nome) : arrayRemove(nome),
      });
      await recarregar();
    } catch (err) {
      console.error("Erro ao alterar membros da lista:", err);
    }
  }, [recarregar]);

  return {
    buscas,
    carregando,
    carregandoMais,
    temMais,
    nomesListas,
    itensListas,
    listaPadrao: LISTA_PADRAO,
    salvarBusca,
    atualizarBusca,
    excluirBusca,
    criarLista,
    excluirLista,
    definirMembroLista,
    carregarMais,
    recarregar,
  };
}
