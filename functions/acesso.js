const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("./firebaseAdmin");

// Usado so se ninguem tiver configurado um limite ainda (config/acesso nao existe).
const LIMITE_PADRAO = 20;

function docConfigAcesso() {
  return db.collection("config").doc("acesso");
}

/**
 * Verifica se o usuario logado (via Google) tem permissao de acesso.
 * Logica de "vagas limitadas" (limite configuravel pelo admin, ver admin.js):
 * - Se o UID ja esta cadastrado e bloqueado -> recusa
 * - Se o UID ja esta cadastrado e nao bloqueado -> libera
 * - Se nao esta cadastrado e ha vaga -> cadastra e libera
 * - Se nao esta cadastrado e nao ha vaga -> bloqueia
 */
exports.verificarAcesso = onCall({ region: "southamerica-east1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email || "sem-email";

  const docRef = db.collection("usuarios_autorizados").doc(uid);

  return db.runTransaction(async (transacao) => {
    const doc = await transacao.get(docRef);

    if (doc.exists) {
      if (doc.data().bloqueado) {
        return { autorizado: false, motivo: "bloqueado" };
      }
      // Usuario ja cadastrado, libera o acesso
      return { autorizado: true, motivo: "ja_cadastrado" };
    }

    // Usuario novo: verifica quantas vagas ja foram ocupadas
    const configSnap = await transacao.get(docConfigAcesso());
    const limite = configSnap.exists && configSnap.data().limite ? configSnap.data().limite : LIMITE_PADRAO;

    const todosUsuarios = await transacao.get(db.collection("usuarios_autorizados"));
    const totalCadastrados = todosUsuarios.size;

    if (totalCadastrados >= limite) {
      return { autorizado: false, motivo: "limite_atingido", totalCadastrados, limite };
    }

    // Ha vaga: cadastra o novo usuario
    transacao.set(docRef, {
      email,
      bloqueado: false,
      criadoEm: FieldValue.serverTimestamp(),
    });

    return { autorizado: true, motivo: "cadastrado_agora" };
  });
});
