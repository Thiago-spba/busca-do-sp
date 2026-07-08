import React, { useState } from "react";
import { Search, User, Calendar, CheckSquare } from "lucide-react";

const CHIPS_PADRAO = [
  "Licença Saúde",
  "Readaptação",
  "Quinquênio",
  "Licença Prêmio",
  "Evolução Funcional",
  "Efetivo Exercício",
];

export function SearchBar({ onSearch, loading }) {
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [assuntosSelecionados, setAssuntosSelecionados] = useState({});
  const [assuntoExtra, setAssuntoExtra] = useState("");
  
  // Controle de datas
  const [periodoSelecionado, setPeriodoSelecionado] = useState("ultimo_ano");
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState("");
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState("");

  const handleCheckboxChange = (assunto) => {
    setAssuntosSelecionados(prev => ({
      ...prev,
      [assunto]: !prev[assunto]
    }));
  };

  const calcularDatas = () => {
    if (periodoSelecionado === "personalizado") {
      return { 
        fromDate: dataInicioPersonalizada, 
        toDate: dataFimPersonalizada 
      };
    }

    const hoje = new Date();
    let dataInicio = new Date();

    if (periodoSelecionado === "ultimos_6_meses") {
      dataInicio.setMonth(hoje.getMonth() - 6);
    } else if (periodoSelecionado === "ultimo_ano") {
      dataInicio.setFullYear(hoje.getFullYear() - 1);
    } else if (periodoSelecionado === "ultimos_5_anos") {
      dataInicio.setFullYear(hoje.getFullYear() - 5);
    } else if (periodoSelecionado === "todo_periodo") {
      dataInicio.setFullYear(1900);
    }
    
    // Formatar YYYY-MM-DD
    const f = (d) => d.toISOString().split("T")[0];
    return { fromDate: f(dataInicio), toDate: f(hoje) };
  };

  const handleSearch = () => {
    if (!nomeCompleto.trim()) {
      return alert("Por favor, digite o nome do servidor ou termo principal.");
    }
    
    // Coleta as caixas marcadas
    const temasMarcados = Object.keys(assuntosSelecionados).filter(k => assuntosSelecionados[k]);
    
    // Adiciona o termo principal, os temas e a palavra-chave extra
    const termos = [nomeCompleto.trim(), ...temasMarcados];
    if (assuntoExtra.trim()) {
      termos.push(assuntoExtra.trim());
    }

    const { fromDate, toDate } = calcularDatas();
    
    if (!fromDate || !toDate) {
      return alert("Por favor, preencha as datas corretamente no período personalizado.");
    }

    onSearch(termos, fromDate, toDate);
  };

  return (
    <div className="search-container">
      
      {/* 1. Nome do Servidor */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label className="input-label">Qual o nome da pessoa (ou termo principal)?</label>
        <div className="input-wrapper">
          <User size={18} color="var(--text-muted)" />
          <input
            type="text"
            className="input-field"
            placeholder="Ex: João Silva dos Santos"
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
          />
        </div>
      </div>

      {/* 2. Assuntos (Checkboxes para facilitar a vida do funcionário) */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckSquare size={16} /> Filtre por assuntos (Opcional):
        </label>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
          gap: '0.75rem', 
          background: 'var(--bg-app)', 
          padding: '1rem', 
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          {CHIPS_PADRAO.map(assunto => (
            <label key={assunto} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)' }}>
              <input 
                type="checkbox" 
                checked={!!assuntosSelecionados[assunto]}
                onChange={() => handleCheckboxChange(assunto)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              {assunto}
            </label>
          ))}
        </div>

        {/* Palavra-chave Extra (Caso o assunto não esteja nas opções) */}
        <div className="input-wrapper" style={{ marginTop: '0.5rem' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Digite uma palavra-chave extra aqui..."
            value={assuntoExtra}
            onChange={(e) => setAssuntoExtra(e.target.value)}
          />
        </div>
      </div>

      {/* 3. Período */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label className="input-label">Período de busca:</label>
        <div className="dates-wrapper" style={{ flexWrap: 'wrap' }}>
          <div className="input-wrapper" style={{ flex: '1 1 200px' }}>
            <Calendar size={18} color="var(--text-muted)" />
            <select 
              className="input-field" 
              value={periodoSelecionado}
              onChange={(e) => setPeriodoSelecionado(e.target.value)}
              style={{ appearance: 'none', cursor: 'pointer' }}
            >
              <option value="ultimos_6_meses">Últimos 6 meses</option>
              <option value="ultimo_ano">Último 1 ano (Padrão)</option>
              <option value="ultimos_5_anos">Últimos 5 anos</option>
              <option value="todo_periodo">Todo o Acervo Histórico (Desde a criação)</option>
              <option value="personalizado">Personalizado (Escolher datas)</option>
            </select>
          </div>

          {/* Mostrar calendários se o usuário quiser personalizado */}
          {periodoSelecionado === "personalizado" && (
            <div style={{ display: 'flex', gap: '1rem', flex: '2 1 300px' }}>
              <div className="input-wrapper" style={{ flex: 1 }}>
                <input
                  type="date"
                  className="input-field"
                  value={dataInicioPersonalizada}
                  onChange={(e) => setDataInicioPersonalizada(e.target.value)}
                />
              </div>
              <div className="input-wrapper" style={{ flex: 1 }}>
                <input
                  type="date"
                  className="input-field"
                  value={dataFimPersonalizada}
                  onChange={(e) => setDataFimPersonalizada(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <button className="btn-primary" onClick={handleSearch} disabled={loading}>
        <Search size={20} />
        {loading ? "Buscando informações..." : "Buscar Publicações Oficiais"}
      </button>
    </div>
  );
}
