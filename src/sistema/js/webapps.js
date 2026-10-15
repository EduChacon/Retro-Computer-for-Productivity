/*
 * Os sites instalados como programas ("web apps"): o Navegador › Arquivo › Instalar como
 * programa guarda o nome, o endereço e o ícone do site; o programa abre numa janela só com a
 * página (sem a barra de endereço), com o mesmo login do Navegador, e aparece no menu Iniciar,
 * na área de trabalho e na barra de tarefas como os outros. A chave é 'webapp:<id>'.
 */
import { h, img } from './util.js';
import { Janela, comPrograma } from './janelas.js';
import { estado, definirConfig, avisar } from './sistema.js';
import { ajustarAoConteudo, confirmar } from './dialogos.js';
import { tr } from './idioma.js';

export const webapps = () => estado.config.webapps || [];
export const webappDe = (id) => webapps().find((w) => w.id === id) || null;
export const chaveWebapp = (id) => 'webapp:' + id;

/** O que a página informa para instalar: os ícones, o manifesto, o título e o nome do site. */
const COLETAR = `(() => {
  const icones = [];
  for (const l of document.querySelectorAll('link[rel]')) {
    const rel = String(l.rel || '').toLowerCase();
    if (/icon/.test(rel)) icones.push({ href: l.href, sizes: String(l.sizes || ''), tipo: l.type || '', rel });
  }
  const m = document.querySelector('link[rel="manifest"]');
  const meta = (s) => { const e = document.querySelector(s); return e ? e.content : ''; };
  return { icones, manifesto: m ? m.href : null, titulo: document.title, nomeApp: meta('meta[name="application-name"]') || meta('meta[property="og:site_name"]') };
})()`;

/** O maior lado de "192x192 512x512" (0 se não diz; "any" conta como grande). */
function maiorTamanho(sizes) {
  if (/any/i.test(sizes || '')) return 512;
  return Math.max(0, ...String(sizes || '').split(/\s+/).map((s) => Number((/^(\d+)x\d+$/i.exec(s) || [])[1]) || 0));
}

/**
 * Os candidatos a ícone, do melhor para o pior: os do manifesto e da página, preferindo os
 * de pelo menos 48 pontos (encolher fica nítido) e, entre eles, o menor; depois os maiores.
 */
export function ordenarIcones(lista) {
  const nota = (c) => {
    const t = c.tamanho || 0;
    if (t >= 48) return 10000 - t;          // 48 ou mais: o menor deles primeiro
    if (t) return 1000 + t;                  // menores que 48: o maior deles
    return /apple-touch/.test(c.rel || '') ? 5000 : 500; // sem tamanho
  };
  return lista.slice().sort((a, b) => nota(b) - nota(a));
}

/** Desenha o ícone (qualquer formato que o Chromium leia) em 32×32 e devolve o PNG em data:. */
function paraPng32(dataUrl) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 32;
        c.height = 32;
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        const esc = Math.min(32 / im.naturalWidth, 32 / im.naturalHeight) || 1;
        const w = Math.round(im.naturalWidth * esc);
        const a = Math.round(im.naturalHeight * esc);
        g.drawImage(im, Math.round((32 - w) / 2), Math.round((32 - a) / 2), w, a);
        resolve(c.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    im.onerror = () => resolve(null);
    im.src = dataUrl;
  });
}

/** Descobre o nome, o endereço de início e o ícone do site aberto na página (webview). */
export async function descobrirSite(wv, urlAtual) {
  let info = { icones: [], manifesto: null, titulo: '', nomeApp: '' };
  try { info = await wv.executeJavaScript(COLETAR); } catch { }
  const candidatos = info.icones.map((i) => ({ href: i.href, tamanho: maiorTamanho(i.sizes), rel: i.rel }));
  let nome = info.nomeApp || info.titulo || new URL(urlAtual).hostname;
  let url = urlAtual;
  if (info.manifesto) {
    try {
      const m = await retro.navegador.manifesto(info.manifesto);
      if (m.short_name || m.name) nome = m.short_name || m.name;
      if (m.start_url) {
        const inicio = new URL(m.start_url, info.manifesto);
        if (inicio.origin === new URL(urlAtual).origin) url = inicio.href;
      }
      for (const i of m.icons || []) {
        if (/monochrome/.test(i.purpose || '')) continue;
        candidatos.push({ href: new URL(i.src, info.manifesto).href, tamanho: maiorTamanho(i.sizes), rel: 'manifesto' });
      }
    } catch { }
  }
  candidatos.push({ href: new URL('/favicon.ico', urlAtual).href, tamanho: 0, rel: 'icon' });
  let icone = null;
  const vistos = new Set();
  for (const c of ordenarIcones(candidatos)) {
    if (vistos.has(c.href)) continue;
    vistos.add(c.href);
    try {
      const r = await retro.navegador.baixarIcone(c.href);
      icone = await paraPng32(r.dados);
      if (icone) break;
    } catch { }
  }
  return { nome: String(nome).trim().slice(0, 60), url, icone };
}

/** A caixa "Instalar como programa": o ícone, o nome e onde pôr o atalho. */
export function perguntarInstalacao(site) {
  return new Promise((resolve) => {
    let feito = false;
    const fim = (v) => { if (!feito) { feito = true; j.fechar(true); resolve(v); } };
    const j = new Janela({ titulo: tr('Instalar como programa'), icone: 'programas-caixa', dialogo: true, largura: 400, altura: 240, aoFechar: () => { if (!feito) { feito = true; resolve(null); } } });
    const nome = h('input', { type: 'text', value: site.nome, spellcheck: false, style: { flex: '1' } });
    const mesa = h('input', { type: 'checkbox', checked: true });
    const barra = h('input', { type: 'checkbox', checked: false });
    const ok = h('button.padrao', { on: { click: () => { if (nome.value.trim()) fim({ nome: nome.value.trim(), mesa: mesa.checked, barra: barra.checked }); } } }, tr('Instalar'));
    nome.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok.click(); });
    j.corpo.append(
      h('div.mensagem', site.icone ? h('img', { src: site.icone, width: 32, height: 32, alt: '' }) : img('internet', 32), h('div.webapp-campos',
        h('div.texto', tr('O site abre numa janela própria, só com a página, e aparece no menu Iniciar › Programas. O login é o mesmo do Navegador.')),
        h('label.linha', h('span', tr('Nome:')), nome),
        h('div.webapp-endereco', site.url),
        h('label', mesa, h('span', tr('Criar um atalho na área de trabalho'))),
        h('label', barra, h('span', tr('Fixar na barra de tarefas'))))),
      h('div.acoes', ok, h('button', { on: { click: () => fim(null) } }, tr('Cancelar'))));
    ajustarAoConteudo(j, { minLarg: 400 });
    nome.focus();
    nome.select();
  });
}

/** Guarda o programa novo e põe os atalhos escolhidos. */
export async function instalarWebapp(site, { mesa = true, barra = false } = {}) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const wa = { id, nome: site.nome, url: site.url, icone: site.icone || null };
  await definirConfig({ webapps: [...webapps(), wa] });
  const chave = chaveWebapp(id);
  if (mesa) await import('./mesa.js').then((m) => m.adicionarAtalho && m.adicionarAtalho(chave));
  if (barra) await import('./barra.js').then((m) => m.fixar(chave));
  avisar(tr('Programa instalado'), tr('{nome} está no menu Iniciar › Programas.', { nome: wa.nome }), { icone: wa.icone || 'programas-caixa', som: null });
  return wa;
}

/** Desinstala (os dados do site, como o login, ficam no Navegador). */
export async function removerWebapp(id) {
  const wa = webappDe(id);
  if (!wa) return false;
  const ok = await confirmar(tr('Desinstalar {nome}? O site continua no Navegador; só o programa sai do menu Iniciar, da área de trabalho e da barra de tarefas.', { nome: wa.nome }), { titulo: tr('Desinstalar') });
  if (!ok) return false;
  const chave = chaveWebapp(id);
  const c = estado.config;
  await definirConfig({
    webapps: webapps().filter((w) => w.id !== id),
    mesa: { atalhos: ((c.mesa && c.mesa.atalhos) || []).filter((k) => k !== chave) },
    barra: { fixados: ((c.barra && c.barra.fixados) || []).filter((k) => k !== chave) },
  });
  import('./mesa.js').then((m) => m.atualizar && m.atualizar()).catch(() => { });
  return true;
}

/** Abre o programa (uma janela do Navegador só com a página). */
export async function abrirWebapp(id) {
  const wa = webappDe(id);
  if (!wa) return null;
  const { abrirNavegador } = await import('./apps/navegador.js');
  // A janela é do programa (a barra de tarefas agrupa e fixa por ele), não do Navegador.
  return comPrograma(chaveWebapp(id), () => abrirNavegador({ url: wa.url, app: wa }));
}
