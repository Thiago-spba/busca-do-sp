const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("./firebaseAdmin");

// Unico e-mail com acesso ao painel de administrador. Fixo no servidor de
// proposito - nao existe nenhum jeito de "virar admin" a partir do app ou
// do navegador, so editando este arquivo e fazendo um novo deploy.
const ADMIN_EMAIL = "thiago.rpba@gmail.com";

function docConfigAcesso() {
  return db.collection("config").doc("acesso");
}

function exigirAdmin(request) {
  if (!request.auth || request.auth.token.email !== ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "Acesso restrito ao administrador.");
  }
}

/** Lista todos os usuarios cadastrados (autorizados a usar o app). */
exports.listarUsuarios = onCall({ region: "southamerica-east1" }, async (request) => {
  exigirAdmin(request);

  const snap = await db.collection("usuarios_autorizados").get();
  const usuarios = snap.docs.map((doc) => ({
    uid: doc.id,
    email: doc.data().email || "sem-email",
    bloqueado: Boolean(doc.data().bloqueado),
    criadoEm: doc.data().criadoEm ? doc.data().criadoEm.toDate().toISOString() : null,
  }));
  usuarios.sort((a, b) => (a.criadoEm || "").localeCompare(b.criadoEm || ""));

  return { usuarios };
});

/** Bloqueia um usuario: ele para de conseguir logar, buscar ou usar a IA. */
exports.bloquearUsuario = onCall({ region: "southamerica-east1" }, async (request) => {
  exigirAdmin(request);

  const { uid } = request.data || {};
  if (!uid) throw new HttpsError("invalid-argument", "Parametro obrigatorio: uid");
  if (uid === request.auth.uid) throw new HttpsError("failed-precondition", "Voce nao pode bloquear a si mesmo.");

  await db.collection("usuarios_autorizados").doc(uid).update({ bloqueado: true });
  return { sucesso: true };
});

/** Desbloqueia um usuario previamente bloqueado. */
exports.desbloquearUsuario = onCall({ region: "southamerica-east1" }, async (request) => {
  exigirAdmin(request);

  const { uid } = request.data || {};
  if (!uid) throw new HttpsError("invalid-argument", "Parametro obrigatorio: uid");

  await db.collection("usuarios_autorizados").doc(uid).update({ bloqueado: false });
  return { sucesso: true };
});

/** Historico de buscas de um usuario especifico (visao do admin). */
exports.listarHistoricoUsuario = onCall({ region: "southamerica-east1" }, async (request) => {
  exigirAdmin(request);

  const { uid } = request.data || {};
  if (!uid) throw new HttpsError("invalid-argument", "Parametro obrigatorio: uid");

  const snap = await db
    .collection("usuarios_autorizados")
    .doc(uid)
    .collection("buscas")
    .orderBy("criadoEm", "desc")
    .limit(200)
    .get();

  const buscas = snap.docs.map((doc) => {
    const dado = doc.data();
    return {
      id: doc.id,
      nomePrincipal: dado.nomePrincipal || "",
      filtros: dado.filtros || [],
      fromDate: dado.fromDate || null,
      toDate: dado.toDate || null,
      totalAtual: dado.totalAtual || 0,
      totalHistorico: dado.totalHistorico || 0,
      criadoEm: dado.criadoEm ? dado.criadoEm.toDate().toISOString() : null,
    };
  });

  return { buscas };
});

/** Le a configuracao atual de acesso (limite de usuarios). */
exports.obterConfigAcesso = onCall({ region: "southamerica-east1" }, async (request) => {
  exigirAdmin(request);

  const snap = await docConfigAcesso().get();
  const limite = snap.exists && snap.data().limite ? snap.data().limite : 20;
  return { limite };
});

/** Atualiza o limite maximo de usuarios cadastrados. */
exports.atualizarLimiteUsuarios = onCall({ region: "southamerica-east1" }, async (request) => {
  exigirAdmin(request);

  const { limite } = request.data || {};
  const limiteNumero = Number(limite);
  if (!Number.isInteger(limiteNumero) || limiteNumero < 1) {
    throw new HttpsError("invalid-argument", "O limite deve ser um numero inteiro maior que zero.");
  }

  await docConfigAcesso().set({ limite: limiteNumero }, { merge: true });
  return { sucesso: true, limite: limiteNumero };
});
