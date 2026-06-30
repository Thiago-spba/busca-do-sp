import React, { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

function destacarTexto(texto, termos) {
  if (!texto || !termos || termos.length === 0) return texto;
  
  const escapedTerms = termos.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  
  const partes = texto.split(regex);
  
  return partes.map((parte, i) => {
    const isMatch = escapedTerms.some(t => new RegExp(`^${t}$`, 'i').test(parte));
    if (isMatch) {
      return <mark key={i} className="highlight-nome">{parte}</mark>;
    }
    return parte;
  });
}

export function ResultCard({ item, termosBusca = [] }) {
  const [expandido, setExpandido] = useState(false);
  
  const isHistorico = item.fonte === "historico";
  const dataFormatada = item.data 
    ? new Date(item.data).toLocaleDateString("pt-BR")
    : "Data indisponível";

  const urlBase = item.slug
    ? item.slug.startsWith("http") 
      ? item.slug 
      : `https://www.doe.sp.gov.br/${item.slug.replace(/^\//, '')}`
    : null;

  // Monta Text Fragments com múltiplas ocorrências
  // Repete o &text= várias vezes para o Chrome destacar várias aparições do nome
  const nomePrincipal = termosBusca.length > 0 ? termosBusca[0] : "";
  let linkOriginal = urlBase;
  if (urlBase && nomePrincipal) {
    const nomeEncoded = encodeURIComponent(nomePrincipal);
    // Até 10 ocorrências destacadas na página oficial
    const fragmentos = Array(10).fill(`text=${nomeEncoded}`).join('&');
    linkOriginal = `${urlBase}#:~:${fragmentos}`;
  }

  const trechoCompleto = item.trecho || "Trecho não disponível";
  const trechoCurto = trechoCompleto.length > 200 
    ? trechoCompleto.substring(0, 200) + "..." 
    : trechoCompleto;

  return (
    <div className="result-card" data-color={item.color || "neutro"}>
      
      <div className="card-header">
        <span className="card-title">{destacarTexto(item.titulo || "Publicação Oficial", termosBusca)}</span>
        <span className="card-date">{dataFormatada}</span>
      </div>
      
      {item.hierarquia && (
        <div style={{ 
          fontSize: '0.8rem', 
          color: 'var(--text-muted)', 
          marginBottom: '0.75rem',
          lineHeight: '1.4',
          fontStyle: 'italic'
        }}>
          📂 {item.hierarquia}
        </div>
      )}

      <div className="card-excerpt" style={{ whiteSpace: 'pre-wrap' }}>
        {expandido 
          ? destacarTexto(trechoCompleto, termosBusca)
          : destacarTexto(trechoCurto, termosBusca)
        }
      </div>

      {trechoCompleto.length > 200 && (
        <button 
          onClick={() => setExpandido(!expandido)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0',
            marginBottom: '0.75rem',
            fontWeight: '500'
          }}
        >
          {expandido ? (
            <><ChevronUp size={14} /> Recolher</>
          ) : (
            <><ChevronDown size={14} /> Ver trecho completo</>
          )}
        </button>
      )}

      <div className="card-footer">
        <span className={`badge-fonte ${isHistorico ? "historico" : ""}`}>
          {isHistorico ? "📜 Arquivo Histórico" : "📄 Diário Oficial Atual"}
        </span>
        
        {linkOriginal && (
          <a
            href={linkOriginal}
            target="_blank"
            rel="noopener noreferrer"
            className="link-original"
          >
            Conferir no site oficial <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}
