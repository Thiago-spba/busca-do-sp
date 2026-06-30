import React, { useState, useEffect } from "react";
import { SearchBar } from "../components/SearchBar";
import { ResultCard } from "../components/ResultCard";
import { useSearch } from "../hooks/useSearch";
import { Database, Archive, AlertCircle, Moon, Sun, Info, Mail } from "lucide-react";

export function Home() {
  const { resultados, erros, resumo, loadingAtual, loadingHistorico, buscar } = useSearch();
  
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("busca-dosp-theme") === "dark";
  });
  const [termosBuscados, setTermosBuscados] = useState([]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("busca-dosp-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("busca-dosp-theme", "light");
    }
  }, [isDark]);

  const handleSearch = (termos, dataInicio, dataFim) => {
    setTermosBuscados(termos.map(t => typeof t === 'string' ? t : t.label || t));
    buscar(termos.map(t => typeof t === 'string' ? t : t.label || t), dataInicio, dataFim);
  };

  const isBuscando = loadingAtual || loadingHistorico;
  const resAtual = resultados.filter(i => i.fonte === 'atual');
  const resHistorico = resultados.filter(i => i.fonte === 'historico');
  const totalResultados = resultados.length;
  const temFiltros = termosBuscados.length > 1;

  return (
    <div className="container">
      
      <div className="school-banner">
        <div className="school-name">E.E. Prof. Simão Mathias</div>
        <div className="school-address">Av. Ragueb Chohfi, 4757 — Jardim Três Marias, São Paulo - SP, 08380-330</div>
      </div>

      <div className="header-top">
        <button className="theme-toggle" onClick={() => setIsDark(!isDark)}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          {isDark ? "Modo Claro" : "Modo Escuro"}
        </button>
      </div>

      <div className="header">
        <h1>Busca DO-SP</h1>
        <p>Diário Oficial do Estado de São Paulo — Servidor da Educação</p>
      </div>

      <SearchBar onSearch={handleSearch} loading={isBuscando} />

      {/* Erros */}
      {erros.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          {erros.map((erro, idx) => (
             <div key={idx} className="error-message">
               <AlertCircle size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
               {erro}
             </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {(loadingAtual || loadingHistorico) && (
        <div className="status-indicator" style={{ justifyContent: 'center', marginTop: '2rem' }}>
          <div className="spinner"></div>
          {loadingAtual ? "Buscando em todas as fontes..." : "Finalizando busca no Acervo Histórico..."}
        </div>
      )}

      {/* Resumo de Resultados */}
      {!isBuscando && totalResultados > 0 && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '2rem', 
          padding: '1rem', 
          background: 'var(--bg-card)', 
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          color: 'var(--text-main)',
        }}>
          <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
            ✅ {totalResultados} publicação(ões) encontrada(s) para <strong>"{termosBuscados[0]}"</strong>
          </div>
          {temFiltros && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Filtrado por: {termosBuscados.slice(1).map((t, i) => (
                <span key={i} className="highlight-nome" style={{ fontSize: '0.8rem', marginLeft: '0.25rem' }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aviso quando filtro não encontra nada */}
      {!isBuscando && totalResultados === 0 && resumo && temFiltros && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '2rem', 
          padding: '1rem', 
          background: 'var(--chip-orange)', 
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          color: 'var(--chip-orange-text)',
        }}>
          <Info size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
          <strong>Nenhum resultado encontrado com os filtros selecionados.</strong>
          <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Tente buscar sem marcar os assuntos para ver todas as publicações de "{termosBuscados[0]}",
            ou altere o período de busca.
          </div>
        </div>
      )}

      {/* Grid de Resultados */}
      {(resultados.length > 0 || isBuscando) && (
        <div className="results-container">
          
          <div className="results-column">
            <h2 className="column-title">
              <Database size={22} color="var(--primary)" />
              Banco Atual (2024+)
              {!loadingAtual && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '400' }}> ({resAtual.length})</span>}
            </h2>
            {loadingAtual ? (
               <p style={{ color: 'var(--text-muted)' }}>Procurando recentes...</p>
            ) : resAtual.length > 0 ? (
              <div className="results-list">
                {resAtual.map((item, idx) => (
                  <ResultCard key={item.id || idx} item={item} termosBusca={termosBuscados} />
                ))}
              </div>
            ) : (
               <p style={{ color: 'var(--text-muted)' }}>Nenhuma publicação recente encontrada.</p>
            )}
          </div>

          <div className="results-column">
            <h2 className="column-title">
              <Archive size={22} color="#f59e0b" />
              Arquivo Histórico
              {!loadingHistorico && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '400' }}> ({resHistorico.length})</span>}
            </h2>
            {loadingHistorico ? (
               <div className="status-indicator">
                 <div className="spinner"></div>
                 Lendo acervo antigo...
               </div>
            ) : resHistorico.length > 0 ? (
              <div className="results-list">
                {resHistorico.map((item, idx) => (
                  <ResultCard key={item.id || idx} item={item} termosBusca={termosBuscados} />
                ))}
              </div>
            ) : (
               <p style={{ color: 'var(--text-muted)' }}>Nenhuma publicação antiga encontrada.</p>
            )}
          </div>

        </div>
      )}
      
      {!isBuscando && resultados.length === 0 && erros.length === 0 && !resumo && (
         <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '3rem' }}>
           Faça uma busca para ver os resultados divididos por fonte.
         </p>
      )}

      {/* Rodapé */}
      <footer className="app-footer">
        <div className="footer-name">Professor Thiago Fernando</div>
        <div className="footer-title">Engenheiro de Computação — 2026/27</div>
        <a href="mailto:thiagofernando_sp@yahoo.com.br" className="footer-email" title="Enviar e-mail">
          <Mail size={22} />
        </a>
      </footer>
    </div>
  );
}
