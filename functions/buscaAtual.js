const axios = require("axios");

const BASE_URL_ATUAL = "https://do-api-web-search.doe.sp.gov.br/v2/advanced-search/publications";

/**
 * Busca publicacoes no acervo ATUAL do Diario Oficial de SP (2024 em diante).
 * Estratégia: busca pelo nome da pessoa com PageSize grande para pegar o máximo de resultados.
 * Os filtros por assunto são aplicados no frontend.
 */
async function buscarAcervoAtual(termos, fromDate, toDate, pageNumber = 1, pageSize = 100) {
  try {
    const params = {
      FromDate: fromDate,
      ToDate: toDate,
      PageNumber: pageNumber,
      PageSize: pageSize,
      SortField: "Date",
    };

    // Envia cada termo como um Term separado para a API
    termos.forEach((termo, index) => {
      params[`Terms[${index}]`] = termo;
    });

    const resposta = await axios.get(BASE_URL_ATUAL, { params, timeout: 15000 });

    return {
      sucesso: true,
      fonte: "atual",
      totalItems: resposta.data.totalItems,
      totalPages: resposta.data.totalPages,
      hasNextPage: resposta.data.hasNextPage,
      itens: resposta.data.items.map((item) => ({
        id: item.id,
        titulo: item.title,
        data: item.date,
        trecho: item.excerpt,
        hierarquia: item.hierarchy,
        slug: item.slug,
        fonte: "atual",
      })),
    };
  } catch (erro) {
    console.error("Erro ao buscar acervo atual:", erro.message, erro.response?.data);
    return { sucesso: false, fonte: "atual", erro: erro.message, itens: [] };
  }
}

module.exports = { buscarAcervoAtual };
