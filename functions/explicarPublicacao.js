const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("./firebaseAdmin");
const { exigirUsuarioAutorizado } = require("./autenticacao");

const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

const MODELO = "claude-haiku-4-5-20251001";
const TAMANHO_MAX_TRECHO = 2000;

/**
 * Chama a API da Anthropic para explicar, em portugues simples, o que uma
 * publicacao do Diario Oficial significa. Prompt restrito a poucas frases e
 * proibido de inventar informacao que nao esteja no texto original.
 */
async function pedirExplicacaoIA(apiKey, titulo, trecho) {
  const resposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 220,
      system: "Voce explica publicacoes burocraticas do Diario Oficial de Sao Paulo em portugues simples, para servidores de escola sem formacao juridica. Responda em no maximo 3 frases curtas, direto ao ponto, sem repetir o texto original e sem inventar nenhuma informacao que nao esteja no texto fornecido.",
      messages: [
        { role: "user", content: `Titulo: ${titulo}\n\nTexto: ${trecho}\n\nExplique em linguagem simples o que essa publicacao significa.` },
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
 * Gera (ou reaproveita do cache) uma explicacao em linguagem simples para um
 * documento. So roda quando o usuario clica manualmente - nunca automatico
 * nem em lote - e o resultado fica salvo por documento (nao por usuario),
 * entao o mesmo documento nunca gera uma segunda chamada paga a IA.
 */
exports.explicarPublicacao = onRequest(
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

    const { id, titulo, trecho } = req.body || {};
    if (!id || !trecho) {
      res.status(400).json({ erro: "Parametros obrigatorios: id, trecho" });
      return;
    }

    try {
      const ref = db.collection("explicacoes_ia").doc(String(id));
      const cache = await ref.get();
      if (cache.exists) {
        res.status(200).json({ sucesso: true, texto: cache.data().texto, deCache: true });
        return;
      }

      const texto = await pedirExplicacaoIA(
        anthropicApiKey.value(),
        String(titulo || "").slice(0, 300),
        String(trecho).slice(0, TAMANHO_MAX_TRECHO)
      );
      await ref.set({ texto, titulo: titulo || "", criadoEm: FieldValue.serverTimestamp() });

      res.status(200).json({ sucesso: true, texto, deCache: false });
    } catch (erro) {
      console.error("Erro no endpoint explicarPublicacao:", erro);
      res.status(500).json({ erro: "Nao foi possivel gerar a explicacao agora. Tente novamente em instantes." });
    }
  }
);
