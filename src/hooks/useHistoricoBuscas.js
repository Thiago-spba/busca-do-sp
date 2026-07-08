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
 * Gerencia o historico de buscas do usuario logado (salvo no Firestore,
 * privado por usuario em usuarios_autorizados/{uid}/buscas).
 */
export function useHistoricoBuscas() {
  const [buscas, setBuscas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [limiteAtual, setLimiteAtual] = useState(TAMANHO_INICIAL);
  const [temMais, setTemMais] = useState(false);

  // "Minhas Listas": Favoritos (fixa) + listas personalizadas criadas pelo usuario.
  // Carregadas a parte da paginacao do historico geral, para uma pessoa favoritada
  // continuar aparecendo aqui mesmo se sair das paginas carregadas do historico.
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
      setNomesListas(metaSnap.exists() ? metaSnap.data().nomes || [] : []);

      const q = query(colecaoBuscas(uid), where("lista", "!=", null));
      const snap = await getDocs(q);
      setItensListas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar listas:", err);
    }
  }, []);

  /**
   * Carrega as `limite` buscas mais recentes do Firestore. Busca uma a mais
   * do que o limite so para saber se existem mais alem dele (`temMais`),
   * sem precisar de um count() separado.
   */
  const carregarComLimite = useCallback(async (limite, { comoCarregandoMais = false } = {}) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setBuscas([]);
      setCarregando(false);
      setCarregandoMais(false);
      return;
    }
    if (comoCarregandoMais) setCarregandoMais(true);
    else setCarregando(true);
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

  // Recarrega mantendo a quantidade ja carregada, e tambem as listas (usado apos
  // salvar/atualizar/excluir/atribuir a uma lista)
  const recarregar = useCallback(async () => {
    await carregarComLimite(limiteAtual);
    await carregarListas();
  }, [carregarComLimite, limiteAtual, carregarListas]);

  // Traz mais `INCREMENTO_PAGINA` buscas antigas, alem das ja carregadas
  const carregarMais = useCallback(async () => {
    const novoLimite = limiteAtual + INCREMENTO_PAGINA;
    await carregarComLimite(novoLimite, { comoCarregandoMais: true });
    setLimiteAtual(novoLimite);
  }, [limiteAtual, carregarComLimite]);

  useEffect(() => {
    // Busca inicial do historico ao montar (sincroniza com o Firestore, uso legitimo de efeito)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarComLimite(TAMANHO_INICIAL);
    carregarListas();
  }, [carregarComLimite, carregarListas]);

  const salvarBusca = useCallback(async ({ termos, fromDate, toDate, totalAtual, totalHistorico, idsAtual, idsHistorico, diagnostico }) => {
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
        diagnostico: diagnostico || null,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
      await recarregar();
    } catch (err) {
      console.error("Erro ao salvar busca no historico:", err);
    }
  }, [recarregar]);

  /**
   * Reexecuta a busca de uma entrada do historico (do fromDate original ate hoje)
   * usando a funcao `buscar` do useSearch, compara os IDs encontrados com os
   * salvos anteriormente e atualiza o registro. Retorna quantos itens sao novos.
   */
  const atualizarBusca = useCallback(async (entrada, buscarFn) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return { novosAtual: 0, novosHistorico: 0 };

    const toDate = hojeISO();
    const resultado = await buscarFn(entrada.termos, entrada.fromDate, toDate);
    // buscarFn pode retornar null se a busca foi cancelada por uma mais recente
    // (nao deveria acontecer, ja que a UI so permite uma operacao por vez, mas
    // e uma protecao barata contra o crash caso isso mude no futuro)
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
        diagnostico: resultado.diagnostico || null,
        atualizadoEm: serverTimestamp(),
      });
      await recarregar();
    } catch (err) {
      console.error("Erro ao atualizar busca no historico:", err);
    }

    return { novosAtual, novosHistorico };
  }, [recarregar]);

  /** Exclui uma busca definitivamente (o pedido de confirmacao acontece na UI, antes de chamar isto). */
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

  /** Cria uma nova lista personalizada (nome livre, ex: "Favoritos - Departamento X"). */
  const criarLista = useCallback(async (nome) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !nome?.trim()) return;
    try {
      await setDoc(docMetaListas(uid), { nomes: arrayUnion(nome.trim()) }, { merge: true });
      await carregarListas();
    } catch (err) {
      console.error("Erro ao criar lista:", err);
    }
  }, [carregarListas]);

  /**
   * Exclui uma lista personalizada inteira: remove o nome da lista de listas e
   * desatribui (nao apaga) todas as buscas que estavam nela. A lista fixa
   * "Favoritos" nao pode ser excluida (a UI nao oferece essa opcao pra ela).
   */
  const excluirLista = useCallback(async (nome) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await setDoc(docMetaListas(uid), { nomes: arrayRemove(nome) }, { merge: true });
      const afetadas = itensListas.filter((b) => b.lista === nome);
      await Promise.all(afetadas.map((b) => updateDoc(docBusca(uid, b.id), { lista: null })));
      await recarregar();
    } catch (err) {
      console.error("Erro ao excluir lista:", err);
    }
  }, [recarregar, itensListas]);

  /** Atribui (ou remove, se `lista` for null) uma busca a uma lista. */
  const atribuirLista = useCallback(async (id, lista) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await updateDoc(docBusca(uid, id), { lista: lista || null });
      await recarregar();
    } catch (err) {
      console.error("Erro ao atribuir busca a uma lista:", err);
    }
  }, [recarregar]);

  return {
    buscas,
    carregando,
    carregandoMais,
    temMais,
    nomesListas,
    itensListas,
    salvarBusca,
    atualizarBusca,
    excluirBusca,
    criarLista,
    excluirLista,
    atribuirLista,
    carregarMais,
    recarregar,
  };
}
