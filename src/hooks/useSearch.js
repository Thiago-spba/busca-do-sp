import { useState } from "react";
import { buscarAtualAPI, buscarHistoricoAPI } from "../services/api";

/**
 * Remove acentos de uma string para comparacao flexivel.
 */
function removerAcentos(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function contemTermo(texto, termo) {
  const textoLimpo = removerAcentos(texto).toLowerCase();
  const termoLimpo = removerAcentos(termo).toLowerCase();
  return textoLimpo.includes(termoLimpo);
}

/**
 * Extrai as palavras "significativas" de um nome (ignora preposicoes e palavras curtas).
 */
function palavrasSignificativas(nome) {
  const ignorar = ["de", "da", "do", "dos", "das", "e"];
  return removerAcentos(nome)
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length > 2 && !ignorar.includes(p));
}

/**
 * Verifica se um nome aparece no texto por PROXIMIDADE:
 * encontra cada ocorrencia da primeira palavra significativa (ex: "thiago")
 * e checa, numa janela de caracteres ao redor dessa ocorrencia, quantas das
 * outras palavras do nome tambem aparecem ali perto. Isso evita falsos positivos
 * em documentos longos com milhares de nomes diferentes, onde "Thiago" e "Santos"
 * podem aparecer em pontos distantes do texto sem nenhuma relacao entre si.
 *
 * @param {string} texto - texto completo do item (ja sem acentos, minusculo)
 * @param {string[]} palavras - palavras significativas do nome buscado (sem acentos, minusculas)
 * @param {number} minimoPalavras - quantas palavras (alem da primeira) precisam estar na janela
 * @param {number} janela - tamanho da janela de busca ao redor de cada ocorrencia (em caracteres)
 */
function nomeAparecePorProximidade(texto, palavras, minimoPalavras = 2, janela = 80) {
  if (palavras.length === 0) return false;

  const primeira = palavras[0];
  const outras = palavras.slice(1);

  let indiceBusca = 0;
  while (true) {
    const posicao = texto.indexOf(primeira, indiceBusca);
    if (posicao === -1) break;

    const inicioJanela = Math.max(0, posicao - janela);
    const fimJanela = Math.min(texto.length, posicao + primeira.length + janela);
    const trechoJanela = texto.substring(inicioJanela, fimJanela);

    const encontradasNaJanela = outras.filter((p) => trechoJanela.includes(p));

    // Exige a primeira palavra + um minimo de outras palavras dentro da mesma janela
    if (encontradasNaJanela.length >= Math.min(minimoPalavras, outras.length)) {
      return true;
    }

    indiceBusca = posicao + primeira.length;
  }

  return false;
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
    const filtrosAssunto = termos.slice(1);

    const pAtual = buscarAtualAPI(nomePrincipal, fromDate, toDate);
    const pHistorico = buscarHistoricoAPI(nomePrincipal, fromDate, toDate);

    /**
     * Filtra os itens em duas etapas:
     * 1. Garante que o item e sobre a pessoa certa
     *    - Banco Atual: exige o nome completo exato (dados ja vem estruturados e confiaveis)
     *    - Arquivo Historico: exige varias palavras do nome aparecendo PROXIMAS umas das
     *      outras no texto (nao apenas presentes em qualquer parte do documento), pois
     *      documentos antigos sao listas longas com milhares de nomes diferentes
     * 2. Se ha filtros de assunto selecionados, exige que pelo menos um apareca
     */
    const filtrarItens = (itens) => {
      const palavras = palavrasSignificativas(nomePrincipal);

      let filtrados = itens.filter((item) => {
        const textoOriginal = (item.titulo || "") + " " + (item.trecho || "") + " " + (item.hierarquia || "");

        if (item.fonte === "atual") {
          return contemTermo(textoOriginal, nomePrincipal);
        } else {
          const textoLimpo = removerAcentos(textoOriginal).toLowerCase();
          // Exige a primeira palavra do nome + pelo menos mais 2 palavras proximas
          // (ou todas, se o nome tiver poucas palavras)
          const minimo = Math.max(2, palavras.length - 2);
          return nomeAparecePorProximidade(textoLimpo, palavras, minimo, 100);
        }
      });

      if (filtrosAssunto.length > 0) {
        filtrados = filtrados.filter((item) => {
          const textoCompleto = (item.titulo || "") + " " + (item.trecho || "") + " " + (item.hierarquia || "");
          return filtrosAssunto.some((filtro) => contemTermo(textoCompleto, filtro));
        });
      }

      return filtrados;
    };

    pAtual.then((res) => {
      setLoadingAtual(false);
      if (res.sucesso && res.itens) {
        const filtrados = filtrarItens(res.itens);
        setResultados((prev) => [...prev, ...filtrados]);
        setResumo((prev) => ({
          ...prev,
          atual: { total: res.totalItems, filtrados: filtrados.length },
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
        setResumo((prev) => ({
          ...prev,
          historico: { total: res.totalEncontrado || res.itens.length, filtrados: filtrados.length },
        }));
      } else if (res.erro) {
        setErros((prev) => [...prev, res.erro]);
      }
    });
  };

  return { resultados, erros, resumo, loadingAtual, loadingHistorico, buscar };
}

