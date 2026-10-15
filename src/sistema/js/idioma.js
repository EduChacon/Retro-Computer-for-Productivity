/*
 * Os idiomas da área de trabalho. O texto em português é a própria chave:
 * tr('Meu computador') devolve "Meu computador" em português e a tradução
 * de idiomas/en.json ou idiomas/es.json nos outros. As variáveis vão entre
 * chaves: tr('Excluir {nome}?', { nome }).
 *
 * O teste testes/idiomas.test.js confere que toda chave usada tem tradução.
 */
export const IDIOMAS = [
  { cod: 'pt-BR', nome: 'Português (Brasil)', local: 'pt-BR' },
  { cod: 'en', nome: 'English', local: 'en-US' },
  { cod: 'es', nome: 'Español', local: 'es' },
];

let atual = 'pt-BR';
let catalogo = {};

export async function carregarIdioma(cod) {
  atual = IDIOMAS.some((i) => i.cod === cod) ? cod : 'pt-BR';
  catalogo = {};
  if (atual !== 'pt-BR') {
    try {
      catalogo = await (await fetch(`idiomas/${atual}.json`)).json();
    } catch (e) {
      console.error('idioma', e);
    }
  }
  document.documentElement.lang = atual;
  return atual;
}

/** Traduz um texto (a chave é o texto em português). */
export function tr(texto, vars) {
  let s = atual === 'pt-BR' ? texto : (catalogo[texto] || texto);
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}

/** Marca um texto para tradução sem traduzir agora (tabelas montadas antes de o idioma carregar). */
export const marcar = (texto) => texto;

export function idiomaAtual() {
  return atual;
}

/** A localidade para datas e números (pt-BR, en-US, es). */
export function localidade() {
  return (IDIOMAS.find((i) => i.cod === atual) || IDIOMAS[0]).local;
}
