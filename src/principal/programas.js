'use strict';
/*
 * Os programas instaláveis: a versão para navegador (WebAssembly) dos Craft,
 * baixada dos lançamentos oficiais no GitHub e guardada em
 * <dados do aplicativo>/programas/<id>/. Cada programa roda numa janela da
 * área de trabalho, servido pelo endereço programa://<id>/ (uma origem por
 * programa, isolada da área de trabalho e dos outros programas).
 *
 * Na página de cada programa entra o adaptador (src/adaptador/adaptador.js),
 * que troca as caixas Abrir e Salvar do navegador pelas do disco.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { tr } = require('./idioma');
const yauzl = require('yauzl');

const CATALOGO = require('../../catalogo/programas.json');
const ADAPTADOR = path.join(__dirname, '..', 'adaptador', 'adaptador.js');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm', '.json': 'application/json', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.map': 'application/json',
};

// Procura versões novas no máximo a cada 6 horas (por programa).
const INTERVALO_BUSCA = 6 * 3600 * 1000;

/** Compara versões "0.10.2" e "0.9.0": positivo se a > b. */
function compararVersoes(a, b) {
  const pa = String(a || '').replace(/^v/, '').split(/[^0-9]+/).filter(Boolean).map(Number);
  const pb = String(b || '').replace(/^v/, '').split(/[^0-9]+/).filter(Boolean).map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

/** Uma promessa com tempo limite. */
function comLimite(promessa, ms) {
  let t;
  return Promise.race([promessa, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(tr('A internet demorou demais para responder.'))), ms); })]).finally(() => clearTimeout(t));
}

/** O último lançamento publicado de um repositório: { versao, pagina }. */
async function ultimoLancamento(buscar, repo) {
  try {
    const r = await buscar(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'RetroComputer' },
    });
    if (r.ok) {
      const j = await r.json();
      return { versao: String(j.tag_name || '').replace(/^v/, ''), pagina: j.html_url, ativos: j.assets || [] };
    }
  } catch { }
  const r = await buscar(`https://github.com/${repo}/releases/latest`, { redirect: 'manual' });
  const destino = r.headers.get('location') || '';
  const m = destino.match(/\/tag\/v?([\w.-]+)$/);
  if (!m) throw new Error(tr('Nenhuma versão publicada foi encontrada.'));
  return { versao: m[1], pagina: destino, ativos: [] };
}

function mimeDe(arquivo) {
  return MIME[path.extname(arquivo).toLowerCase()] || 'application/octet-stream';
}

/** Extrai um .zip para uma pasta, sem deixar nenhum arquivo sair dela. */
function extrairZip(arquivoZip, destino) {
  return new Promise((resolve, reject) => {
    yauzl.open(arquivoZip, { lazyEntries: true }, (erro, zip) => {
      if (erro) return reject(erro);
      zip.on('error', reject);
      zip.on('end', resolve);
      zip.on('entry', (entrada) => {
        const alvo = path.resolve(destino, entrada.fileName);
        if (alvo !== destino && !alvo.startsWith(destino + path.sep)) {
          zip.close();
          return reject(new Error(tr('Arquivo suspeito no pacote: {nome}', { nome: entrada.fileName })));
        }
        if (/\/$/.test(entrada.fileName)) {
          fs.mkdir(alvo, { recursive: true }, (e) => (e ? reject(e) : zip.readEntry()));
          return;
        }
        fs.mkdir(path.dirname(alvo), { recursive: true }, (e) => {
          if (e) return reject(e);
          zip.openReadStream(entrada, (e2, leitura) => {
            if (e2) return reject(e2);
            const escrita = fs.createWriteStream(alvo);
            leitura.on('error', reject);
            escrita.on('error', reject);
            escrita.on('close', () => zip.readEntry());
            leitura.pipe(escrita);
          });
        });
      });
      zip.readEntry();
    });
  });
}

/** A pasta (dentro da extraída) que tem o index.html. */
async function acharRaizSite(pasta, profundidade = 0) {
  if (fs.existsSync(path.join(pasta, 'index.html'))) return pasta;
  if (profundidade > 2) return null;
  for (const e of await fsp.readdir(pasta, { withFileTypes: true })) {
    if (e.isDirectory()) {
      const r = await acharRaizSite(path.join(pasta, e.name), profundidade + 1);
      if (r) return r;
    }
  }
  return null;
}

class Programas {
  /**
   * @param {string} pasta  <dados do aplicativo>/programas
   * @param {(url: string, opcoes?: object) => Promise<Response>} buscar  fetch da rede (net.fetch no Electron)
   */
  constructor(pasta, buscar) {
    this.pasta = pasta;
    this.buscar = buscar;
    this.emAndamento = new Map();
  }

  catalogo() {
    return CATALOGO.programas.map((p) => ({ ...p, instalado: this.instalado(p.id) }));
  }

  doCatalogo(id) {
    return CATALOGO.programas.find((p) => p.id === id) || null;
  }

  instalado(id) {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.pasta, id, 'programa.json'), 'utf8'));
    } catch {
      return null;
    }
  }

  instalados() {
    let ids = [];
    try { ids = fs.readdirSync(this.pasta); } catch { }
    return ids.map((id) => this.instalado(id)).filter(Boolean);
  }

  /** A última versão publicada: pela API do GitHub ou, sem ela, pelo redirecionamento de /releases/latest. */
  async ultimaVersao(prog, { semReserva = false } = {}) {
    try {
      const r = await this.buscar(`https://api.github.com/repos/${prog.repo}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'RetroComputer' },
      });
      if (r.ok) {
        const j = await r.json();
        const re = new RegExp(`^${prog.id}-web-.*\\.zip$`);
        const ativo = (j.assets || []).find((a) => re.test(a.name));
        if (ativo) return { versao: String(j.tag_name || '').replace(/^v/, ''), url: ativo.browser_download_url, tamanho: ativo.size };
      }
    } catch { }
    try {
      const r = await this.buscar(`https://github.com/${prog.repo}/releases/latest`, { redirect: 'manual' });
      const destino = r.headers.get('location') || '';
      const m = destino.match(/\/tag\/v?([\w.-]+)$/);
      if (m) return { versao: m[1], url: `https://github.com/${prog.repo}/releases/download/v${m[1]}/${prog.id}-web-${m[1]}.zip` };
    } catch { }
    if (prog.versaoConhecida && !semReserva) {
      const v = prog.versaoConhecida;
      return { versao: v, url: `https://github.com/${prog.repo}/releases/download/v${v}/${prog.id}-web-${v}.zip` };
    }
    throw new Error(tr('Não foi possível descobrir a versão mais recente.'));
  }

  /**
   * Baixa e instala (ou atualiza) um programa do catálogo.
   * Com { atualizar: true }, só instala uma versão maior que a instalada (nunca volta atrás nem
   * usa a versão conhecida do catálogo quando a internet não responde).
   */
  async instalar(id, aoProgresso = () => { }, { atualizar = false } = {}) {
    const prog = this.doCatalogo(id);
    if (!prog) throw new Error(tr('Programa desconhecido: {id}', { id }));
    if (this.emAndamento.has(id)) return this.emAndamento.get(id);
    const tarefa = (async () => {
      aoProgresso({ etapa: 'versao' });
      const { versao, url, tamanho } = await this.ultimaVersao(prog, { semReserva: atualizar });
      const inst = this.instalado(id);
      if (atualizar && inst && inst.versao !== 'local' && compararVersoes(versao, inst.versao) <= 0) {
        const e = new Error(tr('O {programa} já está na versão mais recente ({versao}).', { programa: prog.nome, versao: inst.versao }));
        e.codigo = 'sem-novidade';
        throw e;
      }
      aoProgresso({ etapa: 'baixando', versao, recebido: 0, total: tamanho || 0 });
      const resp = await this.buscar(url);
      if (!resp.ok) throw new Error(tr('O download falhou (HTTP {codigo}).', { codigo: resp.status }));
      const total = Number(resp.headers.get('content-length')) || tamanho || 0;
      await fsp.mkdir(this.pasta, { recursive: true });
      const tmpZip = path.join(this.pasta, `.${id}-${versao}.zip.part`);
      const escrita = fs.createWriteStream(tmpZip);
      let recebido = 0;
      let ultimo = 0;
      const leitor = resp.body.getReader();
      for (; ;) {
        const { done, value } = await leitor.read();
        if (done) break;
        recebido += value.length;
        if (!escrita.write(Buffer.from(value))) await new Promise((r) => escrita.once('drain', r));
        if (Date.now() - ultimo > 120) {
          ultimo = Date.now();
          aoProgresso({ etapa: 'baixando', versao, recebido, total });
        }
      }
      await new Promise((r, j) => escrita.end((e) => (e ? j(e) : r())));
      aoProgresso({ etapa: 'instalando', versao });
      const info = await this.instalarZip(tmpZip, { id, versao, origem: url });
      await fsp.rm(tmpZip, { force: true });
      aoProgresso({ etapa: 'pronto', versao });
      return info;
    })();
    this.emAndamento.set(id, tarefa);
    try {
      return await tarefa;
    } finally {
      this.emAndamento.delete(id);
    }
  }

  /** Instala a partir de um .zip já baixado (o mesmo pacote dos lançamentos oficiais). */
  async instalarZip(arquivoZip, { id, versao, origem } = {}) {
    const nomeZip = path.basename(arquivoZip).replace(/\.part$/, '');
    const m = nomeZip.replace(/^\./, '').match(/^([a-z0-9]+)-web-([\w.-]+?)\.zip$/i);
    id = (id || (m && m[1]) || '').toLowerCase();
    versao = versao || (m && m[2]) || 'local';
    if (!/^[a-z0-9-]{2,40}$/.test(id)) throw new Error(tr('Não reconheci o programa pelo nome do arquivo (esperado: nome-web-versão.zip).'));
    const tmp = path.join(this.pasta, `.${id}-extraindo-${Date.now()}`);
    await fsp.mkdir(tmp, { recursive: true });
    try {
      await extrairZip(arquivoZip, tmp);
      const raiz = await acharRaizSite(tmp);
      if (!raiz) throw new Error(tr('O pacote não tem um index.html.'));
      const destino = path.join(this.pasta, id);
      const antigo = path.join(this.pasta, `.${id}-antigo-${Date.now()}`);
      if (fs.existsSync(destino)) await fsp.rename(destino, antigo);
      await fsp.rename(raiz, destino);
      const prog = this.doCatalogo(id);
      const info = {
        id,
        nome: prog ? prog.nome : id,
        versao,
        origem: origem || 'arquivo local',
        instaladoEm: Date.now(),
        icone: prog ? prog.icone : 'programa',
        tipos: prog ? prog.tipos : [],
      };
      await fsp.writeFile(path.join(destino, 'programa.json'), JSON.stringify(info, null, 1));
      await fsp.rm(antigo, { recursive: true, force: true });
      return info;
    } finally {
      await fsp.rm(tmp, { recursive: true, force: true });
    }
  }

  /* ---------- Atualizações ---------- */

  lerBuscas() {
    try { return JSON.parse(fs.readFileSync(path.join(this.pasta, 'atualizacoes.json'), 'utf8')); } catch { return {}; }
  }

  gravarBuscas(b) {
    try {
      fs.mkdirSync(this.pasta, { recursive: true });
      fs.writeFileSync(path.join(this.pasta, 'atualizacoes.json'), JSON.stringify(b, null, 1));
    } catch { }
  }

  /**
   * Procura a versão nova de um programa instalado.
   * @returns {Promise<{id, atual, nova, temAtualizacao, verificadoEm}>}
   */
  async verificar(id, { forcar = false, limite = 8000 } = {}) {
    const inst = this.instalado(id);
    const prog = this.doCatalogo(id);
    if (!inst || !prog) return { id, temAtualizacao: false };
    // O que veio de um .zip escolhido pelo usuário não é trocado sozinho.
    if (inst.versao === 'local') return { id, atual: inst.versao, temAtualizacao: false };
    const buscas = this.lerBuscas();
    let b = buscas[id];
    if (forcar || !b || Date.now() - b.verificadoEm > INTERVALO_BUSCA) {
      const ult = await comLimite(this.ultimaVersao(prog, { semReserva: true }), limite);
      b = { verificadoEm: Date.now(), versao: ult.versao };
      buscas[id] = b;
      this.gravarBuscas(buscas);
    }
    return { id, atual: inst.versao, nova: b.versao, temAtualizacao: compararVersoes(b.versao, inst.versao) > 0, verificadoEm: b.verificadoEm };
  }

  /** Procura as versões novas de todos os programas instalados (os que falharem ficam de fora). */
  async verificarTodos(o = {}) {
    const r = await Promise.allSettled(this.instalados().map((p) => this.verificar(p.id, o)));
    return r.filter((x) => x.status === 'fulfilled').map((x) => x.value);
  }

  async remover(id) {
    if (!/^[a-z0-9-]{2,40}$/.test(id)) throw new Error(tr('Programa inválido.'));
    await fsp.rm(path.join(this.pasta, id), { recursive: true, force: true });
  }

  /** Responde a programa://<id>/<caminho>. */
  async servir(pedido) {
    const url = new URL(pedido.url);
    const id = url.hostname;
    const base = path.join(this.pasta, id);
    let rel = decodeURIComponent(url.pathname);
    const cabecalhos = {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    };
    if (rel === '/__retro/adaptador.js') {
      return new Response(await fsp.readFile(ADAPTADOR), { headers: { ...cabecalhos, 'Content-Type': mimeDe(ADAPTADOR) } });
    }
    if (rel === '/' || rel === '') rel = '/index.html';
    const arquivo = path.resolve(base, '.' + rel);
    if (!arquivo.startsWith(base + path.sep) || !fs.existsSync(arquivo) || path.basename(arquivo) === 'programa.json') {
      return new Response('404', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    if (path.basename(arquivo) === 'index.html' && path.dirname(arquivo) === base) {
      // O adaptador entra antes de qualquer outro script da página.
      let html = await fsp.readFile(arquivo, 'utf8');
      const tag = '<script src="./__retro/adaptador.js"></script>';
      html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (h) => `${h}\n${tag}`) : tag + html;
      return new Response(html, { headers: { ...cabecalhos, 'Content-Type': 'text/html; charset=utf-8' } });
    }
    const corpo = await fsp.readFile(arquivo);
    return new Response(corpo, { headers: { ...cabecalhos, 'Content-Type': mimeDe(arquivo), 'Cache-Control': 'public, max-age=31536000, immutable' } });
  }
}

module.exports = { Programas, extrairZip, mimeDe, CATALOGO, compararVersoes, ultimoLancamento, comLimite };
