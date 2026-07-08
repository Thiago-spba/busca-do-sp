import React, { useState } from "react";
import { History, RefreshCw, ChevronDown, ChevronUp, Trash2, Undo2 } from "lucide-react";

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
 * Formata um timestamp como tempo relativo em portugues (ex: "ha 3 dias",
 * "ha 2 semanas", "ha 5 meses", "ha 1 ano"), para caber num card sem poluir
 * com data/hora completa. A data exata fica disponivel no title (tooltip).
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

const HORAS_LIMITE_LIXEIRA = 24;

/** Quanto tempo falta para a exclusao definitiva de um item na lixeira. */
function formatarTempoRestante(excluidoEm) {
  if (!excluidoEm?.toDate) return "";
  const prazoMs = excluidoEm.toDate().getTime() + HORAS_LIMITE_LIXEIRA * 3_600_000;
  const restanteMs = prazoMs - Date.now();
  if (restanteMs <= 0) return "excluindo definitivamente em instantes...";
  const horas = Math.ceil(restanteMs / 3_600_000);
  return horas <= 1 ? "menos de 1h para exclusão definitiva" : `${horas}h para exclusão definitiva`;
}

export function HistoricoBuscas({ historico, onAtualizar, onExcluir, onRestaurar, atualizandoId, bloqueado }) {
  const [aberto, setAberto] = useState(false);
  const [lixeiraAberta, setLixeiraAberta] = useState(false);
  const [novidades, setNovidades] = useState({});

  const { buscas, lixeira, carregando, carregandoMais, temMais, carregarMais } = historico;

  const handleAtualizar = async (entrada) => {
    const { novosAtual, novosHistorico } = await onAtualizar(entrada);
    setNovidades((prev) => ({ ...prev, [entrada.id]: novosAtual + novosHistorico }));
  };

  if (!carregando && buscas.length === 0 && lixeira.length === 0) return null;

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
        <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {carregando ? (
            <p style={{ color: "var(--text-muted)" }}>Carregando histórico...</p>
          ) : (
            buscas.map((entrada) => {
              const totalGeral = (entrada.totalAtual || 0) + (entrada.totalHistorico || 0);
              const qtdNovos = novidades[entrada.id];
              return (
                <div
                  key={entrada.id}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "0.85rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "600", color: "var(--text-main)" }}>{entrada.nomePrincipal}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {formatarData(entrada.fromDate)} até {formatarData(entrada.toDate)} · {totalGeral} resultado(s)
                      {entrada.filtros?.length > 0 && ` · Filtros: ${entrada.filtros.join(", ")}`}
                    </div>
                    <div
                      style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                      title={formatarCarimbo(entrada.atualizadoEm) || formatarCarimbo(entrada.criadoEm)}
                    >
                      Última verificação: {formatarTempoRelativo(entrada.atualizadoEm) || formatarTempoRelativo(entrada.criadoEm)}
                    </div>
                    {entrada.diagnostico && (
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                        🔎 Banco Atual: {entrada.diagnostico.atual.totalFonte} na fonte → {entrada.diagnostico.atual.totalRecebido} recebidos → {entrada.diagnostico.atual.totalFiltrado} no filtro
                        {" · "}Histórico: {entrada.diagnostico.historico.totalFonte} na fonte → {entrada.diagnostico.historico.totalRecebido} recebidos → {entrada.diagnostico.historico.totalFiltrado} no filtro
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {qtdNovos !== undefined && (
                      qtdNovos > 0 ? (
                        <span className="highlight-nome" style={{ fontSize: "0.8rem" }}>
                          {qtdNovos} novo(s)!
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Sem novidades</span>
                      )
                    )}
                    <button
                      onClick={() => handleAtualizar(entrada)}
                      disabled={bloqueado}
                      title={bloqueado && atualizandoId !== entrada.id ? "Aguarde a operação em andamento terminar" : undefined}
                      style={{
                        background: "transparent",
                        border: "1px solid var(--primary)",
                        color: "var(--primary)",
                        borderRadius: "6px",
                        padding: "0.4rem 0.75rem",
                        cursor: bloqueado ? "default" : "pointer",
                        opacity: bloqueado && atualizandoId !== entrada.id ? 0.5 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontSize: "0.8rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <RefreshCw size={13} className={atualizandoId === entrada.id ? "spin" : ""} />
                      {atualizandoId === entrada.id ? "Verificando..." : "Atualizar"}
                    </button>
                    <button
                      onClick={() => onExcluir(entrada)}
                      disabled={bloqueado}
                      title={bloqueado ? "Aguarde a operação em andamento terminar" : "Mover para a lixeira"}
                      style={{
                        background: "transparent",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-muted)",
                        borderRadius: "6px",
                        padding: "0.4rem 0.55rem",
                        cursor: bloqueado ? "default" : "pointer",
                        opacity: bloqueado ? 0.5 : 1,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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

          {lixeira.length > 0 && (
            <div style={{ marginTop: "0.5rem" }}>
              <button
                onClick={() => setLixeiraAberta(!lixeiraAberta)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  padding: "0.25rem 0",
                }}
              >
                <Trash2 size={14} />
                Lixeira ({lixeira.length})
                {lixeiraAberta ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {lixeiraAberta && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {lixeira.map((entrada) => (
                    <div
                      key={entrada.id}
                      style={{
                        background: "var(--bg-card)",
                        border: "1px dashed var(--border-color)",
                        borderRadius: "8px",
                        padding: "0.7rem 1rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "1rem",
                        flexWrap: "wrap",
                        opacity: 0.8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "600", color: "var(--text-main)" }}>{entrada.nomePrincipal}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {formatarTempoRestante(entrada.excluidoEm)}
                        </div>
                      </div>
                      <button
                        onClick={() => onRestaurar(entrada)}
                        disabled={bloqueado}
                        title={bloqueado ? "Aguarde a operação em andamento terminar" : undefined}
                        style={{
                          background: "transparent",
                          border: "1px solid var(--primary)",
                          color: "var(--primary)",
                          borderRadius: "6px",
                          padding: "0.4rem 0.75rem",
                          cursor: bloqueado ? "default" : "pointer",
                          opacity: bloqueado ? 0.5 : 1,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          fontSize: "0.8rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Undo2 size={13} />
                        Desfazer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
