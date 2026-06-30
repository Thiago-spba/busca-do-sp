const axios = require("axios");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");
const cheerio = require("cheerio");

const URL_FORMULARIO = "https://www.imprensaoficial.com.br/DO/BuscaDO2001_11_2.aspx";
const BASE = "https://www.imprensaoficial.com.br";
const PREFIXO = "ctl00$ctl00$ctl00$content$content$content$";

function formatarDataBR(dataISO) {
  const [ano, mes, dia] = dataISO.split("-");
  return dia + "/" + mes + "/" + ano;
}

async function buscarAcervoHistorico(termo, fromDateISO, toDateISO) {
  try {
    const jar = new CookieJar();
    const client = wrapper(axios.create({
      jar,
      withCredentials: true,
      timeout: 20000,
      maxRedirects: 5,
      headers: { "User-Agent": "Mozilla/5.0 Chrome/120" },
    }));

    const paginaForm = await client.get(URL_FORMULARIO);
    const f = cheerio.load(paginaForm.data);
    const viewState = f("#__VIEWSTATE").val();
    const viewStateGen = f("#__VIEWSTATEGENERATOR").val() || "98FED98E";
    if (!viewState) throw new Error("VIEWSTATE nao encontrado");

    const corpo = new URLSearchParams();
    corpo.append("__EVENTTARGET", "");
    corpo.append("__EVENTARGUMENT", "");
    corpo.append("__VIEWSTATE", viewState);
    corpo.append("__VIEWSTATEGENERATOR", viewStateGen);
    corpo.append(PREFIXO + "txtPalavrasChave", termo);
    corpo.append(PREFIXO + "chkGrupos$0", "on");
    corpo.append(PREFIXO + "txtDataInicio", formatarDataBR(fromDateISO));
    corpo.append(PREFIXO + "txtDataFim", formatarDataBR(toDateISO));
    corpo.append(PREFIXO + "btnBuscar", "Buscar");

    // Deixa o axios seguir os redirects automaticamente, mantendo o cookie em cada salto
    const paginaFinal = await client.post(URL_FORMULARIO, corpo.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Referer": URL_FORMULARIO },
      maxRedirects: 5,
    });

    console.log("STATUS_FINAL:", paginaFinal.status);
    console.log("URL_FINAL:", paginaFinal.request?.res?.responseUrl || "indisponivel");

    const $ = cheerio.load(paginaFinal.data);
    const textoTotal = $("body").text();
    console.log("TRECHO_HTML:", textoTotal.substring(0, 300).replace(/\s+/g, " ").trim());

    const matchTotal = textoTotal.match(/Documentos encontrados:\s*([\d.]+)/i);
    const totalEncontrado = matchTotal ? parseInt(matchTotal[1].replace(/\./g, ""), 10) : 0;

    const linksPorHref = new Map();
    $(".resultadoBuscaItem").each((_, el) => {
      const linkHeader = $(el).find(".card-header a").first();
      const href = linkHeader.attr("href");
      const titulo = linkHeader.find(".card-title").text().trim();
      const trecho = $(el).find(".card-body .card-text").text().trim();
      if (!href) return;
      linksPorHref.set(href, { titulo, trecho });
    });

    const itens = Array.from(linksPorHref.entries()).map(([href, dados], i) => ({
      id: "historico-" + i + "-" + Date.now(),
      titulo: dados.titulo,
      trecho: dados.trecho,
      slug: href.startsWith("http") ? href : BASE + href,
      fonte: "historico",
    }));

    return { sucesso: true, fonte: "historico", totalEncontrado, itens };
  } catch (erro) {
    console.error("ERRO:", erro.message);
    return { sucesso: false, fonte: "historico", erro: erro.message, itens: [] };
  }
}

module.exports = { buscarAcervoHistorico };
