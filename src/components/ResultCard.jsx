import React, { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, Copy, Check, Lightbulb } from "lucide-react";
import { formatarDataDocumento, montarLinkOficial } from "../utils/linkOficial";
import { explicarPublicacaoAPI } from "../services/api";

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

function montarNucleoRegex(termos) {
  const padroes = (termos || []).filter(Boolean).map(padraoTermoTolerante).filter(Boolean);
  return padroes.length > 0 ? padroes.join("|") : null;
}

function destacarTexto(texto, termos) {
  if (!texto || !termos || termos.length === 0) return texto;
  try {
    const nucleo = montarNucleoRegex(termos);
    if (!nucleo) return texto;
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

/**
 * Recorta um trecho CURTO centralizado na primeira ocorrencia de qualquer
 * termo buscado, em vez de simplesmente pegar os primeiros N caracteres
 * (que podem nao conter o nome, se ele aparecer mais adiante no texto).
 * Se nenhum termo for encontrado (ex: trecho so bateu por outro motivo),
 * cai de volta para o inicio do texto.
 */
function extrairTrechoCentralizado(texto, termos, tamanho = 160) {
  if (!texto) return "";
  if (texto.length <= tamanho) return texto;

  let posicaoMatch = -1;
  try {
    const nucleo = montarNucleoRegex(termos);
    if (nucleo) {
      const regex = new RegExp(`(?<![\\p{L}\\p{N}])(?:${nucleo})(?![\\p{L}\\p{N}])`, "iu");
      const m = texto.match(regex);
      if (m) posicaoMatch = m.index;
    }
  } catch {
    posicaoMatch = -1;
  }

  if (posicaoMatch === -1) {
    return texto.substring(0, tamanho) + "...";
  }

  const margemAntes = Math.floor(tamanho * 0.35);
  let inicio = Math.max(0, posicaoMatch - margemAntes);
  let fim = Math.min(texto.length, inicio + tamanho);
  inicio = Math.max(0, fim - tamanho);

  let recorte = texto.substring(inicio, fim);
  if (inicio > 0) recorte = "..." + recorte;
  if (fim < texto.length) recorte = recorte + "...";
  return recorte;
}

export function ResultCard({ item, termosBusca = [] }) {
  const [expandido, setExpandido] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [explicacao, setExplicacao] = useState(null);
  const [carregandoExplicacao, setCarregandoExplicacao] = useState(false);
  const [erroExplicacao, setErroExplicacao] = useState(null);

  const handleExplicar = async () => {
    setCarregandoExplicacao(true);
    setErroExplicacao(null);
    const resultado = await explicarPublicacaoAPI(item);
    if (resultado.sucesso) {
      setExplicacao(resultado.texto);
    } else {
      setErroExplicacao(resultado.erro || "Não foi possível gerar a explicação.");
    }
    setCarregandoExplicacao(false);
  };

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
  // Recorte curto CENTRALIZADO no nome buscado (nao apenas os primeiros 200
  // caracteres, que podem nao conter o nome se ele aparecer mais adiante).
  const trechoCurto = extrairTrechoCentralizado(trechoCompleto, termosBusca, 160);
  const temMaisDetalhes = Boolean(item.hierarquia) || trechoCompleto !== trechoCurto || (isHistorico && nomePrincipal);

  return (
    <div className="result-card" data-color={item.color || "neutro"}>
      <div className="card-header">
        <span className="card-title">{destacarTexto(item.titulo || "Publicação Oficial", termosBusca)}</span>
        <span className="card-date">{dataFormatada}</span>
      </div>

      <div className="card-excerpt" style={{ whiteSpace: "pre-wrap" }}>
        {expandido ? destacarTexto(trechoCompleto, termosBusca) : destacarTexto(trechoCurto, termosBusca)}
      </div>

      {explicacao ? (
        <div style={{ background: "var(--chip-blue)", color: "var(--chip-blue-text)", borderRadius: "8px", padding: "0.75rem 0.9rem", fontSize: "0.85rem", lineHeight: "1.5", marginBottom: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
          <Lightbulb size={18} className="icone-lampada-ia" style={{ flexShrink: 0, marginTop: "0.1rem" }} />
          <span>{explicacao}</span>
        </div>
      ) : (
        <button onClick={handleExplicar} disabled={carregandoExplicacao} className="btn-explicar-ia">
          <Lightbulb size={20} className="icone-lampada-ia" />
          {carregandoExplicacao ? "Gerando explicação..." : "Explicar em linguagem simples"}
        </button>
      )}

      {erroExplicacao && (
        <div style={{ color: "var(--chip-red-text)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{erroExplicacao}</div>
      )}

      {temMaisDetalhes && (
        <button onClick={() => setExpandido(!expandido)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0", marginBottom: "0.75rem", fontWeight: "500" }}>
          {expandido ? (<><ChevronUp size={14} /> Ver menos</>) : (<><ChevronDown size={14} /> Ver mais detalhes</>)}
        </button>
      )}

      {expandido && item.hierarquia && (
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem", lineHeight: "1.4", fontStyle: "italic" }}>
          📂 {item.hierarquia}
        </div>
      )}

      {expandido && isHistorico && nomePrincipal && (
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
