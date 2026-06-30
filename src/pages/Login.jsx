import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../firebase/config";

export function Login() {
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  const handleLoginGoogle = async () => {
    setErro(null);
    setCarregando(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);

      const verificarAcesso = httpsCallable(functions, "verificarAcesso");
      const resultado = await verificarAcesso();
      const { autorizado, motivo, totalCadastrados, limite } = resultado.data;

      if (autorizado) {
        navigate("/");
      } else {
        await signOut(auth);
        if (motivo === "limite_atingido") {
          setErro(
            `O limite de ${limite} usuarios cadastrados ja foi atingido (${totalCadastrados}/${limite}). ` +
            "Entre em contato com o administrador para liberar uma vaga."
          );
        } else {
          setErro("Acesso nao autorizado.");
        }
      }
    } catch (err) {
      console.error("Erro no login:", err);
      setErro("Nao foi possivel fazer login. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#FAF3E8",
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
          background: "#FFFDF8",
          borderRadius: "16px",
          padding: "2.5rem 2rem",
          border: "1px solid rgba(59, 130, 246, 0.35)",
          boxShadow:
            "0 0 0 1px rgba(59, 130, 246, 0.08), 0 8px 24px rgba(30, 64, 175, 0.12), 0 0 18px rgba(59, 130, 246, 0.15)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "16px",
            padding: "1px",
            background: "linear-gradient(135deg, rgba(59,130,246,0.5), rgba(30,64,175,0.1), rgba(59,130,246,0.5))",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            pointerEvents: "none",
          }}
        />

        <h2 style={{ color: "#1e293b", marginBottom: "0.5rem" }}>Busca DO-SP</h2>
        <p style={{ color: "#64748b", marginBottom: "2rem", fontSize: "0.95rem" }}>
          Acesso restrito. Entre com sua conta Google autorizada.
        </p>

        {erro && (
          <div className="error-message" style={{ marginBottom: "1rem" }}>
            {erro}
          </div>
        )}

        <button className="btn-primary" onClick={handleLoginGoogle} disabled={carregando} style={{ width: "100%" }}>
          {carregando ? "Entrando..." : "Entrar com Google"}
        </button>
      </div>
    </div>
  );
}
