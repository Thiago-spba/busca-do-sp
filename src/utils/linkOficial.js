// Logica compartilhada para montar o link do documento oficial e sua data,
// usada tanto nos resultados de uma busca (ResultCard) quanto nos links salvos
// no Historico/Minhas Listas (que guardam so um resumo leve do documento).

/**
 * Formata a data de um item. Se nao houver campo `data`, tenta extrair do
 * titulo (Arquivo Historico costuma comecar com "DD/MM/AAAA - Suplemento - ...").
 */
export function formatarDataDocumento(item) {
  if (item.data) return new Date(item.data).toLocaleDateString("pt-BR");
  const match = (item.titulo || "").match(/^(\d{2}\/\d{2}\/\d{4})/);
  return match ? match[1] : "Data indisponível";
}

/**
 * Monta a URL do documento oficial. Quando ha um nome principal, adiciona a
 * ancora "#:~:text=" que faz o navegador rolar e destacar o nome ao abrir
 * (so funciona no Banco Atual, que abre HTML - o Arquivo Historico abre PDF,
 * onde o navegador nao consegue aplicar esse destaque).
 */
export function montarLinkOficial(item, nomePrincipal) {
  if (!item?.slug) return null;
  const urlBase = item.slug.startsWith("http") ? item.slug : "https://www.doe.sp.gov.br/" + item.slug.replace(/^\//, "");
  if (!nomePrincipal) return urlBase;
  return urlBase + "#:~:text=" + encodeURIComponent(nomePrincipal);
}
