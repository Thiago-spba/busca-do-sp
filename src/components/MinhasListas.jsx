import React, { useState } from "react";
import { Star, FolderKanban, ChevronDown, ChevronUp, RefreshCw, Trash2, Plus, UserPlus } from "lucide-react";
import { ListaDocumentos } from "./ListaDocumentos";

function SecaoLista({ nome, ehPadrao, membros, buscas, onAtualizar, onAtualizarLote, onDefinirMembro, onExcluirLista, atualizandoId, progressoLote, bloqueado }) {
  const [aberto, setAberto] = useState(false);
  const [pickerAberto, setPickerAberto] = useState(false);
  const [novidades, setNovidades] = useState({});
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

  // Busca novamente essa pessoa e ja mostra se teve novidade - tudo num so
  // botao, sem pular a tela: o resultado aparece aqui mesmo, no card dela.
  const handleVerEAtualizar = async (entrada) => {
    const { novosAtual, novosHistorico } = await onAtualizar(entrada);
    setNovidades((prev) => ({ ...prev, [entrada.id]: { novosAtual, novosHistorico } }));
  };

  return (
    <div className="tracking-section" style={{ marginTop: 0 }}>
      <button className="tracking-toggle" onClick={() => setAberto(!aberto)}>
        {ehPadrao ? <Star size={18} fill="#f59e0b" color="#f59e0b" /> : <FolderKanban size={18} />}
        {nome} ({membros.length})
        <span style={{ marginLeft: "auto" }}>{aberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
      </button>

      {aberto && (
        <div className="tracking-body">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button
                onClick={() => setPickerAberto(!pickerAberto)}
                disabled={bloqueado}
                className="tracking-btn"
                style={{ background: pickerAberto ? "var(--chip-orange)" : "var(--bg-card)", color: pickerAberto ? "var(--chip-orange-text)" : "var(--text-main)", border: "1px solid var(--border-color)" }}
              >
                <UserPlus size={14} /> Adicionar do histórico
              </button>
              {membros.length > 0 && (
                <button onClick={handleAtualizarTodos} disabled={bloqueado} className="tracking-btn">
                  <RefreshCw size={14} className={progressoLote ? "spin" : ""} />
                  Atualizar todos ({membros.length})
                </button>
              )}
            </div>

            {!ehPadrao && (
              confirmandoExclusao ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>Excluir esta lista?</span>
                  <button className="tracking-btn-ghost" onClick={() => setConfirmandoExclusao(false)}>Cancelar</button>
                  <button className="tracking-btn-ghost" style={{ color: "#dc2626" }} onClick={() => { onExcluirLista(nome); setConfirmandoExclusao(false); }}>
                    Excluir
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmandoExclusao(true)} disabled={bloqueado} className="tracking-btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Trash2 size={13} /> Excluir lista
                </button>
              )
            )}
          </div>

          {pickerAberto && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "0.7rem", maxHeight: "220px", overflowY: "auto" }}>
              {buscas.length === 0 ? (
                <p className="tracking-empty">Nenhuma busca no histórico ainda.</p>
              ) : (
                buscas.map((b) => (
                  <label key={b.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.4rem 0.25rem", cursor: bloqueado ? "default" : "pointer", fontSize: "0.9rem", color: "var(--text-main)" }}>
                    <input
                      type="checkbox"
                      checked={idsMembros.has(b.id)}
                      disabled={bloqueado}
                      onChange={(e) => onDefinirMembro(b.id, nome, e.target.checked)}
                      style={{ width: "16px", height: "16px", cursor: bloqueado ? "default" : "pointer" }}
                    />
                    {b.nomePrincipal}
                  </label>
                ))
              )}
            </div>
          )}

          {progressoLote && (
            <div>
              <div style={{ fontSize: "0.88rem", color: "var(--text-main)" }}>
                Buscando {progressoLote.atual} de {progressoLote.total}: <strong>{progressoLote.nomeAtual}</strong>...
              </div>
              <div style={{ background: "var(--border-color)", borderRadius: "4px", height: "6px", overflow: "hidden", marginTop: "0.5rem" }}>
                <div style={{ background: "var(--primary)", height: "100%", width: `${(progressoLote.atual / progressoLote.total) * 100}%`, transition: "width 0.3s" }} />
              </div>
            </div>
          )}

          {resumo && !progressoLote && (
            <div style={{ fontSize: "0.88rem", color: "var(--text-main)" }}>
              ✅ {resumo.total} verificada(s){resumo.comNovidades > 0 ? `, ${resumo.comNovidades} com novidades!` : ", sem novidades."}
            </div>
          )}

          {membros.length === 0 ? (
            <p className="tracking-empty">Nenhuma pessoa nesta lista. Use "Adicionar do histórico" para incluir.</p>
          ) : (
            membros.map((entrada) => {
              const novidade = novidades[entrada.id];
              const totalNovos = novidade ? novidade.novosAtual + novidade.novosHistorico : undefined;
              const carregandoEsta = atualizandoId === entrada.id;
              return (
                <div key={entrada.id} className="tracking-card">
                  <div className="tracking-card-row">
                    <span className="tracking-name">{entrada.nomePrincipal}</span>
                    <span className="tracking-count">{(entrada.totalAtual || 0) + (entrada.totalHistorico || 0)} resultado(s)</span>
                  </div>

                  <div className="tracking-status">
                    {carregandoEsta ? (
                      <span>Buscando novidades...</span>
                    ) : totalNovos !== undefined ? (
                      totalNovos > 0 ? (
                        <span className="highlight-nome">{totalNovos} novo(s)!</span>
                      ) : (
                        <span>Sem novidades desde a última checagem</span>
                      )
                    ) : (
                      <span>Ainda não verificado nesta sessão</span>
                    )}
                  </div>

                  <ListaDocumentos
                    itensAtual={entrada.itensAtual}
                    itensHistorico={entrada.itensHistorico}
                    nomePrincipal={entrada.nomePrincipal}
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
                    <button
                      onClick={() => handleVerEAtualizar(entrada)}
                      disabled={bloqueado}
                      className="tracking-btn"
                      title={bloqueado && !carregandoEsta ? "Aguarde a operação em andamento terminar" : undefined}
                    >
                      <RefreshCw size={14} className={carregandoEsta ? "spin" : ""} />
                      {carregandoEsta ? "Buscando..." : "Ver e atualizar"}
                    </button>
                    <button
                      onClick={() => onDefinirMembro(entrada.id, nome, false)}
                      disabled={bloqueado}
                      className="tracking-btn-ghost"
                    >
                      Remover da lista
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

export function MinhasListas({ nomesListas, itensListas, buscas, listaPadrao, onAtualizar, onAtualizarLote, onDefinirMembro, onCriarLista, onExcluirLista, atualizandoId, progressoLote, bloqueado }) {
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
    <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ fontWeight: "600", color: "var(--text-main)", fontSize: "1.1rem" }}>Minhas Listas</div>

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
          atualizandoId={atualizandoId}
          progressoLote={progressoLote}
          bloqueado={bloqueado}
        />
      ))}

      {criandoAberto ? (
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <input
            type="text"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCriar(); }}
            placeholder="Nome da nova lista"
            autoFocus
            style={{ flex: "1 1 200px", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-main)", fontSize: "0.9rem" }}
          />
          <button onClick={handleCriar} className="tracking-btn">Criar</button>
          <button onClick={() => { setCriandoAberto(false); setNovoNome(""); }} className="tracking-btn-ghost">
            Cancelar
          </button>
        </div>
      ) : (
        <button onClick={() => setCriandoAberto(true)} className="tracking-loadmore" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
          <Plus size={16} /> Nova lista
        </button>
      )}
    </div>
  );
}
