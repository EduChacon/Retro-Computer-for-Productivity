/*
 * O Acesso rápido do Explorador: as pastas fixadas (botão direito numa pasta › Fixar no Acesso
 * rápido), guardadas na configuração, na ordem em que foram fixadas. Sem nada escolhido ainda,
 * valem a Área de trabalho e Meus documentos, como no Windows.
 */
import { estado, definirConfig, pastaDocs, pastaMesa } from './sistema.js';

/** As pastas fixadas (caminhos internos). */
export function fixadas() {
  const c = estado.config && estado.config.explorador;
  return c && Array.isArray(c.fixadas) ? c.fixadas : [pastaMesa(), pastaDocs()];
}

export const ehFixada = (rel) => fixadas().includes(rel);

/** Fixa ou desafixa uma pasta; as janelas do Explorador acompanham (o evento "retro-acesso"). */
export async function alternarFixada(rel) {
  const lista = ehFixada(rel) ? fixadas().filter((r) => r !== rel) : [...fixadas(), rel];
  await definirConfig({ explorador: { fixadas: lista } });
  document.dispatchEvent(new CustomEvent('retro-acesso'));
}

/** Uma pasta renomeada ou movida: a fixada (ou as de dentro dela) segue o caminho novo. */
export function seguirPasta(de, para) {
  const lista = fixadas();
  const nova = lista.map((r) => (r === de ? para : r.startsWith(de + '/') ? para + r.slice(de.length) : r));
  if (nova.every((r, i) => r === lista[i])) return;
  definirConfig({ explorador: { fixadas: nova } }).then(() => document.dispatchEvent(new CustomEvent('retro-acesso'))).catch(() => { });
}
