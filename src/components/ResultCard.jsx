import React, { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { formatarDataDocumento, montarLinkOficial } from "../utils/linkOficial";

// Classes de caracteres para casar letras COM ou SEM acento (busca "Jose"
// destaca "José" e vice-versa)
const CLASSES_ACENTO = {
  a: "[aáàâãä]", e: "[eéèêë]", i: "[iíìîï]", o: "[oóòôõö]", u: "[uúùûü]", c: "[cç]", n: "[nñ]",
};
const PREPOSICOES_NOME = ["de", "da", "do", "dos", "das", "e"];

function semAcento(str) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function caractereTolerante(ch) {
  const baixo = semAcento(ch.toLowerCase());
  if (CLASSES_ACENTO[baixo]) return CLASSES_ACENTO[baixo];
  return baixo.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
}

/**
 * Monta um padrao de regex tolerante para um termo de busca:
 * - ignora acentos e caixa;
 * - aceita espacos/pontos variados entre as palavras;
 * - aceita nomes do meio ABREVIADOS no documento (ex: busca "Thiago Fernando
 *   do Amaral Alves dos Santos" destaca "Thiago F. do A.A. dos Santos").
 */
function padraoTermoTolerante(termo) {
  const tokens = termo.trim().split(/\s+/).map((t) => t.replace(/\.+$/, "")).filter(Boolean);
  if (tokens.length === 0) return null;
  return tokens
    .map((tok) => {
      const corpo = tok.split("").map(caractereTolerante).join("");
      const ehPreposicao = PREPOSICOES_NOME.includes(semAcento(tok.toLowerCase()));
      if (tok.length > 3 && !ehPreposicao) {
        // Palavra "cheia" do nome: aceita tambem so a inicial com ponto opcional
        return `(?:${corpo}|${caractereTolerante(tok[0])}\\.?)`;
      }
      return corpo;
    })
    .join("[\\s.]+");
}

function destacarTexto(texto, termos) {
  if (!texto || !termos || termos.length === 0) return texto;
  try {
    const padroes = termos.filter(Boolean).map(padraoTermoTolerante).filter(Boolean);
    if (padroes.length === 0) return texto;
    const nucleo = padroes.join("|");
    // Lookarounds impedem casar no MEIO de outra palavra (ex: "m" de "com")
    const regex = new RegExp(`(?<![\\p{L}\\p{N}])(${nucleo})(?![\\p{L}\\p{N}])`, "giu");
    const teste = new RegExp(`^(?:${nucleo})$`, "iu");
    const partes = texto.split(regex);
    return partes.map((parte, i) =>
      parte && teste.test(parte)
        ? <mark key={i} className="highlight-nome">{parte}</mark>
        : parte
    );
  } catch {
    // Qualquer termo problematico: mostra o texto sem destaque, nunca quebra o card
    return texto;
  }
}

export function ResultCard({ item, termosBusca = [] }) {
  const [expandido, setExpandido] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const isHistorico = item.fonte === "historico";
  const dataFormatada = formatarDataDocumento(item);
  const nomePrincipal = termosBusca.length > 0 ? termosBusca[0] : "";
  const linkOriginal = montarLinkOficial(item, nomePrincipal);

  const copiarNome = async () => {
    if (!nomePrincipal) return;
    try {
      await navigator.clipboard.writeText(nomePrincipal);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar nome:", err);
    }
  };

  const trechoCompleto = item.trecho || "Trecho não disponível";
  const trechoCurto = trechoCompleto.length > 200 ? trechoCompleto.substring(0, 200) + "..." : trechoCompleto;

  return (
    <div className="result-card" data-color={item.color || "neutro"}>
      <div className="card-header">
        <span className="card-title">{destacarTexto(item.titulo || "Publicação Oficial", termosBusca)}</span>
        <span className="card-date">{dataFormatada}</span>
      </div>

      {item.hierarquia && (
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem", lineHeight: "1.4", fontStyle: "italic" }}>
          📂 {item.hierarquia}
        </div>
      )}

      <div className="card-excerpt" style={{ whiteSpace: "pre-wrap" }}>
        {expandido ? destacarTexto(trechoCompleto, termosBusca) : destacarTexto(trechoCurto, termosBusca)}
      </div>

      {trechoCompleto.length > 200 && (
        <button onClick={() => setExpandido(!expandido)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0", marginBottom: "0.75rem", fontWeight: "500" }}>
          {expandido ? (<><ChevronUp size={14} /> Recolher</>) : (<><ChevronDown size={14} /> Ver trecho completo</>)}
        </button>
      )}

      {isHistorico && nomePrincipal && (
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", background: "var(--bg-card)", border: "1px dashed var(--border-color)", borderRadius: "8px", padding: "0.5rem 0.7rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
          <span>📄 Este link abre um PDF. O destaque automático não funciona em PDFs — copie o nome e use <strong>Ctrl+F</strong> dentro do arquivo para localizá-lo rápido.</span>
          <button onClick={copiarNome} style={{ background: copiado ? "var(--primary)" : "transparent", color: copiado ? "#fff" : "var(--primary)", border: "1px solid var(--primary)", borderRadius: "6px", padding: "0.25rem 0.6rem", cursor: "pointer", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap" }}>
            {copiado ? (<><Check size={13} /> Copiado!</>) : (<><Copy size={13} /> Copiar nome</>)}
          </button>
        </div>
      )}

      <div className="card-footer">
        <span className={"badge-fonte " + (isHistorico ? "historico" : "")}>
          {isHistorico ? "📜 Arquivo Histórico" : "📄 Diário Oficial Atual"}
        </span>
        {linkOriginal && (<a href={linkOriginal} target="_blank" rel="noopener noreferrer" className="link-original">Conferir no site oficial <ExternalLink size={14} /></a>)}
      </div>
    </div>
  );
}
