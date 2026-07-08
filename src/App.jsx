import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { RotaProtegida } from "./components/RotaProtegida";
import { RotaAdmin } from "./components/RotaAdmin";
import "./index.css";

const Home = lazy(() => import("./pages/Home").then((m) => ({ default: m.Home })));
const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const AdminPage = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));

function CarregandoTela() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-muted)" }}>
      Carregando...
    </div>
  );
}

function App() {
  return (
    <Router>
      <Suspense fallback={<CarregandoTela />}>
        <Routes>
          <Route
            path="/"
            element={
              <RotaProtegida>
                <Home />
              </RotaProtegida>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <RotaAdmin>
                <AdminPage />
              </RotaAdmin>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
