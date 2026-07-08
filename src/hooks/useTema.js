import { useEffect, useState } from "react";

const CHAVE_LOCALSTORAGE = "busca-dosp-theme";

/**
 * Tema claro/escuro compartilhado entre todas as paginas (Home, Login,
 * Admin) - cada pagina tem seu proprio estado React, mas todas leem/escrevem
 * a mesma chave no localStorage, entao a preferencia se mantem ao navegar.
 */
export function useTema() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem(CHAVE_LOCALSTORAGE) === "dark");

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem(CHAVE_LOCALSTORAGE, "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem(CHAVE_LOCALSTORAGE, "light");
    }
  }, [isDark]);

  return [isDark, setIsDark];
}
