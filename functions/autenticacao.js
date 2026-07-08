const { authAdmin, db } = require("./firebaseAdmin");

/**
 * Exige que a requisicao venha de um usuario autenticado (token valido do
 * Firebase Auth, enviado no header "Authorization: Bearer <token>") E que
 * esse usuario conste em usuarios_autorizados (mesma lista dos 5 aprovados
 * usada em acesso.js) - sem essa segunda checagem, qualquer conta Google
 * poderia chamar as functions de busca diretamente, ignorando o limite.
 *
 * Lanca um erro com `status` (401/403) em caso de falha; retorna o uid em caso de sucesso.
 */
async function exigirUsuarioAutorizado(req) {
  const cabecalho = req.headers.authorization || "";
  const [, token] = cabecalho.match(/^Bearer (.+)$/) || [];

  if (!token) {
    const erro = new Error("Token de autenticacao ausente.");
    erro.status = 401;
    throw erro;
  }

  let decodificado;
  try {
    decodificado = await authAdmin.verifyIdToken(token);
  } catch {
    const erro = new Error("Token invalido ou expirado.");
    erro.status = 401;
    throw erro;
  }

  const doc = await db.collection("usuarios_autorizados").doc(decodificado.uid).get();
  if (!doc.exists) {
    const erro = new Error("Usuario nao autorizado a usar esta funcionalidade.");
    erro.status = 403;
    throw erro;
  }

  return decodificado.uid;
}

module.exports = { exigirUsuarioAutorizado };
