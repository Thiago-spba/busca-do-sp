// Frases de animo/reflexao exibidas no cartao de saudacao da tela inicial.
// Separadas por periodo do dia porque o tom muda: manha (energia para comecar),
// tarde (persistencia), noite (reflexao/descanso).

export const FRASES = {
  manha: [
    "Cada pequeno passo de hoje constrói o resultado de amanhã.",
    "Um novo dia é uma nova chance de fazer a diferença.",
    "Comece com calma — o que importa é continuar em movimento.",
    "Seu trabalho de hoje planta a colheita de amanhã.",
    "Respire fundo e comece: você já superou dias mais difíceis que este.",
    "A dedicação de cada dia é o que forma uma trajetória.",
    "Que hoje seja mais leve do que ontem.",
    "O esforço constante vale mais que a pressa.",
    "Um dia de cada vez já é o suficiente.",
    "Você não precisa ser perfeito, só precisa continuar tentando.",
  ],
  tarde: [
    "Já é meio-dia percorrido — respire, você está indo bem.",
    "Nem todo progresso é visível, mas ele existe.",
    "Persistência é o que separa o cansaço da conquista.",
    "Um pouco de paciência agora poupa muita ansiedade depois.",
    "Cada tarefa concluída é uma vitória silenciosa.",
    "Contratempos fazem parte — o que conta é seguir adiante.",
    "Seu esforço de hoje é invisível até o dia em que ele aparece.",
    "Tudo o que é importante exige tempo — inclusive você.",
    "Trabalho bem feito não pede pressa, pede constância.",
    "Ainda dá tempo de fazer deste um bom dia.",
  ],
  noite: [
    "Descanse — amanhã o trabalho continua, mas agora é hora de recarregar.",
    "Nem tudo precisa ser resolvido hoje.",
    "Reconheça o que você conseguiu, por menor que pareça.",
    "Paciência com o processo, confiança no resultado.",
    "O dia foi o que foi — amanhã é uma página em branco.",
    "Você fez sua parte. Agora é hora de descansar.",
    "As coisas boas costumam levar tempo — inclusive as respostas que você espera.",
    "Um bom fim de dia começa com reconhecer o esforço que você já fez.",
    "Nem todo dia precisa ser produtivo para ter valido a pena.",
    "Durma tranquilo: você fez o possível com o que tinha hoje.",
  ],
};

/**
 * Escolhe a frase do dia de forma deterministica (baseada no dia do ano),
 * para que a mesma frase apareca o dia inteiro e mude no dia seguinte.
 */
export function fraseDoDia(periodo) {
  const lista = FRASES[periodo] || FRASES.manha;
  const hoje = new Date();
  const inicioAno = new Date(hoje.getFullYear(), 0, 0);
  const diaDoAno = Math.floor((hoje - inicioAno) / 86400000);
  return lista[diaDoAno % lista.length];
}
