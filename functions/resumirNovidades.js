const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { exigirUsuarioAutorizado } = require("./autenticacao");

const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

const MODELO = "claude-haiku-4-5-20251001";
const MAX_ITENS = 8;
const TAMANHO_MAX_TRECHO = 600;

/**
 * Chama a API da Anthropic para resumir, em poucas frases, o que ha de novo
 * entre varios documentos encontrados de uma vez para a mesma pessoa.
 */
async function pedirResumoIA(apiKey, nomePrincipal, itens) {
  const listaTexto = itens
    .slice(0, MAX_ITENS)
    .map((item, i) => `${i + 1}. ${item.titulo || "Publicação"}: ${String(item.trecho || "").slice(0, TAMANHO_MAX_TRECHO)}`)
    .join("\n\n");

  const resposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 260,
      system: "Voce resume, em portugues simples, o que ha de novo no Diario Oficial de Sao Paulo para um servidor de escola sem formacao juridica. Responda em no maximo 4 frases curtas, consolidando os documentos numa visao geral, sem inventar nenhuma informacao que nao esteja no texto fornecido.",
      messages: [
        { role: "user", content: `Nome: ${nomePrincipal}\n\nDocumentos novos encontrados:\n${listaTexto}\n\nResuma o que ha de novo.` },
      ],
    }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    throw new Error(`Anthropic API retornou ${resposta.status}: ${detalhe.slice(0, 200)}`);
  }

  const dados = await resposta.json();
  const texto = dados.content?.[0]?.text?.trim();
  if (!texto) throw new Error("Resposta da IA veio vazia.");
  return texto;
}

/**
 * Resume os documentos NOVOS encontrados para uma pessoa ao clicar "Ver e
 * atualizar" em Minhas Listas. Sem cache: cada chamada corresponde a um
 * evento real de novidade (ja raro por natureza, so acontece quando o
 * usuario clica E ha algo novo), entao nao ha risco de custo repetido.
 */
exports.resumirNovidades = onRequest(
  { region: "southamerica-east1", cors: true, secrets: [anthropicApiKey] },
  async (req, res) => {
    try {
      await exigirUsuarioAutorizado(req);
    } catch (erro) {
      res.status(erro.status || 401).json({ erro: erro.message });
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ erro: "Use POST." });
      return;
    }

    const { nomePrincipal, itens } = req.body || {};
    if (!nomePrincipal || !Array.isArray(itens) || itens.length === 0) {
      res.status(400).json({ erro: "Parametros obrigatorios: nomePrincipal, itens (lista nao vazia)" });
      return;
    }

    try {
      const texto = await pedirResumoIA(anthropicApiKey.value(), nomePrincipal, itens);
      res.status(200).json({ sucesso: true, texto });
    } catch (erro) {
      console.error("Erro no endpoint resumirNovidades:", erro);
      res.status(500).json({ erro: "Nao foi possivel gerar o resumo agora. Tente novamente em instantes." });
    }
  }
);
