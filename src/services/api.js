import { auth } from "../firebase/config";

const BASE_URL = "https://southamerica-east1-busca-do-sp.cloudfunctions.net";

async function cabecalhosAutenticados() {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function tratarResposta(res, fonte) {
  const dados = await res.json().catch(() => null);
  if (!res.ok) {
    return { sucesso: false, fonte, itens: [], erro: dados?.erro || "Falha na comunicação com o servidor." };
  }
  return dados;
}

export async function buscarAtualAPI(termoPrincipal, fromDate, toDate) {
  try {
    const params = new URLSearchParams({
      termos: termoPrincipal,
      fromDate,
      toDate,
    });
    const headers = await cabecalhosAutenticados();
    const res = await fetch(`${BASE_URL}/buscaAtual?${params}`, { headers });
    return await tratarResposta(res, "atual");
  } catch (err) {
    console.error(err);
    return { sucesso: false, fonte: "atual", itens: [], erro: "Não foi possível conectar ao banco de dados Atual." };
  }
}

export async function buscarHistoricoAPI(termoPrincipal, fromDate, toDate) {
  try {
    const params = new URLSearchParams({
      termo: termoPrincipal,
      fromDate,
      toDate,
    });
    const headers = await cabecalhosAutenticados();
    const res = await fetch(`${BASE_URL}/buscaHistorica?${params}`, { headers });
    return await tratarResposta(res, "historico");
  } catch (err) {
    console.error(err);
    return { sucesso: false, fonte: "historico", itens: [], erro: "Não foi possível conectar ao banco Histórico." };
  }
}
