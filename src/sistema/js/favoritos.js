/*
 * A lista dos favoritos do Navegador, sem a tela (testada no Node): os favoritos { nome, url,
 * icone } e as pastas { nome, pasta: true, itens: [...] }, de um nível só, como as pastas da barra
 * de Links da época. O lugar de um favorito é [i] na barra ou [i, j] dentro da pasta i. Todas as
 * funções devolvem uma lista nova (a de antes não muda).
 */

export const ehPasta = (f) => !!(f && f.pasta);
export const itensDe = (p) => (ehPasta(p) && Array.isArray(p.itens) ? p.itens : []);

/** Todos os favoritos (os da barra e os de dentro das pastas), cada um com o lugar dele. */
export function todosFavoritos(lista) {
  const r = [];
  (lista || []).forEach((f, i) => {
    if (ehPasta(f)) itensDe(f).forEach((g, j) => r.push({ f: g, c: [i, j] }));
    else if (f) r.push({ f, c: [i] });
  });
  return r;
}

/** O favorito (ou a pasta) do lugar c. */
export function favoritoEm(lista, c) {
  if (!Array.isArray(c) || !lista) return undefined;
  return c.length === 1 ? lista[c[0]] : itensDe(lista[c[0]])[c[1]];
}

/** O lugar do primeiro favorito com este endereço, ou null. */
export function lugarDe(lista, url) {
  const achado = url ? todosFavoritos(lista).find((x) => x.f.url === url) : null;
  return achado ? achado.c : null;
}

/** A lista sem o item do lugar c. */
export function semFavorito(lista, c) {
  if (c.length === 1) return lista.filter((_, k) => k !== c[0]);
  return lista.map((p, k) => (k === c[0] ? { ...p, itens: itensDe(p).filter((_, m) => m !== c[1]) } : p));
}

/** A lista com o item do lugar c trocado por fn(item). */
export function comFavorito(lista, c, fn) {
  if (c.length === 1) return lista.map((f, k) => (k === c[0] ? fn(f) : f));
  return lista.map((p, k) => (k === c[0] ? { ...p, itens: itensDe(p).map((g, m) => (m === c[1] ? fn(g) : g)) } : p));
}

/**
 * Leva o favorito do lugar c para o fim da pasta p (o índice dela na barra) ou, com p null, para o
 * fim da barra. Uma pasta não entra em outra; o que já está no lugar fica como está.
 */
export function moverFavorito(lista, c, p) {
  const f = favoritoEm(lista, c);
  const pasta = p != null ? lista[p] : null;
  if (!f || (p != null && (!ehPasta(pasta) || ehPasta(f)))) return lista;
  if ((p == null && c.length === 1) || (p != null && c.length === 2 && c[0] === p)) return lista;
  const sem = semFavorito(lista, c);
  if (p == null) return [...sem, f];
  return sem.map((x) => (x === pasta ? { ...x, itens: [...itensDe(x), f] } : x));
}

/** Uma pasta nova (vazia) no fim da barra. */
export const comPasta = (lista, nome) => [...lista, { nome, pasta: true, itens: [] }];

/** Tira a pasta i; os favoritos dela ficam na barra, no lugar dela (nada se perde). */
export function semPasta(lista, i) {
  if (!ehPasta(lista[i])) return lista;
  return [...lista.slice(0, i), ...itensDe(lista[i]), ...lista.slice(i + 1)];
}

/**
 * A ordem nova pelos índices das peças à vista; os que faltam (os do », por não caberem) ficam no
 * fim, na ordem deles. Índices repetidos ou de fora são ignorados.
 */
export function reordenada(itens, ordem) {
  const vistos = [...new Set(ordem.filter((i) => Number.isInteger(i) && i >= 0 && i < itens.length))];
  return [...vistos, ...itens.map((_, i) => i).filter((i) => !vistos.includes(i))].map((i) => itens[i]);
}

/** A mesma reordenação dentro da pasta p. */
export const reordenadaNaPasta = (lista, p, ordem) =>
  lista.map((x, k) => (k === p && ehPasta(x) ? { ...x, itens: reordenada(itensDe(x), ordem) } : x));

/** Guarda o ícone do site em todos os favoritos dele que ainda não têm um (também nas pastas). */
export function comIcone(lista, mesmoSite, icone) {
  const completar = (f) => (!f.icone && mesmoSite(f.url) ? { ...f, icone } : f);
  return lista.map((f) => (ehPasta(f) ? { ...f, itens: itensDe(f).map(completar) } : completar(f)));
}
