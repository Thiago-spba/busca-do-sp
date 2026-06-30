const axios = require("axios");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");
const cheerio = require("cheerio");

const URL_FORMULARIO = "https://www.imprensaoficial.com.br/DO/BuscaDO2001_11_2.aspx";
const URL_RESULTADO = "https://www.imprensaoficial.com.br/DO/BuscaDO2001Resultado_11_3.aspx";
const BASE = "https://www.imprensaoficial.com.br";
const PREFIXO = "ctl00$ctl00$ctl00$content$content$content$";

function formatarDataBR(dataISO) {
  const [ano, mes, dia] = dataISO.split("-");
  return dia + "/" + mes + "/" + ano;
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function buscarAcervoHistorico(termo, fromDateISO, toDateISO) {
  try {
    const jar = new CookieJar();
    const client = wrapper(axios.create({
      jar, withCredentials: true, timeout: 20000, validateStatus: null,
      maxRedirects: 0, headers: { "User-Agent": "Mozilla/5.0 Chrome/120" },
    }));

    // Passo 1: GET formulario
    const paginaForm = await client.get(URL_FORMULARIO);
    await esperar(2000);

    const f = cheerio.load(paginaForm.data);
    const viewState = f("#__VIEWSTATE").val();
    const viewStateGen = f("#__VIEWSTATEGENERATOR").val() || "98FED98E";
    if (!viewState) throw new Error("VIEWSTATE nao encontrado");

    // Passo 2: POST com parametros da busca
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

    const postResp = await client.post(URL_FORMULARIO, corpo.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Referer": URL_FORMULARIO },
      maxRedirects: 0, validateStatus: null,
    });

    console.log("POST_STATUS:", postResp.status);
    console.log("POST_LOCATION:", postResp.headers.location);
    await esperar(5000);

    if (postResp.status !== 302) throw new Error("POST nao redirecionou: " + postResp.status);

    // Passo 3: GET na URL de resultado
    const locRedir1 = postResp.headers.location;
    if (!locRedir1) throw new Error("Redirect 1 não encontrado");

    const getRedir1 = await client.get(BASE + locRedir1, { headers: { Referer: URL_FORMULARIO }, maxRedirects: 0 });

    console.log("GET1_STATUS:", getRedir1.status); 
    console.log("GET1_LOCATION:", getRedir1.headers.location);
    await esperar(3000);

    if (getRedir1.status !== 302) throw new Error("GET redirect 1 nao redirecionou: " + getRedir1.status);

    const locRedir2 = getRedir1.headers.location;
    if (!locRedir2) throw new Error("Redirect 2 não encontrado");

    // Passo 4: GET na pagina final
    const urlFinal = locRedir2.startsWith("http") ? locRedir2 : BASE + locRedir2;
    console.log("URL_FINAL:", urlFinal);
    
    const paginaFinal = await client.get(urlFinal, { headers: { Referer: locRedir1 } });

    console.log("STATUS_FINAL:", paginaFinal.status);

    const $ = cheerio.load(paginaFinal.data);
    const textoTotal = $("body").text();

    console.log("TRECHO_HTML:", textoTotal.substring(0, 400).replace(/\s+/g, " ").trim());

    const matchTotal = textoTotal.match(/Documentos encontrados:\s*([\d.]+)/i);
    const totalEncontrado = matchTotal ? parseInt(matchTotal[1].replace(/\./g, ""), 10) : 0;

    const linksPorHref = new Map();
    $("a[href*='BuscaDO2001Documento_11_4.aspx']").each((_, el) => {
      const href = $(el).attr("href");
      const texto = $(el).text().trim();
      if (!href) return;
      if (!linksPorHref.has(href)) linksPorHref.set(href, { titulo: texto, trecho: "" });
      else linksPorHref.get(href).trecho = texto;
    });

    const itens = Array.from(linksPorHref.entries()).map(([href, dados], i) => ({
      id: "historico-" + i + "-" + Date.now(),
      titulo: dados.titulo, trecho: dados.trecho,
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
