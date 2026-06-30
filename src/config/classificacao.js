// Dicionário de classificação visual dos termos de busca pré-definidos
// Cada termo tem: rótulo de exibição, cor e ícone

export const TERMOS_PREDEFINIDOS = [
  { id: 'licenca_saude', label: 'Licença Saúde', cor: '#C62828', icone: '🏥' },
  { id: 'readaptacao', label: 'Readaptação', cor: '#EF6C00', icone: '♿' },
  { id: 'quinquenio', label: 'Quinquênio', cor: '#2E7D32', icone: '📈' },
  { id: 'licenca_premio', label: 'Licença Prêmio', cor: '#1565C0', icone: '🎖️' },
  { id: 'evolucao_funcional', label: 'Evolução Funcional', cor: '#6A1B9A', icone: '🪜' },
  { id: 'efetivo_exercicio', label: 'Efetivo Exercício', cor: '#616161', icone: '📌' },
];

// Classificação padrão para termos personalizados (não pré-definidos)
export const TERMO_PERSONALIZADO_PADRAO = {
  label: 'Publicação Oficial',
  cor: '#455A64',
  icone: '📄',
};

// Identifica qual classificação visual usar para um termo de busca,
// comparando com a lista de termos pré-definidos (ignorando maiúsculas/acentos simples)
export function classificarTermo(termoBuscado) {
  const encontrado = TERMOS_PREDEFINIDOS.find(
    (t) => t.label.toLowerCase() === termoBuscado.toLowerCase()
  );
  return encontrado || { ...TERMO_PERSONALIZADO_PADRAO, label: termoBuscado };
}

// Rótulos de origem da publicação (qual acervo do Diário Oficial)
export const FONTES = {
  ATUAL: { label: 'Diário Oficial Atual', cor: '#2E7D32' },
  HISTORICO: { label: 'Arquivo Histórico', cor: '#F9A825' },
};