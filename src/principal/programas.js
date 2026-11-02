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
const crypto = require('node:crypto');
const { tr } = require('./idioma');
const yauzl = require('yauzl');

const CATALOGO = require('../../catalogo/programas.json');
const { CatalogoCraft } = require('./catalogo-craft');
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
// O maior download aceito (os pacotes dos Craft têm algumas dezenas de MB).
const MAX_DOWNLOAD = 1024 * 1024 * 1024;
// O nome de um programa: o do catálogo e o da pasta dele.
const ID_VALIDO = /^[a-z0-9-]{2,40}$/;

/** O endereço do download só pode ser o dos lançamentos do próprio repositório no GitHub. */
function downloadDoRepo(url, repo) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'github.com' && u.pathname.startsWith(`/${repo}/releases/download/`);
  } catch {
    return false;
  }
}

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

// Um programa da web não passa disto (contra um pacote que vira gigabytes ao extrair).
const PACOTE_MAX = 2 * 1024 * 1024 * 1024;
const PACOTE_ENTRADAS = 50000;

/** Extrai um .zip para uma pasta, sem deixar nenhum arquivo sair dela. */
function extrairZip(arquivoZip, destino, { max = PACOTE_MAX, entradas = PACOTE_ENTRADAS } = {}) {
  let soma = 0;
  let n = 0;
  return new Promise((resolve, reject) => {
    yauzl.open(arquivoZip, { lazyEntries: true }, (erro, zip) => {
      if (erro) return reject(erro);
      zip.on('error', reject);
      zip.on('end', resolve);
      zip.on('entry', (entrada) => {
        soma += entrada.uncompressedSize || 0;
        if (++n > entradas || soma > max) {
          zip.close();
          return reject(new Error(tr('O pacote é grande demais para um programa.')));
        }
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
    this.crafts = new CatalogoCraft(pasta, buscar);
  }

  catalogo() {
    return this.crafts.lista().map((p) => ({ ...p, instalado: this.instalado(p.id) }));
  }

  doCatalogo(id) {
    return this.crafts.lista().find((p) => p.id === id) || null;
  }

  atualizarCatalogo(o) { return this.crafts.atualizar({ forcar: o?.forcar === true }); }

  instalado(id) {
    if (!ID_VALIDO.test(String(id))) return null;
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
        // O resumo SHA-256 que o GitHub publica para cada arquivo do lançamento confere o download.
        const digest = /^sha256:[0-9a-f]{64}$/.test(String(ativo && ativo.digest || '')) ? ativo.digest.slice(7) : null;
        if (ativo && downloadDoRepo(ativo.browser_download_url, prog.repo)) return { versao: String(j.tag_name || '').replace(/^v/, ''), url: ativo.browser_download_url, tamanho: ativo.size, sha256: digest };
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
      const { versao, url, tamanho, sha256 } = await this.ultimaVersao(prog, { semReserva: atualizar });
      const inst = this.instalado(id);
      // O que veio de um .zip escolhido pelo usuário só é trocado por ele (Instalar, sem "atualizar").
      if (atualizar && inst && (inst.versao === 'local' || inst.origem === 'arquivo local')) {
        const e = new Error(tr('O {programa} foi instalado de um arquivo: ele só é trocado por outro arquivo ou pelo botão Instalar.', { programa: prog.nome }));
        e.codigo = 'sem-novidade';
        throw e;
      }
      if (atualizar && inst && compararVersoes(versao, inst.versao) <= 0) {
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
      const resumo = crypto.createHash('sha256');
      // Nunca mais que o tamanho anunciado pelo GitHub (ou o limite geral).
      const limite = Math.min(MAX_DOWNLOAD, tamanho ? tamanho + 1024 : MAX_DOWNLOAD);
      for (; ;) {
        const { done, value } = await leitor.read();
        if (done) break;
        recebido += value.length;
        if (recebido > limite) {
          await leitor.cancel().catch(() => { });
          await new Promise((r) => escrita.end(r));
          await fsp.rm(tmpZip, { force: true });
          throw new Error(tr('O download é maior que o esperado e foi interrompido.'));
        }
        resumo.update(value);
        if (!escrita.write(Buffer.from(value))) await new Promise((r) => escrita.once('drain', r));
        if (Date.now() - ultimo > 120) {
          ultimo = Date.now();
          aoProgresso({ etapa: 'baixando', versao, recebido, total });
        }
      }
      await new Promise((r, j) => escrita.end((e) => (e ? j(e) : r())));
      // O pacote baixado tem que ser o publicado: o resumo SHA-256 confere (quando o GitHub o informa).
      if (sha256 && resumo.digest('hex') !== sha256) {
        await fsp.rm(tmpZip, { force: true });
        throw new Error(tr('O pacote baixado não confere com o publicado no GitHub. Nada foi instalado.'));
      }
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
    if (!ID_VALIDO.test(id)) throw new Error(tr('Não reconheci o programa pelo nome do arquivo (esperado: nome-web-versão.zip).'));
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
    if (inst.versao === 'local' || inst.origem === 'arquivo local') return { id, atual: inst.versao, temAtualizacao: false };
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
    if (!ID_VALIDO.test(id)) throw new Error(tr('Programa inválido.'));
    await fsp.rm(path.join(this.pasta, id), { recursive: true, force: true });
  }

  /** Responde a programa://<id>/<caminho>. */
  async servir(pedido) {
    const url = new URL(pedido.url);
    const id = url.hostname;
    // Só o nome de um programa instalado: o Chromium entrega "programa://../x" com o host "..",
    // que levaria à pasta de dados (as configurações, a chave do Claude, os cookies).
    if (!ID_VALIDO.test(id) || !this.instalado(id)) {
      return new Response('404', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    const base = path.join(this.pasta, id);
    let rel = decodeURIComponent(url.pathname);
    const cabecalhos = {
      // Só o próprio programa lê as respostas (um programa não lê os arquivos de outro).
      'Access-Control-Allow-Origin': `programa://${id}`,
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
