'use strict';
/*
 * A loja dos programas do Linux: o Flathub (flathub.org) pelo Flatpak.
 *
 *   Pesquisar e ver: a interface pública do Flathub (api/v2), no idioma do Retro Computer.
 *   Instalar, atualizar e remover: o comando flatpak, só para o usuário (--user), sem
 *   senha de administrador. Os programas instalados aparecem sozinhos em "Programas do
 *   computador" (os .desktop do Flatpak já são lidos por aplicativos.js).
 *
 * Os ícones e as capturas vêm por aqui (como data: URL): a área de trabalho não carrega
 * imagens da internet.
 */
const { execFile, spawn } = require('node:child_process');

const API = 'https://flathub.org/api/v2';
const REMOTO = 'flathub';
const REPO = 'https://dl.flathub.org/repo/flathub.flatpakrepo';
// As categorias principais do Flathub, na ordem do menu.
const CATEGORIAS = ['office', 'network', 'graphics', 'audiovideo', 'education', 'game', 'development', 'utility', 'science', 'system'];

/** Só nomes de programa de verdade (org.exemplo.Programa): nada que o flatpak leia como opção. */
const idValido = (id) => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{2,254}$/.test(id);

const localeDe = (idioma) => ({ 'pt-BR': 'pt_BR', en: 'en', es: 'es' })[idioma] || 'en';

function rodar(cmd, args, { timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 8 << 20, env: { ...process.env, LC_ALL: 'C', LANG: 'C' } }, (erro, saida, serr) => {
      if (erro) {
        erro.saida = String(serr || saida || '').trim();
        return reject(erro);
      }
      resolve(String(saida));
    });
  });
}

/* ---------- Leitura (funções puras, testadas em testes/loja.test.js) ---------- */

/** flatpak list --app --columns=application,name,version,installation */
function lerInstalados(s) {
  return s.split('\n').map((l) => l.split('\t')).filter((c) => c[0] && idValido(c[0]))
    .map(([id, nome, versao, instalacao]) => ({ id, nome: nome || id, versao: versao || '', usuario: (instalacao || '').trim() === 'user' }));
}

/** O andamento do flatpak install/update: o passo ("2/3") e a porcentagem, se houver. */
function lerAndamento(texto) {
  const r = {};
  const passos = [...texto.matchAll(/(\d+)\/(\d+)/g)].pop();
  if (passos) { r.passo = Number(passos[1]); r.passos = Number(passos[2]); }
  const pct = [...texto.matchAll(/(\d{1,3})%/g)].pop();
  if (pct) r.pct = Math.min(100, Number(pct[1]));
  return r;
}

/** Um resultado da pesquisa do Flathub, só com o que a janela mostra. */
function resumo(hit) {
  return {
    id: hit.app_id,
    nome: hit.name || hit.app_id,
    resumo: hit.summary || '',
    icone: hit.icon || null,
    desenvolvedor: hit.developer_name || '',
    verificado: !!hit.verification_verified,
    livre: !!hit.is_free_license,
    instalacoes: Number(hit.installs_last_month) || 0,
  };
}

/** A descrição do AppStream (um HTML simples: <p>, <ul>, <li>) em parágrafos de texto. */
function textoDescricao(html) {
  if (!html) return [];
  return String(html)
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|ul|ol)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split(/\n{2,}/)
    // Dentro do parágrafo, as quebras do arquivo viram espaço; só os itens de lista ("•") começam linha nova.
    .map((p) => p.split('\n').map((x) => x.replace(/[ \t]+/g, ' ').trim()).filter(Boolean)
      .reduce((acc, x) => (!acc ? x : acc + (x.startsWith('•') ? '\n' : ' ') + x), ''))
    .filter(Boolean);
}

/**
 * A primeira captura do programa, no tamanho mais perto de 624 pontos de largura.
 * O Flathub manda os tamanhos numa lista ({ src, width }) ou, nos mais antigos, num mapa ("624x351": url).
 */
function escolherCaptura(capturas) {
  const tela = (capturas || []).find((c) => c && c.default) || (capturas || [])[0];
  if (!tela || !tela.sizes) return null;
  const tamanhos = Array.isArray(tela.sizes)
    ? tela.sizes.map((t) => ({ w: Number(t.width) || 0, url: t.src }))
    : Object.entries(tela.sizes).map(([k, url]) => ({ w: Number(k.split('x')[0]) || 0, url }));
  tamanhos.sort((x, y) => Math.abs(x.w - 624) - Math.abs(y.w - 624));
  return tamanhos[0] && tamanhos[0].url ? tamanhos[0].url : null;
}

/** A primeira linha útil de um erro do flatpak. */
function erroCurto(e) {
  const t = String((e && (e.saida || e.message)) || e || '').split('\n').map((x) => x.trim()).filter(Boolean);
  return (t.find((x) => /^error:/i.test(x)) || t[t.length - 1] || '').replace(/^error:\s*/i, '').slice(0, 300);
}

/* ---------- A loja ---------- */

class Loja {
  constructor({ fetch, plataforma = process.platform, aoInstalar = () => { } } = {}) {
    this.fetch = fetch;
    this.plataforma = plataforma;
    this.aoInstalar = aoInstalar; // depois de instalar ou remover (a lista de programas do computador muda)
    this.cache = new Map();
    this.processo = null;
  }

  /** { plataforma, loja, flatpak (a versão ou null), pronta }: o mesmo formato das do Windows e do Mac (lojas.js). */
  async info() {
    if (this.plataforma !== 'linux') return { plataforma: this.plataforma, loja: 'flatpak', flatpak: null, pronta: false };
    try {
      const v = (await rodar('flatpak', ['--version'], { timeout: 5000 })).trim().replace(/^Flatpak\s*/i, '');
      return { plataforma: 'linux', loja: 'flatpak', flatpak: v || '?', pronta: true };
    } catch {
      return { plataforma: 'linux', loja: 'flatpak', flatpak: null, pronta: false };
    }
  }

  async json(caminho, opcoes) {
    const chave = caminho + (opcoes ? JSON.stringify(opcoes.body) : '');
    const guardado = this.cache.get(chave);
    if (guardado && Date.now() - guardado.em < 10 * 60 * 1000) return guardado.dados;
    const r = await this.fetch(API + caminho, { ...opcoes, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`Flathub: ${r.status}`);
    const dados = await r.json();
    this.cache.set(chave, { em: Date.now(), dados });
    return dados;
  }

  /** Pesquisa por um texto; sem texto, os mais usados (ou os de uma categoria). */
  async buscar({ termo = '', categoria = '', idioma = 'en' } = {}) {
    const loc = localeDe(idioma);
    let d;
    if (termo.trim()) {
      d = await this.json(`/search?locale=${loc}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: termo.trim().slice(0, 100), hits_per_page: 40, page: 1 }),
      });
    } else if (CATEGORIAS.includes(categoria)) {
      d = await this.json(`/collection/category/${categoria}?page=1&per_page=40&locale=${loc}`);
    } else {
      d = await this.json(`/collection/popular?page=1&per_page=40&locale=${loc}`);
    }
    // Só os programas de computador (sem extensões nem execuções de linha de comando).
    return (d.hits || []).filter((x) => idValido(x.app_id) && (!x.type || x.type === 'desktop-application')).map(resumo);
  }

  /** A ficha de um programa: a descrição, a versão, a licença, o site, a primeira captura e o tamanho. */
  async detalhes(id, idioma = 'en') {
    if (!idValido(id)) throw new Error('id');
    const loc = localeDe(idioma);
    const [a, s] = await Promise.all([
      this.json(`/appstream/${id}?locale=${loc}`),
      this.json(`/summary/${id}`).catch(() => null),
    ]);
    const captura = escolherCaptura(a.screenshots);
    const versao = (a.releases || [])[0];
    return {
      id,
      nome: a.name || id,
      resumo: a.summary || '',
      descricao: textoDescricao(a.description),
      desenvolvedor: a.developer_name || '',
      licenca: a.project_license || '',
      livre: !!a.is_free_license,
      versao: versao ? versao.version : '',
      site: (a.urls && a.urls.homepage) || '',
      icone: a.icon || null,
      captura,
      lancador: a.launchable && a.launchable.type === 'desktop-id' ? a.launchable.value : null,
      baixar: s ? Number(s.download_size) || 0 : 0,
      ocupa: s ? Number(s.installed_size) || 0 : 0,
    };
  }

  /** Uma imagem do Flathub como data: URL (só de dl.flathub.org). */
  async imagem(url) {
    if (typeof url !== 'string' || !/^https:\/\/dl\.flathub\.org\//.test(url)) return null;
    const guardado = this.cache.get('img:' + url);
    if (guardado) return guardado.dados;
    const r = await this.fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const tipo = r.headers.get('content-type') || 'image/png';
    if (!/^image\//.test(tipo)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 4 << 20) return null;
    const dados = `data:${tipo};base64,${buf.toString('base64')}`;
    this.cache.set('img:' + url, { em: Date.now(), dados });
    return dados;
  }

  /** Os programas instalados pelo Flatpak (do usuário e do sistema). */
  async instalados() {
    try {
      return lerInstalados(await rodar('flatpak', ['list', '--app', '--columns=application,name,version,installation']));
    } catch {
      return [];
    }
  }

  /** Os ids dos programas com versão nova. */
  async atualizacoes() {
    try {
      const s = await rodar('flatpak', ['remote-ls', '--updates', '--app', '--columns=application'], { timeout: 60000 });
      return s.split('\n').map((x) => x.trim()).filter(idValido);
    } catch {
      return [];
    }
  }

  /** O Flathub como origem do usuário (uma vez; sem senha). */
  async garantirRemoto() {
    await rodar('flatpak', ['remote-add', '--user', '--if-not-exists', REMOTO, REPO], { timeout: 60000 });
  }

  /**
   * Roda um flatpak demorado (instalar, atualizar, remover), contando o andamento.
   * Um de cada vez; cancelar() interrompe.
   */
  executar(args, aoAndar) {
    if (this.processo) return Promise.reject(new Error('ocupado'));
    return new Promise((resolve, reject) => {
      const p = spawn('flatpak', args, { env: { ...process.env, LC_ALL: 'C', LANG: 'C' }, stdio: ['ignore', 'pipe', 'pipe'] });
      this.processo = p;
      let saida = '';
      const ler = (d) => {
        const t = String(d);
        saida = (saida + t).slice(-20000);
        // O flatpak reescreve a mesma linha (\r): vale o último pedaço.
        const ultimo = t.split(/[\r\n]/).filter((x) => x.trim()).pop() || '';
        aoAndar({ ...lerAndamento(ultimo), linha: ultimo.trim().slice(0, 200) });
      };
      p.stdout.on('data', ler);
      p.stderr.on('data', ler);
      p.on('error', (e) => { this.processo = null; reject(e); });
      p.on('close', (codigo, sinal) => {
        this.processo = null;
        if (codigo === 0) return resolve(true);
        const e = new Error(sinal ? 'cancelado' : 'flatpak');
        e.saida = saida;
        e.cancelado = !!sinal;
        reject(e);
      });
    });
  }

  cancelar() {
    if (this.processo) this.processo.kill('SIGINT');
  }

  async instalar(id, aoAndar) {
    if (!idValido(id)) throw new Error('id');
    try {
      await this.garantirRemoto();
      await this.executar(['install', '--user', '--noninteractive', '-y', REMOTO, id], aoAndar);
    } catch (e) {
      throw Object.assign(new Error(e.cancelado ? 'cancelado' : erroCurto(e)), { cancelado: !!e.cancelado });
    }
    this.aoInstalar();
    return true;
  }

  async atualizar(id, aoAndar) {
    if (id && !idValido(id)) throw new Error('id');
    const inst = (await this.instalados()).find((x) => x.id === id);
    const onde = inst && !inst.usuario ? '--system' : '--user';
    try {
      await this.executar(['update', onde, '--noninteractive', '-y', ...(id ? [id] : [])], aoAndar);
    } catch (e) {
      throw Object.assign(new Error(e.cancelado ? 'cancelado' : erroCurto(e)), { cancelado: !!e.cancelado });
    }
    return true;
  }

  async remover(id, aoAndar) {
    if (!idValido(id)) throw new Error('id');
    const inst = (await this.instalados()).find((x) => x.id === id);
    // Os do sistema pedem a senha de administrador (o próprio Flatpak pergunta, pelo polkit).
    const onde = inst && !inst.usuario ? '--system' : '--user';
    try {
      await this.executar(['uninstall', onde, '--noninteractive', '-y', id], aoAndar);
    } catch (e) {
      throw Object.assign(new Error(e.cancelado ? 'cancelado' : erroCurto(e)), { cancelado: !!e.cancelado });
    }
    this.aoInstalar();
    return true;
  }

  /** Abre um programa instalado. */
  abrir(id) {
    if (!idValido(id)) return false;
    const env = { ...process.env };
    for (const k of Object.keys(env)) if (/^(ELECTRON_|RETRO_|APPIMAGE|APPDIR|ARGV0|CHROME_)/.test(k)) delete env[k];
    const p = spawn('flatpak', ['run', id], { detached: true, stdio: 'ignore', env });
    p.on('error', () => { });
    p.unref();
    return true;
  }
}

/**
 * Para os testes e as capturas (RETRO_LOJA_FALSA=1): a pesquisa e as fichas são as do Flathub de
 * verdade, mas o flatpak é de mentira (um programa já instalado, com atualização; instalar anda sozinho).
 */
class LojaFalsa extends Loja {
  constructor(o) {
    super({ ...o, plataforma: 'linux' });
    this.lista = [{ id: 'org.gnome.TextEditor', nome: 'Text Editor', versao: '46.3', usuario: true }];
  }

  async info() { return { plataforma: 'linux', loja: 'flatpak', flatpak: '1.14.10', pronta: true }; }
  async instalados() { return this.lista.map((x) => ({ ...x })); }
  async atualizacoes() { return ['org.gnome.TextEditor']; }
  async garantirRemoto() { }
  abrir() { return true; }

  executar(args, aoAndar) {
    if (this.processo) return Promise.reject(new Error('ocupado'));
    const id = args[args.length - 1];
    return new Promise((resolve) => {
      let pct = 0;
      this.processo = { kill: () => { } };
      const t = setInterval(() => {
        pct += 20;
        aoAndar({ passo: pct < 60 ? 1 : 2, passos: 2, pct: pct % 60 || 100, linha: (pct < 60 ? 'Installing runtime… ' : 'Installing app… ') + pct + '%' });
        if (pct < 100) return;
        clearInterval(t);
        this.processo = null;
        if (args[0] === 'install' && !this.lista.some((x) => x.id === id)) this.lista.push({ id, nome: id.split('.').pop(), versao: '1.0', usuario: true });
        if (args[0] === 'uninstall') this.lista = this.lista.filter((x) => x.id !== id);
        resolve(true);
      }, 300);
    });
  }
}

module.exports = { Loja, LojaFalsa, CATEGORIAS, idValido, localeDe, lerInstalados, lerAndamento, resumo, textoDescricao, escolherCaptura, erroCurto };
