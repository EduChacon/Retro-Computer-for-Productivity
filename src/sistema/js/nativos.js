/*
 * Os programas do computador principal: os nomes e os ícones guardados, e o
 * abrir (os de terminal abrem no Prompt de comando). Os escolhidos ficam em
 * config.nativos: { nomes: { id: nome }, menu: [ids] }.
 */
import { estado, abrir, definirConfig, avisar } from './sistema.js';
import { erro } from './dialogos.js';
import { tr } from './idioma.js';

const icones = new Map(); // id → data: URL (ou null)

const cfg = () => (estado.config && estado.config.nativos) || {};

export const nomeNativo = (id) => (cfg().nomes || {})[id] || id.replace(/^(win|mac):.*[\\/]/, '').replace(/\.(desktop|lnk|app)$/, '');
export const noMenu = () => cfg().menu || [];
export const iconeNativoJa = (id) => icones.get(id) || null;

export async function iconeNativo(id) {
  if (!icones.has(id)) icones.set(id, await retro.nativos.icone(id).catch(() => null));
  return icones.get(id);
}

/** Guarda o nome (para a área de trabalho e o menu mostrarem sem listar tudo de novo). */
export function lembrarNome(id, nome) {
  if ((cfg().nomes || {})[id] === nome) return Promise.resolve();
  return definirConfig({ nativos: { nomes: { [id]: nome } } });
}

export async function alternarNoMenu(id, nome) {
  const menu = noMenu();
  await lembrarNome(id, nome);
  await definirConfig({ nativos: { menu: menu.includes(id) ? menu.filter((x) => x !== id) : [...menu, id] } });
}

export async function abrirNativo(id) {
  try {
    const r = await retro.nativos.abrir(id);
    if (r && r.terminal) return abrir('prompt', { comando: r.terminal, titulo: nomeNativo(id) });
    avisar(tr('Abrindo {programa}…', { programa: nomeNativo(id) }), tr('O programa abre numa janela do computador principal.'), { icone: 'programa', som: null, ms: 3500, guardar: false });
  } catch (e) {
    erro(tr('Não foi possível abrir o programa "{programa}": {erro}', { programa: nomeNativo(id), erro: e.message }));
  }
  return null;
}
