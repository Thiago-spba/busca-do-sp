import React, { useState } from "react";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { ListaDocumentos } from "./ListaDocumentos";

function formatarData(iso) {
  if (!iso) return "-";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Historico de buscas: um registro simples de tudo que ja foi pesquisado,
 * so pra achar buscas antigas e (via Minhas Listas > Adicionar do historico)
 * decidir quem acompanhar de verdade. Sem botoes de atualizar/ver resultados
 * aqui - isso fica exclusivo de Minhas Listas, pra nao duplicar a mesma acao
 * em dois lugares da tela.
 */
export function HistoricoBuscas({ historico, onExcluir, bloqueado }) {
  const [aberto, setAberto] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState(null);

  const { buscas, carregando, carregandoMais, temMais, carregarMais } = historico;

  const handleConfirmarExclusao = async (entrada) => {
    await onExcluir(entrada);
    setConfirmandoId(null);
  };

  if (!carregando && buscas.length === 0) return null;

  return (
    <div className="tracking-section">
      <button className="tracking-toggle" onClick={() => setAberto(!aberto)}>
        <History size={18} />
        Histórico de Buscas {buscas.length > 0 && `(${buscas.length})`}
        <span style={{ marginLeft: "auto" }}>{aberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
      </button>

      {aberto && (
        <div className="tracking-body">
          {carregando ? (
            <p className="tracking-empty">Carregando histórico...</p>
          ) : (
            buscas.map((entrada) => {
              const totalGeral = (entrada.totalAtual || 0) + (entrada.totalHistorico || 0);
              const confirmando = confirmandoId === entrada.id;

              return (
                <div key={entrada.id} className="tracking-card" style={confirmando ? { borderColor: "#dc2626" } : undefined}>
                  <div className="tracking-card-row">
                    <span className="tracking-name">{entrada.nomePrincipal}</span>
                    <span className="tracking-count">{totalGeral} resultado{totalGeral === 1 ? "" : "s"}</span>
                  </div>
                  <div className="tracking-meta">
                    {formatarData(entrada.fromDate)} – {formatarData(entrada.toDate)}
                    {entrada.filtros?.length > 0 && ` · Filtros: ${entrada.filtros.join(", ")}`}
                    {entrada.listas?.length > 0 && ` · Em: ${entrada.listas.join(", ")}`}
                  </div>

                  <ListaDocumentos
                    itensAtual={entrada.itensAtual}
                    itensHistorico={entrada.itensHistorico}
                    nomePrincipal={entrada.nomePrincipal}
                  />

                  <div style={{ display: "flex", justifyContent: confirmando ? "space-between" : "flex-end", alignItems: "center", gap: "0.6rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                    {confirmando && (
                      <span style={{ color: "var(--text-main)", fontSize: "0.85rem" }}>
                        Excluir esta busca? Essa ação não pode ser desfeita.
                      </span>
                    )}
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      {confirmando && (
                        <button className="tracking-btn-ghost" onClick={() => setConfirmandoId(null)}>
                          Cancelar
                        </button>
                      )}
                      <button
                        className="tracking-btn-ghost"
                        onClick={() => (confirmando ? handleConfirmarExclusao(entrada) : setConfirmandoId(entrada.id))}
                        disabled={bloqueado}
                        style={confirmando ? { color: "#dc2626" } : undefined}
                      >
                        {confirmando ? "Excluir definitivamente" : "Excluir"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {temMais && (
            <button className="tracking-loadmore" onClick={carregarMais} disabled={bloqueado || carregandoMais}>
              {carregandoMais ? "Carregando..." : "Carregar mais antigas"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
