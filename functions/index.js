const { onRequest } = require("firebase-functions/v2/https");
const { buscarAcervoAtual } = require("./buscaAtual");
const { buscarAcervoHistorico } = require("./buscaHistorica");

/**
 * Endpoint HTTP: busca no acervo ATUAL (rapido, JSON).
 * Parametros esperados (query string): termos (separados por virgula), fromDate, toDate, pageNumber, pageSize
 */
exports.buscaAtual = onRequest({ region: "southamerica-east1", cors: true }, async (req, res) => {
  try {
    const { termos, fromDate, toDate, pageNumber, pageSize } = req.query;

    if (!termos || !fromDate || !toDate) {
      res.status(400).json({ erro: "Parametros obrigatorios: termos, fromDate, toDate" });
      return;
    }

    const listaTermos = termos.split(",").map((t) => t.trim());
    const resultado = await buscarAcervoAtual(
      listaTermos,
      fromDate,
      toDate,
      Number(pageNumber) || 1,
      Number(pageSize) || 20
    );

    res.status(200).json(resultado);
  } catch (erro) {
    console.error("Erro no endpoint buscaAtual:", erro);
    res.status(500).json({ erro: "Erro interno ao buscar acervo atual" });
  }
});

/**
 * Endpoint HTTP: busca no acervo HISTORICO (mais lento, HTML parseado).
 * Parametros esperados (query string): termo (apenas 1), fromDate, toDate (formato YYYY-MM-DD)
 */
exports.buscaHistorica = onRequest({ region: "southamerica-east1", cors: true }, async (req, res) => {
  try {
    const { termo, fromDate, toDate } = req.query;

    if (!termo || !fromDate || !toDate) {
      res.status(400).json({ erro: "Parametros obrigatorios: termo, fromDate, toDate" });
      return;
    }

    const resultado = await buscarAcervoHistorico(termo, fromDate, toDate);
    res.status(200).json(resultado);
  } catch (erro) {
    console.error("Erro no endpoint buscaHistorica:", erro);
    res.status(500).json({ erro: "Erro interno ao buscar acervo historico" });
  }
});
