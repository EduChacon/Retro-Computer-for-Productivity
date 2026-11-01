/*
 * Os programas do computador principal: os nomes e os ícones guardados, e o
 * abrir (os de terminal abrem no Prompt de comando). Os escolhidos ficam em
 * config.nativos: { nomes: { id: nome }, menu: [ids] }.
 */
import { estado, abrir, definirConfig, avisar } from './sistema.js';
import { erro, entrada } from './dialogos.js';
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

export const integradoPorPadrao = (id) => (cfg().integrados || []).includes(id);
export const versaoWeb = (id) => (cfg().web || {})[id] || null;

export async function alternarIntegrado(id) {
  const lista = cfg().integrados || [];
  return definirConfig({ nativos: { integrados: lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id] } });
}

export async function configurarWeb(id) {
  const url = await entrada({ texto: tr('Endereço HTTPS da versão web deste programa. Ela abrirá dentro do Retro com a moldura completa.'), titulo: tr('Versão web no Retro'), valor: versaoWeb(id) || '' });
  if (url === null) return;
  if (!url.trim()) { await definirConfig({ nativos: { web: { [id]: null } } }); return; }
  let u; try { u = new URL(url.trim()); } catch { return erro(tr('Informe um endereço HTTPS válido, sem usuário ou senha.')); }
  if (u.protocol !== 'https:' || u.username || u.password) return erro(tr('Informe um endereço HTTPS válido, sem usuário ou senha.'));
  await definirConfig({ nativos: { web: { [id]: u.href }, integrados: [...new Set([...(cfg().integrados || []), id])] } });
  return u.href;
}

export async function abrirNativo(id, { modo } = {}) {
  try {
    if (!(cfg().nomes || {})[id]) { const a = (await retro.nativos.listar(false)).find((a) => a.id === id); if (a) await lembrarNome(id, a.nome); }
    if (modo === 'integrado' || (!modo && integradoPorPadrao(id))) {
      if (versaoWeb(id)) {
        const u = new URL(versaoWeb(id)); if (u.protocol !== 'https:' || u.username || u.password) throw new Error(tr('Informe um endereço HTTPS válido, sem usuário ou senha.'));
        const { abrirNavegador } = await import('./apps/navegador.js');
        const { comPrograma } = await import('./janelas.js');
        return comPrograma('nativo:' + id, () => abrirNavegador({ url: versaoWeb(id), app: { id: 'nativo:' + id, nome: nomeNativo(id), url: versaoWeb(id), icone: iconeNativoJa(id) } }));
      }
      const { abrirIntegrado } = await import('./apps/integracao.js'); return abrirIntegrado(id);
    }
    const r = await retro.nativos.abrir(id);
    if (r && r.terminal) return abrir('prompt', { comando: r.terminal, titulo: nomeNativo(id) });
    avisar(tr('Abrindo {programa}…', { programa: nomeNativo(id) }), tr('O programa abre numa janela do computador principal.'), { icone: 'programa', som: null, ms: 3500, guardar: false });
  } catch (e) {
    erro(tr('Não foi possível abrir o programa "{programa}": {erro}', { programa: nomeNativo(id), erro: e.message }));
  }
  return null;
}
