import React from "react";

/**
 * Tela de "manutencao" mostrada quando o administrador bloqueia uma conta -
 * usada tanto na tela de login (bloqueio detectado ao entrar) quanto no
 * Home (bloqueio detectado numa sessao ja aberta).
 */
export function ContaBloqueada() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--login-bg)",
        padding: "1.5rem",
      }}
    >
      <div className="school-banner" style={{ maxWidth: "420px", width: "100%" }}>
        <div className="school-name">E.E. Prof. Simão Mathias</div>
        <div className="school-address">
          Av. Ragueb Chohfi, 4757 — Jardim Três Marias, São Paulo - SP, 08380-330
        </div>
      </div>

      <div
        style={{
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
          background: "var(--login-card-bg)",
          borderRadius: "16px",
          padding: "2.5rem 2rem",
          border: "1px solid rgba(220, 38, 38, 0.25)",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div style={{ fontSize: "2.75rem", marginBottom: "0.75rem" }}>🔑⚙️</div>
        <h2 style={{ color: "var(--text-main)", marginBottom: "0.5rem" }}>Acesso em manutenção</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6 }}>
          Sua conta está temporariamente bloqueada pelo administrador.
          Entre em contato com a coordenação da escola se acha que isso é um engano.
        </p>
      </div>
    </div>
  );
}
