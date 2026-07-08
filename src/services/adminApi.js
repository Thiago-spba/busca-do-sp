import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";

export async function listarUsuariosAPI() {
  const fn = httpsCallable(functions, "listarUsuarios");
  const resultado = await fn();
  return resultado.data.usuarios;
}

export async function bloquearUsuarioAPI(uid) {
  const fn = httpsCallable(functions, "bloquearUsuario");
  await fn({ uid });
}

export async function desbloquearUsuarioAPI(uid) {
  const fn = httpsCallable(functions, "desbloquearUsuario");
  await fn({ uid });
}

export async function listarHistoricoUsuarioAPI(uid) {
  const fn = httpsCallable(functions, "listarHistoricoUsuario");
  const resultado = await fn({ uid });
  return resultado.data.buscas;
}

export async function obterConfigAcessoAPI() {
  const fn = httpsCallable(functions, "obterConfigAcesso");
  const resultado = await fn();
  return resultado.data.limite;
}

export async function atualizarLimiteUsuariosAPI(limite) {
  const fn = httpsCallable(functions, "atualizarLimiteUsuarios");
  await fn({ limite });
}
