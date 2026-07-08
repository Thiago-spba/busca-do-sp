import { useCallback, useEffect, useState } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";

const TAMANHO_INICIAL = 30;
const INCREMENTO_PAGINA = 20;
const HORAS_LIMITE_LIXEIRA = 24;

function colecaoBuscas(uid) {
  return collection(db, "usuarios_autorizados", uid, "buscas");
}

function docBusca(uid, id) {
  return doc(db, "usuarios_autorizados", uid, "buscas", id);
}

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

/**
 * Verifica se uma entrada na lixeira ja passou do prazo de 24h
 * (a partir do momento em que foi movida para la) e deve ser apagada de vez.
 */
function passouPrazoLixeira(excluidoEm) {
  if (!excluidoEm?.toDate) return false;
  const horasPassadas = (Date.now() - excluidoEm.toDate().getTime()) / 3_600_000;
  return horasPassadas >= HORAS_LIMITE_LIXEIRA;
}

/**
 * Gerencia o historico de buscas do usuario logado (salvo no Firestore,
 * privado por usuario em usuarios_autorizados/{uid}/buscas).
 */
export function useHistoricoBuscas() {
  const [buscas, setBuscas] = useState([]);
  const [lixeira, setLixeira] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [limiteAtual, setLimiteAtual] = useState(TAMANHO_INICIAL);
  const [temMais, setTemMais] = useState(false);

  /**
   * Carrega as `limite` buscas mais recentes do Firestore. Busca uma a mais
   * do que o limite so para saber se existem mais alem dele (`temMais`),
   * sem precisar de um count() separado.
   */
  const carregarComLimite = useCallback(async (limite, { comoCarregandoMais = false } = {}) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setBuscas([]);
      setLixeira([]);
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
      const todas = snap.docs.slice(0, limite).map((d) => ({ id: d.id, ...d.data() }));

      // Limpeza preguicosa: qualquer item na lixeira ha mais de 24h e apagado
      // definitivamente aqui mesmo, sem precisar de agendamento/infra extra -
      // a checagem acontece sempre que o historico e carregado.
      const expirados = todas.filter((b) => b.excluidoEm && passouPrazoLixeira(b.excluidoEm));
      if (expirados.length > 0) {
        await Promise.all(expirados.map((b) => deleteDoc(docBusca(uid, b.id))));
      }

      const expiradosIds = new Set(expirados.map((b) => b.id));
      const restantes = todas.filter((b) => !expiradosIds.has(b.id));
      setBuscas(restantes.filter((b) => !b.excluidoEm));
      setLixeira(restantes.filter((b) => b.excluidoEm));
    } catch (err) {
      console.error("Erro ao carregar historico de buscas:", err);
    } finally {
      setCarregando(false);
      setCarregandoMais(false);
    }
  }, []);

  // Recarrega mantendo a quantidade ja carregada (usado apos salvar/atualizar/excluir/restaurar)
  const recarregar = useCallback(() => carregarComLimite(limiteAtual), [carregarComLimite, limiteAtual]);

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
  }, [carregarComLimite]);

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

  /**
   * Move uma busca para a lixeira (soft delete). Ela some da lista principal
   * mas pode ser restaurada em ate 24h - depois disso e apagada de vez
   * (na proxima vez que o historico for carregado, ver `recarregar`).
   */
  const moverParaLixeira = useCallback(async (id) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await updateDoc(docBusca(uid, id), { excluidoEm: serverTimestamp() });
      await recarregar();
    } catch (err) {
      console.error("Erro ao mover busca para a lixeira:", err);
    }
  }, [recarregar]);

  /** Restaura uma busca da lixeira, desde que ainda dentro do prazo de 24h. */
  const restaurarDaLixeira = useCallback(async (id) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await updateDoc(docBusca(uid, id), { excluidoEm: null });
      await recarregar();
    } catch (err) {
      console.error("Erro ao restaurar busca da lixeira:", err);
    }
  }, [recarregar]);

  return {
    buscas,
    lixeira,
    carregando,
    carregandoMais,
    temMais,
    salvarBusca,
    atualizarBusca,
    moverParaLixeira,
    restaurarDaLixeira,
    carregarMais,
    recarregar,
  };
}
