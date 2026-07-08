import React, { useState } from "react";
import { Star, FolderKanban, ChevronDown, ChevronUp, RefreshCw, Trash2, X, Plus, UserPlus, Eye } from "lucide-react";
import { ListaDocumentos } from "./ListaDocumentos";

function SecaoLista({ nome, ehPadrao, membros, buscas, onAtualizar, onAtualizarLote, onDefinirMembro, onExcluirLista, onVerResultados, atualizandoId, progressoLote, bloqueado }) {
  const [aberto, setAberto] = useState(false);
  const [pickerAberto, setPickerAberto] = useState(false);
  const [novidades, setNovidades] = useState({});
  const [expandidoId, setExpandidoId] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const idsMembros = new Set(membros.map((m) => m.id));

  const handleAtualizarTodos = async () => {
    setResumo(null);
    const resultados = await onAtualizarLote(membros);
    const mapa = {};
    resultados.forEach((r) => { mapa[r.id] = { novosAtual: r.novosAtual, novosHistorico: r.novosHistorico }; });
    setNovidades((prev) => ({ ...prev, ...mapa }));
    setResumo({
      total: resultados.length,
      comNovidades: resultados.filter((r) => r.novosAtual + r.novosHistorico > 0).length,
    });
  };

  // Busca novamente essa pessoa (traz os documentos com o destaque atualizado)
  // e rola a pagina ate a grade de resultados.
  const handleVerResultados = async (entrada) => {
    const { novosAtual, novosHistorico } = await onAtualizar(entrada);
    setNovidades((prev) => ({ ...prev, [entrada.id]: { novosAtual, novosHistorico } }));
    onVerResultados();
  };

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "10px", overflow: "hidden" }}>
      <button
        onClick={() => setAberto(!aberto)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "none",
          border: "none",
          padding: "0.75rem 1rem",
          width: "100%",
          cursor: "pointer",
          color: "var(--text-main)",
          fontWeight: "600",
          fontSize: "0.9rem",
        }}
      >
        {ehPadrao ? <Star size={16} fill="#f59e0b" color="#f59e0b" /> : <FolderKanban size={16} />}
        {nome} ({membros.length})
        <span style={{ marginLeft: "auto" }}>{aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>

      {aberto && (
        <div style={{ padding: "0 1rem 1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                onClick={() => setPickerAberto(!pickerAberto)}
                disabled={bloqueado}
                style={{
                  background: pickerAberto ? "var(--chip-orange)" : "none",
                  color: pickerAberto ? "var(--chip-orange-text)" : "var(--text-main)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  padding: "0.4rem 0.75rem",
                  fontSize: "0.78rem",
                  cursor: bloqueado ? "default" : "pointer",
                  opacity: bloqueado ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <UserPlus size={13} /> Adicionar do histórico
              </button>
              {membros.length > 0 && (
                <button
                  onClick={handleAtualizarTodos}
                  disabled={bloqueado}
                  style={{
                    background: "var(--primary)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.78rem",
                    fontWeight: "600",
                    cursor: bloqueado ? "default" : "pointer",
                    opacity: bloqueado ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <RefreshCw size={13} className={progressoLote ? "spin" : ""} />
                  Atualizar todos ({membros.length})
                </button>
              )}
            </div>

            {!ehPadrao && (
              confirmandoExclusao ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-main)" }}>Excluir esta lista?</span>
                  <button
                    onClick={() => setConfirmandoExclusao(false)}
                    style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "0.3rem 0.6rem", fontSize: "0.75rem", color: "var(--text-main)", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => { onExcluirLista(nome); setConfirmandoExclusao(false); }}
                    style={{ background: "#dc2626", border: "none", borderRadius: "6px", padding: "0.3rem 0.6rem", fontSize: "0.75rem", color: "#fff", cursor: "pointer" }}
                  >
                    Excluir
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmandoExclusao(true)}
                  disabled={bloqueado}
                  style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "0.35rem 0.6rem", fontSize: "0.75rem", color: "var(--text-muted)", cursor: bloqueado ? "default" : "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
                >
                  <Trash2 size={12} /> Excluir lista
                </button>
              )
            )}
          </div>

          {/* Picker: escolher quem incluir do historico */}
          {pickerAberto && (
            <div style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "0.6rem", maxHeight: "220px", overflowY: "auto" }}>
              {buscas.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", margin: 0 }}>Nenhuma busca no histórico ainda.</p>
              ) : (
                buscas.map((b) => (
                  <label key={b.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0.25rem", cursor: bloqueado ? "default" : "pointer", fontSize: "0.82rem", color: "var(--text-main)" }}>
                    <input
                      type="checkbox"
                      checked={idsMembros.has(b.id)}
                      disabled={bloqueado}
                      onChange={(e) => onDefinirMembro(b.id, nome, e.target.checked)}
                      style={{ width: "15px", height: "15px", cursor: bloqueado ? "default" : "pointer" }}
                    />
                    {b.nomePrincipal}
                  </label>
                ))
              )}
            </div>
          )}

          {progressoLote && (
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-main)" }}>
                Atualizando {progressoLote.atual} de {progressoLote.total}: <strong>{progressoLote.nomeAtual}</strong>...
              </div>
              <div style={{ background: "var(--border-color)", borderRadius: "4px", height: "6px", overflow: "hidden", marginTop: "0.4rem" }}>
                <div style={{ background: "var(--primary)", height: "100%", width: `${(progressoLote.atual / progressoLote.total) * 100}%`, transition: "width 0.3s" }} />
              </div>
            </div>
          )}

          {resumo && !progressoLote && (
            <div style={{ fontSize: "0.8rem", color: "var(--text-main)" }}>
              ✅ {resumo.total} verificada(s){resumo.comNovidades > 0 ? `, ${resumo.comNovidades} com novidades!` : ", sem novidades."}
            </div>
          )}

          {membros.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>
              Nenhuma pessoa nesta lista. Use "Adicionar do histórico" para incluir.
            </p>
          ) : (
            membros.map((entrada) => {
              const novidade = novidades[entrada.id];
              const totalNovos = novidade ? novidade.novosAtual + novidade.novosHistorico : undefined;
              const expandido = expandidoId === entrada.id;
              return (
                <div key={entrada.id} style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "0.6rem 0.85rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "600", color: "var(--text-main)", fontSize: "0.86rem" }}>{entrada.nomePrincipal}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.3rem" }}>
                        <span>{(entrada.totalAtual || 0) + (entrada.totalHistorico || 0)} resultado(s)</span>
                        {totalNovos !== undefined && (
                          totalNovos > 0 ? (
                            <button
                              onClick={() => setExpandidoId(expandido ? null : entrada.id)}
                              style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.72rem" }}
                            >
                              <span className="highlight-nome">{totalNovos} novo(s)!</span>
                              {expandido ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </button>
                          ) : (
                            <span>· sem novidades</span>
                          )
                        )}
                      </div>
                      {expandido && novidade && (
                        <div style={{ marginTop: "0.35rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {novidade.novosAtual} novo(s) no Banco Atual · {novidade.novosHistorico} novo(s) no Arquivo Histórico
                        </div>
                      )}
                      <ListaDocumentos
                        itensAtual={entrada.itensAtual}
                        itensHistorico={entrada.itensHistorico}
                        nomePrincipal={entrada.nomePrincipal}
                      />
                    </div>
                    <button
                      onClick={() => handleVerResultados(entrada)}
                      disabled={bloqueado}
                      title={bloqueado ? "Aguarde a operação em andamento terminar" : "Ver os documentos desta pessoa, com o nome destacado"}
                      style={{
                        background: "none",
                        border: "1px solid var(--border-color)",
                        borderRadius: "6px",
                        padding: "0.3rem 0.5rem",
                        color: "var(--text-main)",
                        cursor: bloqueado ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        fontSize: "0.72rem",
                        opacity: bloqueado ? 0.5 : 1,
                      }}
                    >
                      {atualizandoId === entrada.id ? <RefreshCw size={13} className="spin" /> : <Eye size={13} />}
                    </button>
                    <button
                      onClick={() => onDefinirMembro(entrada.id, nome, false)}
                      disabled={bloqueado}
                      title="Remover desta lista"
                      style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "0.3rem", color: "var(--text-muted)", cursor: bloqueado ? "default" : "pointer", display: "flex" }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function MinhasListas({ nomesListas, itensListas, buscas, listaPadrao, onAtualizar, onAtualizarLote, onDefinirMembro, onCriarLista, onExcluirLista, onVerResultados, atualizandoId, progressoLote, bloqueado }) {
  const [criandoAberto, setCriandoAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");

  const handleCriar = () => {
    if (!novoNome.trim()) return;
    onCriarLista(novoNome.trim());
    setNovoNome("");
    setCriandoAberto(false);
  };

  const secoes = [listaPadrao, ...nomesListas];

  return (
    <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ fontWeight: "600", color: "var(--text-main)" }}>Minhas Listas</div>

      {secoes.map((nome) => (
        <SecaoLista
          key={nome}
          nome={nome}
          ehPadrao={nome === listaPadrao}
          membros={itensListas.filter((b) => (b.listas || []).includes(nome))}
          buscas={buscas}
          onAtualizar={onAtualizar}
          onAtualizarLote={onAtualizarLote}
          onDefinirMembro={onDefinirMembro}
          onExcluirLista={onExcluirLista}
          onVerResultados={onVerResultados}
          atualizandoId={atualizandoId}
          progressoLote={progressoLote}
          bloqueado={bloqueado}
        />
      ))}

      {criandoAberto ? (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCriar(); }}
            placeholder="Nome da nova lista"
            autoFocus
            style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-main)", fontSize: "0.85rem" }}
          />
          <button
            onClick={handleCriar}
            style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: "6px", padding: "0.5rem 0.9rem", fontSize: "0.8rem", cursor: "pointer" }}
          >
            Criar
          </button>
          <button
            onClick={() => { setCriandoAberto(false); setNovoNome(""); }}
            style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "0.5rem 0.9rem", fontSize: "0.8rem", color: "var(--text-main)", cursor: "pointer" }}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCriandoAberto(true)}
          style={{ background: "none", border: "1px dashed var(--border-color)", borderRadius: "8px", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem", padding: "0.6rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
        >
          <Plus size={14} /> Nova lista
        </button>
      )}
    </div>
  );
}
