const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("./firebaseAdmin");

const LIMITE_USUARIOS = 5;

/**
 * Verifica se o usuario logado (via Google) tem permissao de acesso.
 * Logica de "vagas limitadas":
 * - Se o UID ja esta cadastrado em usuarios_autorizados -> libera
 * - Se nao esta cadastrado e ha vaga (menos de 5 cadastrados) -> cadastra e libera
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
      // Usuario ja cadastrado, libera o acesso
      return { autorizado: true, motivo: "ja_cadastrado" };
    }

    // Usuario novo: verifica quantas vagas ja foram ocupadas
    const todosUsuarios = await transacao.get(db.collection("usuarios_autorizados"));
    const totalCadastrados = todosUsuarios.size;

    if (totalCadastrados >= LIMITE_USUARIOS) {
      return { autorizado: false, motivo: "limite_atingido", totalCadastrados, limite: LIMITE_USUARIOS };
    }

    // Ha vaga: cadastra o novo usuario
    transacao.set(docRef, {
      email,
      criadoEm: FieldValue.serverTimestamp(),
    });

    return { autorizado: true, motivo: "cadastrado_agora" };
  });
});
