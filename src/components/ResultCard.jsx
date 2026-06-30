import React, { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

function destacarTexto(texto, termos) {
  if (!texto || !termos || termos.length === 0) return texto;
  const escapedTerms = termos.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp("(" + escapedTerms.join("|") + ")", "gi");
  const partes = texto.split(regex);
  return partes.map((parte, i) => {
    const isMatch = escapedTerms.some(t => new RegExp("^" + t + "$", "i").test(parte));
    if (isMatch) {
      return <mark key={i} className="highlight-nome">{parte}</mark>;
    }
    return parte;
  });
}

export function ResultCard({ item, termosBusca = [] }) {
  const [expandido, setExpandido] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const isHistorico = item.fonte === "historico";
  const dataFormatada = item.data ? new Date(item.data).toLocaleDateString("pt-BR") : "Data indisponível";

  const urlBase = item.slug
    ? (item.slug.startsWith("http") ? item.slug : "https://www.doe.sp.gov.br/" + item.slug.replace(/^\//, ""))
    : null;

  const nomePrincipal = termosBusca.length > 0 ? termosBusca[0] : "";
  let linkOriginal = urlBase;
  if (urlBase && nomePrincipal) {
    const nomeEncoded = encodeURIComponent(nomePrincipal);
    linkOriginal = urlBase + "#:~:text=" + nomeEncoded;
  }

  const copiarNome = async () => {
    if (!nomePrincipal) return;
    try {
      await navigator.clipboard.writeText(nomePrincipal);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar nome:", err);
    }
  };

  const trechoCompleto = item.trecho || "Trecho não disponível";
  const trechoCurto = trechoCompleto.length > 200 ? trechoCompleto.substring(0, 200) + "..." : trechoCompleto;

  return (
    <div className="result-card" data-color={item.color || "neutro"}>
      <div className="card-header">
        <span className="card-title">{destacarTexto(item.titulo || "Publicação Oficial", termosBusca)}</span>
        <span className="card-date">{dataFormatada}</span>
      </div>

      {item.hierarquia && (
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem", lineHeight: "1.4", fontStyle: "italic" }}>
          📂 {item.hierarquia}
        </div>
      )}

      <div className="card-excerpt" style={{ whiteSpace: "pre-wrap" }}>
        {expandido ? destacarTexto(trechoCompleto, termosBusca) : destacarTexto(trechoCurto, termosBusca)}
      </div>

      {trechoCompleto.length > 200 && (
        <button onClick={() => setExpandido(!expandido)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0", marginBottom: "0.75rem", fontWeight: "500" }}>
          {expandido ? (<><ChevronUp size={14} /> Recolher</>) : (<><ChevronDown size={14} /> Ver trecho completo</>)}
        </button>
      )}

      {isHistorico && nomePrincipal && (
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", background: "var(--bg-card)", border: "1px dashed var(--border-color)", borderRadius: "8px", padding: "0.5rem 0.7rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
          <span>📄 Este link abre um PDF. O destaque automático não funciona em PDFs — copie o nome e use <strong>Ctrl+F</strong> dentro do arquivo para localizá-lo rápido.</span>
          <button onClick={copiarNome} style={{ background: copiado ? "var(--primary)" : "transparent", color: copiado ? "#fff" : "var(--primary)", border: "1px solid var(--primary)", borderRadius: "6px", padding: "0.25rem 0.6rem", cursor: "pointer", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap" }}>
            {copiado ? (<><Check size={13} /> Copiado!</>) : (<><Copy size={13} /> Copiar nome</>)}
          </button>
        </div>
      )}

      <div className="card-footer">
        <span className={"badge-fonte " + (isHistorico ? "historico" : "")}>
          {isHistorico ? "📜 Arquivo Histórico" : "📄 Diário Oficial Atual"}
        </span>
        {linkOriginal && (<a href={linkOriginal} target="_blank" rel="noopener noreferrer" className="link-original">Conferir no site oficial <ExternalLink size={14} /></a>)}
      </div>
    </div>
  );
}
