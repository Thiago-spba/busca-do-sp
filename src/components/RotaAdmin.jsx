import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { ADMIN_EMAIL } from "../config/admin";

/**
 * Guarda de conveniencia pra esconder a pagina de admin de quem nao e admin.
 * A seguranca de verdade fica nas Cloud Functions (functions/admin.js), que
 * conferem o e-mail de novo no servidor e nao confiam nesta checagem.
 */
export function RotaAdmin({ children }) {
  const [usuario, setUsuario] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
    });
    return () => unsubscribe();
  }, []);

  if (usuario === undefined) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-muted)" }}>
        Verificando acesso...
      </div>
    );
  }

  if (usuario === null || usuario.email !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />;
  }

  return children;
}
