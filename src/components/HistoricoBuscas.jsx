import React, { useState } from "react";
import { History, RefreshCw, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { ListaDocumentos } from "./ListaDocumentos";

function formatarData(iso) {
  if (!iso) return "-";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarCarimbo(timestamp) {
  if (!timestamp?.toDate) return "";
  return timestamp.toDate().toLocaleString("pt-BR");
}

/**
 * Formata um timestamp como tempo relativo em portugues (ex: "ha 3 dias").
 * A data exata fica disponivel no title (tooltip).
 */
function formatarTempoRelativo(timestamp) {
  if (!timestamp?.toDate) return "";
  const diffMs = Date.now() - timestamp.toDate().getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `há ${diffHoras} h`;
  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias < 7) return diffDias === 1 ? "há 1 dia" : `há ${diffDias} dias`;
  const diffSemanas = Math.floor(diffDias / 7);
  if (diffSemanas < 5) return diffSemanas === 1 ? "há 1 semana" : `há ${diffSemanas} semanas`;
  const diffMeses = Math.floor(diffDias / 30);
  if (diffMeses < 12) return diffMeses === 1 ? "há 1 mês" : `há ${diffMeses} meses`;
  const diffAnos = Math.floor(diffDias / 365);
  return diffAnos === 1 ? "há 1 ano" : `há ${diffAnos} anos`;
}

export function HistoricoBuscas({ historico, onAtualizar, onExcluir, onVerResultados, atualizandoId, bloqueado }) {
  const [aberto, setAberto] = useState(false);
  const [novidades, setNovidades] = useState({}); // { [id]: {novosAtual, novosHistorico} }
  const [expandidoId, setExpandidoId] = useState(null);
  const [confirmandoId, setConfirmandoId] = useState(null);

  const { buscas, carregando, carregandoMais, temMais, carregarMais } = historico;

  const handleAtualizar = async (entrada) => {
    const { novosAtual, novosHistorico } = await onAtualizar(entrada);
    setNovidades((prev) => ({ ...prev, [entrada.id]: { novosAtual, novosHistorico } }));
  };

  // Busca novamente (para trazer os documentos com o destaque atualizado) e
  // rola a pagina ate a grade de resultados, ja com o nome desta pessoa em foco.
  const handleVerResultados = async (entrada) => {
    const { novosAtual, novosHistorico } = await onAtualizar(entrada);
    setNovidades((prev) => ({ ...prev, [entrada.id]: { novosAtual, novosHistorico } }));
    onVerResultados();
  };

  const handleConfirmarExclusao = async (entrada) => {
    await onExcluir(entrada);
    setConfirmandoId(null);
  };

  if (!carregando && buscas.length === 0) return null;

  return (
    <div className="historico-buscas" style={{ marginTop: "2rem" }}>
      <button
        onClick={() => setAberto(!aberto)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "0.75rem 1rem",
          width: "100%",
          cursor: "pointer",
          color: "var(--text-main)",
          fontWeight: "600",
        }}
      >
        <History size={18} />
        Histórico de Buscas {buscas.length > 0 && `(${buscas.length})`}
        <span style={{ marginLeft: "auto" }}>{aberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
      </button>

      {aberto && (
        <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {carregando ? (
            <p style={{ color: "var(--text-muted)" }}>Carregando histórico...</p>
          ) : (
            buscas.map((entrada) => {
              const totalGeral = (entrada.totalAtual || 0) + (entrada.totalHistorico || 0);
              const novidade = novidades[entrada.id];
              const totalNovos = novidade ? novidade.novosAtual + novidade.novosHistorico : undefined;
              const expandido = expandidoId === entrada.id;
              const confirmando = confirmandoId === entrada.id;

              return (
                <div
                  key={entrada.id}
                  style={{
                    background: "var(--bg-card)",
                    border: confirmando ? "1px solid #dc2626" : "1px solid var(--border-color)",
                    borderRadius: "10px",
                    padding: "1rem 1.1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                    <div>
                      <div style={{ fontWeight: "600", color: "var(--text-main)", fontSize: "0.95rem" }}>
                        {entrada.nomePrincipal}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.15rem" }}>
                        {formatarData(entrada.fromDate)} – {formatarData(entrada.toDate)}
                        {entrada.filtros?.length > 0 && ` · Filtros: ${entrada.filtros.join(", ")}`}
                        {entrada.listas?.length > 0 && ` · Em: ${entrada.listas.join(", ")}`}
                      </div>
                      {entrada.diagnostico && (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: "0.3rem" }}>
                          Banco Atual: {entrada.diagnostico.atual.totalFonte} na fonte → {entrada.diagnostico.atual.totalFiltrado} no filtro
                          {" · "}Histórico: {entrada.diagnostico.historico.totalFonte} na fonte → {entrada.diagnostico.historico.totalFiltrado} no filtro
                        </div>
                      )}
                      <ListaDocumentos
                        itensAtual={entrada.itensAtual}
                        itensHistorico={entrada.itensHistorico}
                        nomePrincipal={entrada.nomePrincipal}
                      />
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: "600", color: "var(--primary)", fontSize: "1.15rem", lineHeight: 1 }}>
                        {totalGeral}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "0.2rem" }}>
                        resultado{totalGeral === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "0.75rem",
                      paddingTop: "0.65rem",
                      borderTop: "1px solid var(--border-color)",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    {confirmando ? (
                      <>
                        <span style={{ color: "var(--text-main)", fontSize: "0.8rem" }}>
                          Excluir esta busca? Essa ação não pode ser desfeita.
                        </span>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => setConfirmandoId(null)}
                            style={{
                              background: "none",
                              border: "1px solid var(--border-color)",
                              borderRadius: "6px",
                              padding: "0.35rem 0.7rem",
                              color: "var(--text-main)",
                              fontSize: "0.78rem",
                              cursor: "pointer",
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleConfirmarExclusao(entrada)}
                            style={{
                              background: "#dc2626",
                              border: "none",
                              borderRadius: "6px",
                              padding: "0.35rem 0.7rem",
                              color: "#fff",
                              fontSize: "0.78rem",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Excluir definitivamente
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span
                          style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.3rem" }}
                          title={formatarCarimbo(entrada.atualizadoEm) || formatarCarimbo(entrada.criadoEm)}
                        >
                          <span>
                            Verificado {formatarTempoRelativo(entrada.atualizadoEm) || formatarTempoRelativo(entrada.criadoEm)}
                          </span>
                          {totalNovos !== undefined && (
                            totalNovos > 0 ? (
                              <button
                                onClick={() => setExpandidoId(expandido ? null : entrada.id)}
                                style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.75rem" }}
                              >
                                <span className="highlight-nome">{totalNovos} novo(s)!</span>
                                {expandido ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            ) : (
                              <span>· sem novidades</span>
                            )
                          )}
                        </span>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => handleAtualizar(entrada)}
                            disabled={bloqueado}
                            title={bloqueado && atualizandoId !== entrada.id ? "Aguarde a operação em andamento terminar" : undefined}
                            style={{
                              background: "none",
                              border: "1px solid var(--primary)",
                              borderRadius: "6px",
                              padding: "0.35rem 0.7rem",
                              color: "var(--primary)",
                              fontSize: "0.78rem",
                              cursor: bloqueado ? "default" : "pointer",
                              opacity: bloqueado && atualizandoId !== entrada.id ? 0.5 : 1,
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                            }}
                          >
                            <RefreshCw size={12} className={atualizandoId === entrada.id ? "spin" : ""} />
                            {atualizandoId === entrada.id ? "Verificando..." : "Atualizar"}
                          </button>
                          <button
                            onClick={() => handleVerResultados(entrada)}
                            disabled={bloqueado}
                            title={bloqueado ? "Aguarde a operação em andamento terminar" : "Ver os documentos desta pessoa, com o nome destacado"}
                            style={{
                              background: "none",
                              border: "1px solid var(--border-color)",
                              borderRadius: "6px",
                              padding: "0.35rem 0.7rem",
                              color: "var(--text-main)",
                              fontSize: "0.78rem",
                              cursor: bloqueado ? "default" : "pointer",
                              opacity: bloqueado ? 0.5 : 1,
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                            }}
                          >
                            <Eye size={12} />
                            Ver resultados
                          </button>
                          <button
                            onClick={() => setConfirmandoId(entrada.id)}
                            disabled={bloqueado}
                            title={bloqueado ? "Aguarde a operação em andamento terminar" : undefined}
                            style={{
                              background: "none",
                              border: "1px solid var(--border-color)",
                              borderRadius: "6px",
                              padding: "0.35rem 0.7rem",
                              color: "var(--text-muted)",
                              fontSize: "0.78rem",
                              cursor: bloqueado ? "default" : "pointer",
                              opacity: bloqueado ? 0.5 : 1,
                            }}
                          >
                            Excluir
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {expandido && novidade && (
                    <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      {novidade.novosAtual} novo(s) no Banco Atual · {novidade.novosHistorico} novo(s) no Arquivo Histórico
                    </div>
                  )}
                </div>
              );
            })
          )}

          {temMais && (
            <button
              onClick={carregarMais}
              disabled={bloqueado || carregandoMais}
              style={{
                background: "none",
                border: "1px dashed var(--border-color)",
                borderRadius: "8px",
                color: "var(--text-muted)",
                cursor: bloqueado || carregandoMais ? "default" : "pointer",
                fontSize: "0.85rem",
                padding: "0.6rem",
                textAlign: "center",
              }}
            >
              {carregandoMais ? "Carregando..." : "Carregar mais antigas"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
