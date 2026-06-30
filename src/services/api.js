const BASE_URL = "http://127.0.0.1:5002/busca-do-sp/southamerica-east1";

export async function buscarAtualAPI(termoPrincipal, fromDate, toDate) {
  try {
    const params = new URLSearchParams({
      termos: termoPrincipal, // Envia apenas o nome para evitar que a API traga lixo
      fromDate,
      toDate,
    });
    const res = await fetch(`${BASE_URL}/buscaAtual?${params}`);
    if (!res.ok) throw new Error("Falha na comunicação com o servidor.");
    return await res.json();
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
    const res = await fetch(`${BASE_URL}/buscaHistorica?${params}`);
    if (!res.ok) throw new Error("Falha na comunicação com o servidor.");
    return await res.json();
  } catch (err) {
    console.error(err);
    return { sucesso: false, fonte: "historico", itens: [], erro: "Não foi possível conectar ao banco Histórico." };
  }
}
