import { useState, useRef } from "react";
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

const PREPOSICOES = ["de", "da", "do", "dos", "das", "e"];

/**
 * Quebra um texto em palavras "puras" (so letras), descartando pontuacao.
 * Isso separa abreviacoes coladas como "A.A." em duas iniciais: "a", "a".
 */
function tokenizar(texto) {
  return removerAcentos(texto)
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((p) => p.length > 0);
}

/**
 * Extrai as palavras "significativas" de um nome (ignora preposicoes).
 * Iniciais/abreviacoes (ex: "F." ou "A.A.") viram tokens curtos separados.
 */
function palavrasSignificativas(nome) {
  return tokenizar(nome).filter((p) => !PREPOSICOES.includes(p));
}

/**
 * Verifica se duas palavras "batem", aceitando abreviacao em QUALQUER DIRECAO:
 * - a busca pode estar abreviada e o documento completo (ex: busca "j", documento "joao")
 * - OU o documento oficial pode estar abreviado e a busca completa (ex: busca "amaral",
 *   documento "a."), que e o caso mais comum no Diario Oficial, que costuma abreviar
 *   nomes do meio por espaco (ex: "Thiago F. do A.A. dos Santos")
 */
function palavrasBatem(a, b) {
  if (a === b) return true;
  if (a.length <= 2 && b.startsWith(a)) return true;
  if (b.length <= 2 && a.startsWith(b)) return true;
  return false;
}

function contemPalavra(tokensTexto, palavraBusca) {
  return tokensTexto.some((t) => palavrasBatem(palavraBusca, t));
}

/**
 * Verifica se um nome aparece no texto por PROXIMIDADE:
 * encontra cada ocorrencia da primeira palavra significativa (ex: "thiago")
 * e checa, numa janela de palavras ao redor dessa ocorrencia, quantas das
 * outras palavras do nome tambem aparecem ali perto. Isso evita falsos positivos
 * em documentos longos com milhares de nomes diferentes, onde "Thiago" e "Santos"
 * podem aparecer em pontos distantes do texto sem nenhuma relacao entre si.
 * Abreviacoes (nos dois sentidos) sao aceitas via palavrasBatem.
 *
 * @param {string[]} tokensTexto - palavras do texto do item (ja tokenizadas)
 * @param {string[]} palavras - palavras significativas do nome buscado
 * @param {number} minimoPalavras - quantas palavras (alem da primeira) precisam estar na janela
 * @param {number} janelaTokens - quantas palavras para cada lado formam a janela de proximidade
 */
function nomeAparecePorProximidade(tokensTexto, palavras, minimoPalavras = 2, janelaTokens = 18) {
  if (palavras.length === 0) return false;

  const primeira = palavras[0];
  const outras = palavras.slice(1);

  for (let i = 0; i < tokensTexto.length; i++) {
    if (!palavrasBatem(primeira, tokensTexto[i])) continue;

    const inicio = Math.max(0, i - janelaTokens);
    const fim = Math.min(tokensTexto.length, i + janelaTokens + 1);
    const janela = tokensTexto.slice(inicio, fim);

    const encontradasNaJanela = outras.filter((p) => contemPalavra(janela, p));

    // Exige a primeira palavra + um minimo de outras palavras dentro da mesma janela
    if (encontradasNaJanela.length >= Math.min(minimoPalavras, outras.length)) {
      return true;
    }
  }

  return false;
}

/**
 * Verifica se TODAS as palavras significativas do nome aparecem no texto
 * (nao precisa ser proximas, pois o Banco Atual ja traz publicacoes especificas
 * e curtas). Aceita abreviacoes nos dois sentidos via palavrasBatem.
 */
function nomeCompletoBate(tokensTexto, palavras) {
  if (palavras.length === 0) return false;
  return palavras.every((p) => contemPalavra(tokensTexto, p));
}

export function useSearch() {
  const [resultados, setResultados] = useState([]);
  const [erros, setErros] = useState([]);
  const [loadingAtual, setLoadingAtual] = useState(false);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [resumo, setResumo] = useState(null);
  const buscaAtualId = useRef(0);

  const buscar = async (termos, fromDate, toDate) => {
    const idDestaBusca = ++buscaAtualId.current;
    const aindaValida = () => buscaAtualId.current === idDestaBusca;

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
     * 1. Garante que o item e sobre a pessoa certa (aceitando iniciais/abreviacoes no nome)
     *    - Banco Atual: exige todas as palavras do nome no texto (dados ja vem estruturados)
     *    - Arquivo Historico: exige varias palavras do nome aparecendo PROXIMAS umas das
     *      outras no texto (nao apenas presentes em qualquer parte do documento), pois
     *      documentos antigos sao listas longas com milhares de nomes diferentes
     * 2. Se ha filtros de assunto selecionados, exige que pelo menos um apareca
     */
    const filtrarItens = (itens) => {
      const palavras = palavrasSignificativas(nomePrincipal);

      let filtrados = itens.filter((item) => {
        const textoOriginal = (item.titulo || "") + " " + (item.trecho || "") + " " + (item.hierarquia || "");
        const tokensTexto = tokenizar(textoOriginal);

        if (item.fonte === "atual") {
          return nomeCompletoBate(tokensTexto, palavras);
        } else {
          // Exige a primeira palavra do nome + pelo menos mais 2 palavras proximas
          // (ou todas, se o nome tiver poucas palavras)
          const minimo = Math.max(2, palavras.length - 2);
          return nomeAparecePorProximidade(tokensTexto, palavras, minimo, 18);
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

    const idsAtual = [];
    const idsHistorico = [];
    // Contadores de diagnostico: quantos itens a fonte reporta ter no total,
    // quantos ela de fato nos devolveu, e quantos sobreviveram ao nosso filtro.
    // Ajudam a distinguir "a fonte nao achou nada" de "nosso filtro descartou".
    const diagnostico = {
      atual: { totalFonte: 0, totalRecebido: 0, totalFiltrado: 0 },
      historico: { totalFonte: 0, totalRecebido: 0, totalFiltrado: 0 },
    };

    const resultadoAtual = pAtual.then((res) => {
      if (!aindaValida()) return;
      setLoadingAtual(false);
      if (res.sucesso && res.itens) {
        const filtrados = filtrarItens(res.itens);
        filtrados.forEach((item) => idsAtual.push(item.id));
        diagnostico.atual = {
          totalFonte: res.totalItems || res.itens.length,
          totalRecebido: res.itens.length,
          totalFiltrado: filtrados.length,
        };
        setResultados((prev) => [...prev, ...filtrados]);
        setResumo((prev) => ({
          ...prev,
          atual: { total: res.totalItems, filtrados: filtrados.length },
        }));
      } else if (res.erro) {
        setErros((prev) => [...prev, res.erro]);
      }
    });

    const resultadoHistorico = pHistorico.then((res) => {
      if (!aindaValida()) return;
      setLoadingHistorico(false);
      if (res.sucesso && res.itens) {
        const filtrados = filtrarItens(res.itens);
        filtrados.forEach((item) => idsHistorico.push(item.id));
        diagnostico.historico = {
          totalFonte: res.totalEncontrado || res.itens.length,
          totalRecebido: res.itens.length,
          totalFiltrado: filtrados.length,
        };
        setResultados((prev) => [...prev, ...filtrados]);
        setResumo((prev) => ({
          ...prev,
          historico: { total: res.totalEncontrado || res.itens.length, filtrados: filtrados.length },
        }));
      } else if (res.erro) {
        setErros((prev) => [...prev, res.erro]);
      }
    });

    await Promise.all([resultadoAtual, resultadoHistorico]);

    // Se essa busca foi superada por uma mais recente, nao retorna resultado
    // (evita salvar historico incompleto/incorreto de uma busca ja cancelada)
    if (!aindaValida()) return null;

    return {
      idsAtual,
      idsHistorico,
      totalAtual: idsAtual.length,
      totalHistorico: idsHistorico.length,
      diagnostico,
    };
  };

  return { resultados, erros, resumo, loadingAtual, loadingHistorico, buscar };
}

