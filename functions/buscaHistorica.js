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
      timeout: 25000,
      maxRedirects: 5,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Origin": BASE,
      },
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

    // CORRECAO: marcar TODOS os 13 checkboxes de cadernos (0 a 12), como o navegador faz
    for (let i = 0; i <= 12; i++) {
      corpo.append(PREFIXO + "chkGrupos$" + i, "on");
    }

    corpo.append(PREFIXO + "txtDataInicio", formatarDataBR(fromDateISO));
    corpo.append(PREFIXO + "txtDataFim", formatarDataBR(toDateISO));

    // Campos extras da sidebar (presentes no form real)
    corpo.append("ctl00$ctl00$ctl00$content$ColunaContent$Coluna_dir_Tipo_C_nao_logado_DI_2_0$Inc_dir_servicos_grat$Inc_box_srv_gratuitos$txtData", new Date().toLocaleDateString("pt-BR"));
    corpo.append("ctl00$ctl00$ctl00$content$ColunaContent$Coluna_dir_Tipo_C_nao_logado_DI_2_0$Inc_dir_valide_ticket$txtTicket", "");

    corpo.append(PREFIXO + "btnBuscar", "Buscar");

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

