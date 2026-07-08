import React, { useState, useEffect, useRef } from "react";
import { SearchBar } from "../components/SearchBar";
import { ResultCard } from "../components/ResultCard";
import { HistoricoBuscas } from "../components/HistoricoBuscas";
import { MinhasListas } from "../components/MinhasListas";
import { useSearch } from "../hooks/useSearch";
import { useHistoricoBuscas } from "../hooks/useHistoricoBuscas";
import { auth } from "../firebase/config";
import { fraseDoDia } from "../config/frasesMotivacionais";
import { Database, Archive, AlertCircle, Moon, Sun, Info, Mail, SearchX } from "lucide-react";

// Determina o periodo do dia (manha 5h-11h59, tarde 12h-17h59, noite 18h-4h59),
// usado tanto para a saudacao quanto para escolher o tom da frase do dia.
function periodoDoDia(hora) {
  if (hora >= 5 && hora < 12) return "manha";
  if (hora >= 12 && hora < 18) return "tarde";
  return "noite";
}

const SAUDACAO_POR_PERIODO = {
  manha: { texto: "Bom dia", icone: "🌅" },
  tarde: { texto: "Boa tarde", icone: "☀️" },
  noite: { texto: "Boa noite", icone: "🌙" },
};

export function Home() {
  const { resultados, erros, resumo, loadingAtual, loadingHistorico, buscar } = useSearch();
  const historico = useHistoricoBuscas();

  const periodo = periodoDoDia(new Date().getHours());
  const { texto: saudacaoTexto, icone: saudacaoIcone } = SAUDACAO_POR_PERIODO[periodo];
  const primeiroNome = (auth.currentUser?.displayName || "").split(" ")[0];
  const frase = fraseDoDia(periodo);

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("busca-dosp-theme") === "dark";
  });
  const [termosBuscados, setTermosBuscados] = useState([]);
  const [atualizandoHistoricoId, setAtualizandoHistoricoId] = useState(null);
  const [progressoLote, setProgressoLote] = useState(null);
  const resultadosRef = useRef(null);

  // Rola a pagina ate a grade de resultados (Banco Atual / Arquivo Historico),
  // usado pelo botao "Ver resultados" do Historico e das Minhas Listas.
  const rolarParaResultados = () => {
    resultadosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("busca-dosp-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("busca-dosp-theme", "light");
    }
  }, [isDark]);

  const handleSearch = async (termos, dataInicio, dataFim) => {
    const termosNormalizados = termos.map(t => typeof t === 'string' ? t : t.label || t);
    setTermosBuscados(termosNormalizados);
    const resultado = await buscar(termosNormalizados, dataInicio, dataFim);
    if (resultado) {
      historico.salvarBusca({
        termos: termosNormalizados,
        fromDate: dataInicio,
        toDate: dataFim,
        totalAtual: resultado.totalAtual,
        totalHistorico: resultado.totalHistorico,
        idsAtual: resultado.idsAtual,
        idsHistorico: resultado.idsHistorico,
        diagnostico: resultado.diagnostico,
      });
    }
  };

  // So permite UMA busca por vez no app inteiro: o "Atualizar" do historico usa a mesma
  // funcao `buscar` da barra principal, que cancela qualquer busca anterior em andamento
  // assim que uma nova comeca. Rodar duas ao mesmo tempo quebraria essa segunda.
  const handleAtualizarHistorico = async (entrada) => {
    setAtualizandoHistoricoId(entrada.id);
    // Registra o nome da pessoa desta atualizacao: e ele que alimenta o destaque
    // verde nos resultados, o link "#:~:text=" que abre o documento direto no nome
    // (Banco Atual) e o aviso "Copiar nome" dos PDFs do Arquivo Historico.
    setTermosBuscados(entrada.termos || []);
    try {
      return await historico.atualizarBusca(entrada, buscar);
    } finally {
      setAtualizandoHistoricoId(null);
    }
  };
  const handleExcluirHistorico = (entrada) => historico.excluirBusca(entrada.id);

  /**
   * Atualiza varias entradas do historico em sequencia (uma de cada vez, reaproveitando
   * handleAtualizarHistorico), reportando o progresso para a barra de progresso.
   * Retorna os resultados de cada uma para o HistoricoBuscas montar o resumo final.
   */
  const handleAtualizarLote = async (entradas) => {
    const resultados = [];
    for (let i = 0; i < entradas.length; i++) {
      const entrada = entradas[i];
      setProgressoLote({ atual: i + 1, total: entradas.length, nomeAtual: entrada.nomePrincipal });
      const r = await handleAtualizarHistorico(entrada);
      resultados.push({ id: entrada.id, novosAtual: r?.novosAtual || 0, novosHistorico: r?.novosHistorico || 0 });
    }
    setProgressoLote(null);
    return resultados;
  };

  const isBuscando = loadingAtual || loadingHistorico;
  const operacaoEmAndamento = isBuscando || atualizandoHistoricoId !== null || progressoLote !== null;
  const resAtual = resultados.filter(i => i.fonte === 'atual');
  const resHistorico = resultados.filter(i => i.fonte === 'historico');
  const totalResultados = resultados.length;
  const temFiltros = termosBuscados.length > 1;
  const buscaConcluidaSemResultados = !isBuscando && totalResultados === 0 && resumo !== null;

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

      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "10px",
          padding: "1rem 1.25rem",
          textAlign: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ fontWeight: "600", color: "var(--text-main)", marginBottom: "0.35rem" }}>
          {saudacaoIcone} {saudacaoTexto}{primeiroNome ? `, ${primeiroNome}` : ""}!
        </div>
        <div style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.9rem" }}>
          "{frase}"
        </div>
      </div>

      <SearchBar onSearch={handleSearch} loading={operacaoEmAndamento} />

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

      {/* Aviso quando filtro não encontra nada (mas existem publicações da pessoa) */}
      {buscaConcluidaSemResultados && temFiltros && (
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

      {/* Aviso quando nao ha absolutamente nada no Diario Oficial (nem Atual, nem Historico) */}
      {buscaConcluidaSemResultados && !temFiltros && (
        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          padding: '1.25rem',
          background: 'var(--bg-card)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          color: 'var(--text-main)',
        }}>
          <SearchX size={22} style={{ display: 'block', margin: '0 auto 0.5rem' }} color="var(--text-muted)" />
          <strong>Nada consta para "{termosBuscados[0]}" no período selecionado.</strong>
          <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            Não encontramos publicações nem no Banco Atual (2024+) nem no Arquivo Histórico.
            Tente ampliar o período de busca ou conferir se o nome foi digitado corretamente
            (nomes abreviados, como "Maria S. Santos", também são aceitos).
          </div>
        </div>
      )}

      {/* Grid de Resultados */}
      {(resultados.length > 0 || isBuscando) && (
        <div className="results-container" ref={resultadosRef}>
          
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

      {/* Acompanhamento: listas de favoritos e historico de buscas, abaixo dos
          resultados para que a area logo apos a busca seja sempre dos documentos */}
      <MinhasListas
        nomesListas={historico.nomesListas}
        itensListas={historico.itensListas}
        buscas={historico.buscas}
        listaPadrao={historico.listaPadrao}
        onAtualizar={handleAtualizarHistorico}
        onAtualizarLote={handleAtualizarLote}
        onDefinirMembro={historico.definirMembroLista}
        onCriarLista={historico.criarLista}
        onExcluirLista={historico.excluirLista}
        onVerResultados={rolarParaResultados}
        atualizandoId={atualizandoHistoricoId}
        progressoLote={progressoLote}
        bloqueado={operacaoEmAndamento}
      />

      <HistoricoBuscas
        historico={historico}
        onAtualizar={handleAtualizarHistorico}
        onExcluir={handleExcluirHistorico}
        onVerResultados={rolarParaResultados}
        atualizandoId={atualizandoHistoricoId}
        bloqueado={operacaoEmAndamento}
      />

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
