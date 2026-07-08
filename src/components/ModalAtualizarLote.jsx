import React, { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";

export function ModalAtualizarLote({ buscas, onAtualizarLote, progressoLote, bloqueado, onFechar }) {
  const [selecionados, setSelecionados] = useState(new Set());
  const [resultados, setResultados] = useState({}); // { [id]: {novosAtual, novosHistorico} }
  const [expandidoId, setExpandidoId] = useState(null);
  const [resumo, setResumo] = useState(null);

  const rodando = progressoLote !== null;

  const alternarSelecionado = (id) => {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const marcarTodos = () => setSelecionados(new Set(buscas.map((b) => b.id)));
  const desmarcarTodos = () => setSelecionados(new Set());

  const handleAtualizar = async () => {
    const entradas = buscas.filter((b) => selecionados.has(b.id));
    setResumo(null);
    setResultados({});
    const resultadosLote = await onAtualizarLote(entradas);
    const mapa = {};
    resultadosLote.forEach((r) => { mapa[r.id] = { novosAtual: r.novosAtual, novosHistorico: r.novosHistorico }; });
    setResultados(mapa);
    setResumo({
      total: resultadosLote.length,
      comNovidades: resultadosLote.filter((r) => r.novosAtual + r.novosHistorico > 0).length,
    });
    setSelecionados(new Set());
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ fontWeight: "600", color: "var(--text-main)" }}>Atualizar buscas em lote</div>
          <button
            onClick={onFechar}
            disabled={rodando}
            title={rodando ? "Aguarde o lote terminar" : "Fechar"}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: rodando ? "default" : "pointer", opacity: rodando ? 0.4 : 1, display: "flex" }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "1rem 1.25rem", overflowY: "auto", flex: 1 }}>
          {progressoLote && (
            <div style={{ marginBottom: "0.85rem" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>
                Atualizando {progressoLote.atual} de {progressoLote.total}: <strong>{progressoLote.nomeAtual}</strong>...
              </div>
              <div style={{ background: "var(--border-color)", borderRadius: "4px", height: "6px", overflow: "hidden", marginTop: "0.5rem" }}>
                <div
                  style={{
                    background: "var(--primary)",
                    height: "100%",
                    width: `${(progressoLote.atual / progressoLote.total) * 100}%`,
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>
          )}

          {resumo && !rodando && (
            <div style={{ marginBottom: "0.85rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
              ✅ {resumo.total} busca(s) verificada(s)
              {resumo.comNovidades > 0 ? `, ${resumo.comNovidades} com novidades!` : ", sem novidades."}
            </div>
          )}

          {!rodando && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginBottom: "0.6rem" }}>
              <button onClick={marcarTodos} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.75rem", cursor: "pointer" }}>
                Marcar todos
              </button>
              <button onClick={desmarcarTodos} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.75rem", cursor: "pointer" }}>
                Desmarcar todos
              </button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {buscas.map((entrada) => {
              const resultado = resultados[entrada.id];
              const totalNovos = resultado ? resultado.novosAtual + resultado.novosHistorico : undefined;
              const expandido = expandidoId === entrada.id;

              return (
                <div
                  key={entrada.id}
                  style={{
                    background: "var(--bg-app)",
                    border: `1px solid ${selecionados.has(entrada.id) ? "var(--primary)" : "var(--border-color)"}`,
                    borderRadius: "8px",
                    padding: "0.6rem 0.85rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <input
                      type="checkbox"
                      checked={selecionados.has(entrada.id)}
                      onChange={() => alternarSelecionado(entrada.id)}
                      disabled={rodando}
                      style={{ width: "16px", height: "16px", cursor: rodando ? "default" : "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "600", color: "var(--text-main)", fontSize: "0.88rem" }}>{entrada.nomePrincipal}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                        {(entrada.totalAtual || 0) + (entrada.totalHistorico || 0)} resultado(s)
                      </div>
                    </div>
                    {totalNovos !== undefined && (
                      totalNovos > 0 ? (
                        <button
                          onClick={() => setExpandidoId(expandido ? null : entrada.id)}
                          style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <span className="highlight-nome">{totalNovos} novo(s)!</span>
                          {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>sem novidades</span>
                      )
                    )}
                  </div>
                  {expandido && resultado && (
                    <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {resultado.novosAtual} novo(s) no Banco Atual · {resultado.novosHistorico} novo(s) no Arquivo Histórico
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "center" }}>
          <button
            onClick={handleAtualizar}
            disabled={bloqueado || selecionados.size === 0}
            style={{
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "0.6rem 1.2rem",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: bloqueado || selecionados.size === 0 ? "default" : "pointer",
              opacity: bloqueado || selecionados.size === 0 ? 0.5 : 1,
            }}
          >
            Atualizar selecionados ({selecionados.size})
          </button>
        </div>
      </div>
    </div>
  );
}
