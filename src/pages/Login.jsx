import React from "react";
import { Link } from "react-router-dom";

export function Login() {
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="search-container" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h2>Login - Busca DO-SP</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Autentique-se com o Firebase para salvar buscas.
        </p>
        <button className="btn-primary" disabled>Login com Google (Mock)</button>
        <div style={{ marginTop: '1rem' }}>
          <Link to="/" style={{ color: '#60a5fa' }}>Voltar para Home</Link>
        </div>
      </div>
    </div>
  );
}
