import { useState } from "react";
import { buscarAtualAPI, buscarHistoricoAPI } from "../services/api";

/**
 * Remove acentos de uma string para comparação flexível.
 * Ex: "Licença Saúde" → "Licenca Saude"
 */
function removerAcentos(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Verifica se o texto contém o termo, ignorando acentos e maiúsculas.
 */
function contemTermo(texto, termo) {
  const textoLimpo = removerAcentos(texto).toLowerCase();
  const termoLimpo = removerAcentos(termo).toLowerCase();
  return textoLimpo.includes(termoLimpo);
}

export function useSearch() {
  const [resultados, setResultados] = useState([]);
  const [erros, setErros] = useState([]);
  const [loadingAtual, setLoadingAtual] = useState(false);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [resumo, setResumo] = useState(null);

  const buscar = async (termos, fromDate, toDate) => {
    setResultados([]);
    setErros([]);
    setResumo(null);
    setLoadingAtual(true);
    setLoadingHistorico(true);

    const nomePrincipal = termos[0];
    const filtrosAssunto = termos.slice(1); // Assuntos selecionados nos checkboxes

    const pAtual = buscarAtualAPI(nomePrincipal, fromDate, toDate);
    const pHistorico = buscarHistoricoAPI(nomePrincipal, fromDate, toDate);

    /**
     * Filtra os itens em duas etapas:
     * 1. Primeiro garante que o item menciona o NOME da pessoa
     *    - Para o Banco Atual: exige nome completo (dados estruturados)
     *    - Para o Arquivo Histórico: aceita se pelo menos 2 palavras significativas do nome
     *      aparecem juntas, pois o DO antigo frequentemente abrevia
     * 2. Se o usuário selecionou assuntos, verifica se o item menciona pelo menos um deles
     */
    const palavrasSignificativas = (nome) => {
      const ignorar = ["de", "da", "do", "dos", "das", "e"];
      return nome.split(/\s+/).filter(p => p.length > 2 && !ignorar.includes(p.toLowerCase()));
    };

    const filtrarItens = (itens) => {
      const palavras = palavrasSignificativas(nomePrincipal);

      let filtrados = itens.filter(item => {
        const textoCompleto = removerAcentos((item.titulo || "") + " " + (item.trecho || "") + " " + (item.hierarquia || "")).toLowerCase();

        if (item.fonte === "atual") {
          // Banco Atual: exige nome completo
          return contemTermo(textoCompleto, nomePrincipal);
        } else {
          // Arquivo Histórico: aceita se pelo menos 2 palavras significativas aparecem
          const matches = palavras.filter(p => textoCompleto.includes(removerAcentos(p).toLowerCase()));
          return matches.length >= 2;
        }
      });

      // Etapa 2: Se há filtros de assunto, aplicar
      if (filtrosAssunto.length > 0) {
        filtrados = filtrados.filter(item => {
          const textoCompleto = (item.titulo || "") + " " + (item.trecho || "") + " " + (item.hierarquia || "");
          return filtrosAssunto.some(filtro => contemTermo(textoCompleto, filtro));
        });
      }

      return filtrados;
    };

    pAtual.then((res) => {
      setLoadingAtual(false);
      if (res.sucesso && res.itens) {
        const filtrados = filtrarItens(res.itens);
        setResultados((prev) => [...prev, ...filtrados]);
        setResumo(prev => ({
          ...prev,
          atual: { total: res.totalItems, filtrados: filtrados.length }
        }));
      } else if (res.erro) {
        setErros((prev) => [...prev, res.erro]);
      }
    });

    pHistorico.then((res) => {
      setLoadingHistorico(false);
      if (res.sucesso && res.itens) {
        const filtrados = filtrarItens(res.itens);
        setResultados((prev) => [...prev, ...filtrados]);
        setResumo(prev => ({
          ...prev,
          historico: { total: res.totalEncontrado || res.itens.length, filtrados: filtrados.length }
        }));
      } else if (res.erro) {
        setErros((prev) => [...prev, res.erro]);
      }
    });
  };

  return { resultados, erros, resumo, loadingAtual, loadingHistorico, buscar };
}
