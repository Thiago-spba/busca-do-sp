import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  listarUsuariosAPI,
  bloquearUsuarioAPI,
  desbloquearUsuarioAPI,
  listarHistoricoUsuarioAPI,
  obterConfigAcessoAPI,
  atualizarLimiteUsuariosAPI,
} from "../services/adminApi";

function formatarData(valor, apenasData = false) {
  if (!valor) return "-";
  if (apenasData) {
    const [ano, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  return new Date(valor).toLocaleDateString("pt-BR");
}

export function AdminPage() {
  const [limite, setLimite] = useState(null);
  const [novoLimite, setNovoLimite] = useState("");
  const [salvandoLimite, setSalvandoLimite] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [processandoUid, setProcessandoUid] = useState(null);
  const [historicoAbertoUid, setHistoricoAbertoUid] = useState(null);
  const [historicoPorUsuario, setHistoricoPorUsuario] = useState({});
  const [carregandoHistoricoUid, setCarregandoHistoricoUid] = useState(null);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const [lim, users] = await Promise.all([obterConfigAcessoAPI(), listarUsuariosAPI()]);
        setLimite(lim);
        setNovoLimite(String(lim));
        setUsuarios(users);
      } catch (err) {
        console.error(err);
        setErro("Não foi possível carregar os dados. Tente novamente.");
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const handleSalvarLimite = async () => {
    const valor = Number(novoLimite);
    if (!Number.isInteger(valor) || valor < 1) return;
    setSalvandoLimite(true);
    setErro(null);
    try {
      await atualizarLimiteUsuariosAPI(valor);
      setLimite(valor);
    } catch (err) {
      console.error(err);
      setErro(err.message || "Não foi possível atualizar o limite.");
    } finally {
      setSalvandoLimite(false);
    }
  };

  const handleBloquear = async (uid, bloquear) => {
    setProcessandoUid(uid);
    setErro(null);
    try {
      if (bloquear) await bloquearUsuarioAPI(uid);
      else await desbloquearUsuarioAPI(uid);
      setUsuarios((prev) => prev.map((u) => (u.uid === uid ? { ...u, bloqueado: bloquear } : u)));
    } catch (err) {
      console.error(err);
      setErro(err.message || "Não foi possível atualizar o status dessa pessoa.");
    } finally {
      setProcessandoUid(null);
    }
  };

  const handleVerHistorico = async (uid) => {
    if (historicoAbertoUid === uid) {
      setHistoricoAbertoUid(null);
      return;
    }
    setHistoricoAbertoUid(uid);
    if (!historicoPorUsuario[uid]) {
      setCarregandoHistoricoUid(uid);
      try {
        const buscas = await listarHistoricoUsuarioAPI(uid);
        setHistoricoPorUsuario((prev) => ({ ...prev, [uid]: buscas }));
      } catch (err) {
        console.error(err);
        setErro("Não foi possível carregar o histórico dessa pessoa.");
      } finally {
        setCarregandoHistoricoUid(null);
      }
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Painel do Administrador</h1>
        <p>Gerencie quem pode acessar o Busca DO-SP</p>
      </div>

      <a href="/" className="theme-toggle" style={{ textDecoration: "none", display: "inline-flex", marginBottom: "1.5rem" }}>
        <ArrowLeft size={18} /> Voltar pra busca
      </a>

      {erro && <div className="error-message">{erro}</div>}

      <div className="tracking-section">
        <div className="tracking-body" style={{ paddingTop: "1.25rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-main)" }}>Limite de usuários cadastrados</div>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="number"
              min="1"
              value={novoLimite}
              onChange={(e) => setNovoLimite(e.target.value)}
              style={{ width: "100px", padding: "0.5rem 0.7rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-main)" }}
            />
            <button className="tracking-btn" onClick={handleSalvarLimite} disabled={salvandoLimite}>
              {salvandoLimite ? "Salvando..." : "Salvar"}
            </button>
            {limite !== null && (
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {usuarios.length} de {limite} vagas usadas
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="tracking-section">
        <div className="tracking-body" style={{ paddingTop: "1.25rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem", color: "var(--text-main)" }}>Usuários cadastrados</div>
          {carregando ? (
            <p className="tracking-empty">Carregando...</p>
          ) : usuarios.length === 0 ? (
            <p className="tracking-empty">Nenhum usuário cadastrado ainda.</p>
          ) : (
            usuarios.map((u) => (
              <div key={u.uid} className="tracking-card" style={{ marginBottom: "0.85rem" }}>
                <div className="tracking-card-row">
                  <span className="tracking-name">{u.email}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: u.bloqueado ? "#dc2626" : "#15803d" }}>
                    {u.bloqueado ? "Bloqueado" : "Ativo"}
                  </span>
                </div>
                <div className="tracking-meta">Cadastrado em {formatarData(u.criadoEm)}</div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                  <button className="tracking-btn-ghost" onClick={() => handleVerHistorico(u.uid)}>
                    {historicoAbertoUid === u.uid ? "Ocultar histórico" : "Ver histórico"}
                  </button>
                  <button
                    className="tracking-btn"
                    style={u.bloqueado ? undefined : { background: "#dc2626" }}
                    onClick={() => handleBloquear(u.uid, !u.bloqueado)}
                    disabled={processandoUid === u.uid}
                  >
                    {processandoUid === u.uid ? "..." : u.bloqueado ? "Desbloquear" : "Bloquear"}
                  </button>
                </div>

                {historicoAbertoUid === u.uid && (
                  <div style={{ marginTop: "0.85rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                    {carregandoHistoricoUid === u.uid ? (
                      <p className="tracking-empty">Carregando histórico...</p>
                    ) : (historicoPorUsuario[u.uid] || []).length === 0 ? (
                      <p className="tracking-empty">Nenhuma busca registrada.</p>
                    ) : (
                      historicoPorUsuario[u.uid].map((b) => (
                        <div key={b.id} style={{ fontSize: "0.85rem", color: "var(--text-main)", padding: "0.5rem 0", borderBottom: "1px solid var(--border-color)" }}>
                          <strong>{b.nomePrincipal}</strong> — {b.totalAtual + b.totalHistorico} resultado(s)
                          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.15rem" }}>
                            {formatarData(b.fromDate, true)} – {formatarData(b.toDate, true)}
                            {b.filtros?.length > 0 && ` · Filtros: ${b.filtros.join(", ")}`}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
