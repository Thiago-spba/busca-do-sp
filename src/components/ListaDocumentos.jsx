import React, { useState } from "react";
import { FileText, ChevronDown, ChevronUp, ExternalLink, Copy, Check } from "lucide-react";
import { formatarDataDocumento, montarLinkOficial } from "../utils/linkOficial";

/**
 * Lista compacta e expansivel dos documentos encontrados para uma pessoa,
 * guardados no Historico/Minhas Listas (resumo leve: titulo, data, slug).
 * Usada tanto no card do Historico quanto no card de cada lista de favoritos,
 * para nao precisar rolar ate a grade de resultados so pra abrir o documento.
 */
export function ListaDocumentos({ itensAtual = [], itensHistorico = [], nomePrincipal }) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const total = itensAtual.length + itensHistorico.length;
  if (total === 0) return null;

  const documentos = [
    ...itensAtual.map((item) => ({ ...item, fonte: "atual" })),
    ...itensHistorico.map((item) => ({ ...item, fonte: "historico" })),
  ];

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

  return (
    <div style={{ marginTop: "0.5rem" }}>
      <button
        onClick={() => setAberto(!aberto)}
        style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", padding: 0 }}
      >
        <FileText size={12} /> Ver documentos ({total})
        {aberto ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {aberto && (
        <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.3rem", maxHeight: "220px", overflowY: "auto" }}>
          {documentos.map((item) => {
            const link = montarLinkOficial(item, nomePrincipal);
            const isHistorico = item.fonte === "historico";
            return (
              <a
                key={item.id}
                href={link || undefined}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.35rem",
                  fontSize: "0.72rem",
                  color: "var(--text-main)",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  padding: "0.4rem 0.55rem",
                  textDecoration: "none",
                  pointerEvents: link ? "auto" : "none",
                  opacity: link ? 1 : 0.5,
                }}
              >
                <ExternalLink size={11} style={{ marginTop: "0.15rem", flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  {(item.titulo || "Publicação Oficial").slice(0, 70)}
                  {item.titulo?.length > 70 ? "..." : ""}
                  <span style={{ color: "var(--text-muted)" }}> — {formatarDataDocumento(item)}</span>
                  {isHistorico && <span style={{ color: "var(--text-muted)" }}> (PDF)</span>}
                </span>
              </a>
            );
          })}

          {itensHistorico.length > 0 && (
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", flexWrap: "wrap" }}>
              <span>📄 Documentos do Arquivo Histórico abrem PDF — o destaque não funciona neles, use Ctrl+F com o nome copiado.</span>
              <button
                onClick={copiarNome}
                style={{ background: copiado ? "var(--primary)" : "none", color: copiado ? "#fff" : "var(--primary)", border: "1px solid var(--primary)", borderRadius: "6px", padding: "0.2rem 0.5rem", cursor: "pointer", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "0.25rem", whiteSpace: "nowrap" }}
              >
                {copiado ? <><Check size={11} /> Copiado!</> : <><Copy size={11} /> Copiar nome</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
