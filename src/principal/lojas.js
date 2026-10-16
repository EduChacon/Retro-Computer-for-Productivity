'use strict';
/*
 * A loja de programas no Windows e no Mac, no mesmo molde da do Linux (loja.js, o Flathub), e só
 * com fontes oficiais:
 *
 *   Windows: o winget (o Gerenciador de Pacotes do Windows, da Microsoft, que já vem no Windows 10
 *            e 11), só com a fonte "winget", o repositório mantido pela Microsoft. A descrição de
 *            cada programa vem do manifesto dele nesse repositório (github.com/microsoft/winget-pkgs).
 *   macOS:   o Homebrew (brew.sh), só os "casks" (os aplicativos com janela), com a lista, as
 *            descrições e a popularidade da interface oficial dele (formulae.brew.sh).
 *
 * As duas têm as mesmas funções da do Flathub (info, buscar, detalhes, imagem, instalados,
 * atualizacoes, instalar, atualizar, remover, cancelar, abrir): a aba de Adicionar ou remover
 * programas é a mesma nos três sistemas. Os programas instalados aparecem sozinhos em
 * "Programas do computador" (aplicativos.js lê o menu Iniciar e a pasta Aplicativos).
 *
 * Nenhuma das duas publica ícones: o de um programa instalado é o do próprio computador (o do
 * atalho do menu Iniciar, o do aplicativo na pasta Aplicativos); o dos outros, o que o site
 * oficial do programa publica (o apple-touch-icon ou o maior "icon" da página, ou o favicon.ico).
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');

/* ---------- O que as duas têm em comum ---------- */

/** Sem acentos e em minúsculas, para comparar nomes. */
const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Os programas escolhidos para cada categoria (sem pesquisa), conferidos nos índices oficiais. */
const ESCOLHIDOS = {
  win32: {
    '': ['Mozilla.Firefox', 'TheDocumentFoundation.LibreOffice', 'VideoLAN.VLC', '7zip.7zip', 'Google.Chrome', 'Notepad++.Notepad++', 'GIMP.GIMP.3', 'Audacity.Audacity', 'Zoom.Zoom', 'Spotify.Spotify', 'Valve.Steam', 'Microsoft.PowerToys', 'KeePassXCTeam.KeePassXC', 'Obsidian.Obsidian', 'Microsoft.VisualStudioCode', 'Brave.Brave'],
    office: ['TheDocumentFoundation.LibreOffice', 'ONLYOFFICE.DesktopEditors', 'Obsidian.Obsidian', 'Notion.Notion', 'DigitalScholar.Zotero', 'SumatraPDF.SumatraPDF', 'Adobe.Acrobat.Reader.64-bit', 'calibre.calibre'],
    network: ['Mozilla.Firefox', 'Google.Chrome', 'Brave.Brave', 'Mozilla.Thunderbird', 'Zoom.Zoom', 'SlackTechnologies.Slack', 'OpenWhisperSystems.Signal', 'Telegram.TelegramDesktop', 'Discord.Discord', 'qBittorrent.qBittorrent'],
    graphics: ['GIMP.GIMP.3', 'Inkscape.Inkscape', 'KDE.Krita', 'dotPDN.PaintDotNet', 'BlenderFoundation.Blender', 'IrfanSkiljan.IrfanView', 'darktable.darktable'],
    audiovideo: ['VideoLAN.VLC', 'Audacity.Audacity', 'Spotify.Spotify', 'OBSProject.OBSStudio', 'HandBrake.HandBrake', 'MusicBrainz.Picard', 'clsid2.mpc-hc'],
    education: ['Anki.Anki', 'GeoGebra.Classic', 'Stellarium.Stellarium', 'DigitalScholar.Zotero'],
    game: ['Valve.Steam', 'EpicGames.EpicGamesLauncher', 'GOG.Galaxy', 'Libretro.RetroArch', 'DOSBoxStaging.DOSBoxStaging'],
    development: ['Microsoft.VisualStudioCode', 'Git.Git', 'Python.Python.3.13', 'OpenJS.NodeJS.LTS', 'Notepad++.Notepad++', 'GitHub.GitHubDesktop'],
    utility: ['7zip.7zip', 'voidtools.Everything', 'Microsoft.PowerToys', 'ShareX.ShareX', 'KeePassXCTeam.KeePassXC', 'Bitwarden.Bitwarden', 'WinDirStat.WinDirStat', 'Flameshot.Flameshot'],
    science: ['OSGeo.QGIS', 'GNU.Octave', 'RProject.R', 'Posit.RStudio', 'Stellarium.Stellarium'],
    system: ['CrystalDewWorld.CrystalDiskInfo', 'Rufus.Rufus', 'BleachBit.BleachBit', 'REALiX.HWiNFO', 'CPUID.CPU-Z', 'AntibodySoftware.WizTree'],
  },
  darwin: {
    office: ['libreoffice', 'onlyoffice', 'obsidian', 'notion', 'zotero', 'calibre', 'skim'],
    network: ['firefox', 'google-chrome', 'brave-browser', 'thunderbird', 'zoom', 'slack', 'signal', 'telegram', 'discord'],
    graphics: ['gimp', 'inkscape', 'krita', 'blender'],
    audiovideo: ['vlc', 'audacity', 'spotify', 'obs', 'handbrake-app', 'musicbrainz-picard', 'iina'],
    education: ['anki', 'stellarium', 'zotero'],
    game: ['steam', 'epic-games', 'gog-galaxy', 'retroarch', 'dosbox-staging-app'],
    development: ['visual-studio-code', 'github', 'iterm2'],
    utility: ['the-unarchiver', 'keepassxc', 'bitwarden', 'rectangle', 'appcleaner', 'stats', 'maccy'],
    science: ['qgis', 'rstudio', 'r-app', 'stellarium'],
    system: ['coconutbattery', 'onyx', 'stats', 'appcleaner'],
  },
};

/** A primeira linha útil de um erro (a última que diz alguma coisa). */
function erroCurto(e) {
  const t = String((e && (e.saida || e.message)) || e || '').replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
    .split(/[\r\n]+/).map((x) => x.trim()).filter((x) => x && !/^[-\\|/█▒\s]+$/.test(x));
  return (t.find((x) => /^error:/i.test(x)) || t[t.length - 1] || '').replace(/^error:\s*/i, '').slice(0, 300);
}

/** Roda um comando curto e devolve a saída (o texto). */
function rodar(cmd, args, { timeout = 60000, env } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 32 << 20, env: env || process.env, windowsHide: true }, (erro, saida, serr) => {
      if (erro) {
        erro.saida = String(serr || '') + String(saida || '');
        return reject(erro);
      }
      resolve(String(saida));
    });
  });
}

/** Roda as tarefas com no máximo n ao mesmo tempo (cada winget é um processo). */
async function aosPoucos(itens, n, fn) {
  const r = new Array(itens.length);
  let prox = 0;
  const trabalhador = async () => {
    while (prox < itens.length) {
      const i = prox++;
      r[i] = await fn(itens[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, itens.length) }, trabalhador));
  return r;
}

/** Um comando demorado (instalar, atualizar, remover), contando o andamento; um de cada vez. */
class Executor {
  constructor() { this.processo = null; }

  executar(cmd, args, aoAndar, lerAndamento, env) {
    if (this.processo) return Promise.reject(new Error('ocupado'));
    return new Promise((resolve, reject) => {
      const p = spawn(cmd, args, { env: env || process.env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      this.processo = p;
      let saida = '';
      const ler = (d) => {
        const t = String(d);
        saida = (saida + t).slice(-20000);
        // As barras de andamento reescrevem a mesma linha (\r): vale o último pedaço.
        const ultimo = t.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').split(/[\r\n]/).filter((x) => x.trim()).pop() || '';
        aoAndar({ ...lerAndamento(ultimo), linha: ultimo.trim().slice(0, 200) });
      };
      p.stdout.on('data', ler);
      p.stderr.on('data', ler);
      p.on('error', (e) => { this.processo = null; reject(e); });
      p.on('close', (codigo, sinal) => {
        this.processo = null;
        if (codigo === 0) return resolve(saida);
        const e = new Error(sinal || this.cancelado ? 'cancelado' : 'erro');
        e.saida = saida;
        e.cancelado = !!(sinal || this.cancelado);
        this.cancelado = false;
        reject(e);
      });
    });
  }

  cancelar() {
    if (!this.processo) return;
    this.cancelado = true;
    try { this.processo.kill(); } catch { }
  }
}

/* ---------- Os ícones pelo site oficial de cada programa ---------- */

/** Os atributos de uma etiqueta HTML (<link rel="icon" href="…" sizes="…">). */
function atributos(etiqueta) {
  const r = {};
  for (const m of etiqueta.matchAll(/([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) r[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? '';
  return r;
}

/**
 * Os ícones que uma página declara, do melhor para o pior: o apple-touch-icon (feito para a tela
 * de início, quase sempre de 180 pontos), os "icon" do maior para o menor (o SVG conta como
 * grande) e, por último, o /favicon.ico do site. Só endereços https.
 */
function iconesDaPagina(html, base) {
  const achados = [];
  const cab = String(html || '').slice(0, 300000);
  for (const m of cab.matchAll(/<link\b[^>]*>/gi)) {
    const a = atributos(m[0]);
    const rel = (a.rel || '').toLowerCase().split(/\s+/);
    if (!a.href || !(rel.includes('icon') || rel.includes('apple-touch-icon') || rel.includes('apple-touch-icon-precomposed'))) continue;
    let url;
    try { url = new URL(a.href.trim(), base).href; } catch { continue; }
    if (!url.startsWith('https://')) continue;
    const tam = Math.max(0, ...String(a.sizes || '').split(/\s+/).map((s) => Number(s.split(/x/i)[0]) || 0));
    const svg = /svg/i.test(a.type || '') || /\.svg(\?|$)/i.test(url) || a.sizes === 'any';
    const toque = rel.some((r) => r.startsWith('apple-touch-icon'));
    achados.push({ url, nota: (toque ? 1000 : 0) + (svg ? 512 : tam || (toque ? 180 : 16)) });
  }
  achados.sort((x, y) => y.nota - x.nota);
  const lista = achados.map((x) => x.url);
  try { const raiz = new URL('/favicon.ico', base).href; if (raiz.startsWith('https://')) lista.push(raiz); } catch { }
  return [...new Set(lista)];
}

/** O tipo de uma imagem pelos primeiros bytes (os servidores nem sempre dizem o certo do .ico). */
function tipoDaImagem(buf, declarado = '') {
  const b = buf.subarray(0, 16);
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  if (b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00) return 'image/x-icon';
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  const ini = buf.subarray(0, 512).toString('utf8').trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(ini) && /svg/i.test(declarado || 'svg')) return 'image/svg+xml';
  return null;
}

/**
 * Acha e baixa o ícone de um programa pelo site dele. O endereço do ícone de cada site fica
 * guardado por um mês (loja-icones.json); as imagens, na memória. No máximo três sites ao mesmo tempo.
 */
class IconesDoSite {
  constructor({ fetch, pastaDados = null } = {}) {
    this.fetch = fetch;
    this.arquivo = pastaDados && path.join(pastaDados, 'loja-icones.json');
    this.enderecos = null;
    this.imagens = new Map();
    this.fila = [];
    this.correndo = 0;
  }

  /** Uma tarefa por vez em cada uma das três vagas. */
  naFila(fn) {
    return new Promise((resolve) => {
      this.fila.push(async () => { try { resolve(await fn()); } catch { resolve(null); } });
      this.andar();
    });
  }

  andar() {
    while (this.correndo < 3 && this.fila.length) {
      const fn = this.fila.shift();
      this.correndo++;
      fn().finally(() => { this.correndo--; this.andar(); });
    }
  }

  lerEnderecos() {
    if (this.enderecos) return;
    try { this.enderecos = JSON.parse(fs.readFileSync(this.arquivo, 'utf8')); } catch { this.enderecos = {}; }
  }

  guardar() {
    if (!this.arquivo) return;
    clearTimeout(this.adiado);
    // Uma gravação só, depois de a fila acalmar.
    this.adiado = setTimeout(() => {
      try { fs.mkdirSync(path.dirname(this.arquivo), { recursive: true }); fs.writeFileSync(this.arquivo, JSON.stringify(this.enderecos)); } catch { }
    }, 2000);
  }

  /** Uma imagem de um endereço https, como data: URL (até 512 KB), ou null. */
  async baixar(url) {
    if (this.imagens.has(url)) return this.imagens.get(url);
    let dados = null;
    try {
      const r = await this.fetch(url, { signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        const tipo = buf.length && buf.length <= 512 * 1024 ? tipoDaImagem(buf, r.headers.get('content-type') || '') : null;
        if (tipo) dados = `data:${tipo};base64,${buf.toString('base64')}`;
      }
    } catch { }
    this.imagens.set(url, dados);
    return dados;
  }

  /** O ícone do site (data: URL) ou null. */
  async doSite(site) {
    if (!/^https:\/\//.test(site || '')) return null;
    this.lerEnderecos();
    const g = this.enderecos[site];
    if (g && Date.now() - g.em < 30 * 24 * 3600 * 1000) return g.url ? this.naFila(() => this.baixar(g.url)) : null;
    return this.naFila(async () => {
      let candidatos = [];
      try {
        const r = await this.fetch(site, { signal: AbortSignal.timeout(10000), headers: { Accept: 'text/html' } });
        const tipo = r.headers.get('content-type') || '';
        const html = r.ok && /html/i.test(tipo) ? (await r.text()).slice(0, 300000) : '';
        candidatos = iconesDaPagina(html, r.url || site);
      } catch {
        candidatos = iconesDaPagina('', site);
      }
      let achado = null;
      for (const url of candidatos.slice(0, 4)) {
        const d = await this.baixar(url);
        if (d) { achado = { url, d }; break; }
      }
      this.enderecos[site] = { url: achado ? achado.url : null, em: Date.now() };
      this.guardar();
      return achado ? achado.d : null;
    });
  }
}

/* ---------- Windows: o winget ---------- */

/** Os nomes de pacote do winget (Publicador.Programa): nada que o winget leia como opção. */
const idWinget = (id) => typeof id === 'string' && id.length <= 128 && /^[A-Za-z0-9][A-Za-z0-9+_-]*(\.[A-Za-z0-9+_-]+)+$/.test(id);

const ARGS_WINGET = ['--source', 'winget', '--accept-source-agreements', '--disable-interactivity'];

/**
 * Uma tabela do winget (search, list, upgrade), em qualquer idioma do Windows: as colunas vêm da
 * posição dos nomes no cabeçalho (a linha logo acima da de traços), não dos nomes.
 */
function lerTabelaWinget(saida) {
  const linhas = String(saida || '').replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').split(/\r?\n|\r/);
  const i = linhas.findIndex((l) => /^-{8,}\s*$/.test(l));
  if (i < 1) return [];
  const cab = linhas[i - 1].replace(/\s+$/, '');
  const inicios = [];
  for (let k = 0; k < cab.length; k++) if (cab[k] !== ' ' && (k === 0 || cab[k - 1] === ' ')) inicios.push(k);
  const r = [];
  for (const l of linhas.slice(i + 1)) {
    if (!l.trim()) break;
    // A frase do fim ("2 upgrades available.") não chega à coluna do Id ou não respeita as colunas: a tabela acabou.
    if (inicios.length > 1 && l.trimEnd().length <= inicios[1]) break;
    if (inicios.slice(1).some((s) => s < l.length && l[s - 1] !== ' ')) break;
    r.push(inicios.map((s, k) => l.slice(s, inicios[k + 1] == null ? undefined : inicios[k + 1]).trim()));
  }
  return r;
}

/** O andamento do winget: a barra do download ("1,5 MB / 12,0 MB") ou a porcentagem. */
function lerAndamentoWinget(texto) {
  const t = String(texto || '');
  const fator = { KB: 1, MB: 1024, GB: 1024 * 1024 };
  const m = /([\d.,]+)\s*(KB|MB|GB)\s*\/\s*([\d.,]+)\s*(KB|MB|GB)/i.exec(t);
  if (m) {
    const num = (s) => Number(s.replace(',', '.'));
    const feito = num(m[1]) * fator[m[2].toUpperCase()];
    const total = num(m[3]) * fator[m[4].toUpperCase()];
    if (total > 0) return { pct: Math.min(100, Math.round((feito / total) * 100)), passo: 1, passos: 2 };
  }
  const p = [...t.matchAll(/(\d{1,3})\s?%/g)].pop();
  if (p) return { pct: Math.min(100, Number(p[1])), passo: 2, passos: 2 };
  return {};
}

/**
 * Os campos de cima de um manifesto do winget (o YAML de github.com/microsoft/winget-pkgs):
 * "Chave: valor" e os valores de várias linhas (| e >). Só o que a ficha mostra.
 */
function lerManifesto(texto) {
  const r = {};
  const linhas = String(texto || '').replace(/\r/g, '').split('\n');
  for (let i = 0; i < linhas.length; i++) {
    const m = /^([A-Za-z]+):\s*(.*)$/.exec(linhas[i]);
    if (!m) continue;
    let v = m[2].trim();
    if (/^[|>][-+]?$/.test(v)) {
      const junta = v.startsWith('>') ? ' ' : '\n';
      const partes = [];
      while (i + 1 < linhas.length && (/^\s+\S/.test(linhas[i + 1]) || !linhas[i + 1].trim())) partes.push(linhas[++i].trim());
      v = partes.join(junta).replace(/\n{3,}/g, '\n\n').trim();
    } else {
      v = v.replace(/^(['"])(.*)\1$/, '$2');
    }
    if (!(m[1] in r)) r[m[1]] = v;
  }
  return r;
}

/** A pasta do manifesto no repositório (manifests/m/Mozilla/Firefox/131.0). */
const pastaManifesto = (id, versao) => `manifests/${id[0].toLowerCase()}/${id.split('.').join('/')}/${versao}`;

const LOCALE_WINGET = { 'pt-BR': 'pt-BR', es: 'es-ES', en: 'en-US' };

class LojaWinget {
  constructor({ fetch, aoInstalar = () => { }, abrirPrograma = () => false, iconeLocal = async () => null, comando = 'winget', pastaDados = null } = {}) {
    this.fetch = fetch;
    this.aoInstalar = aoInstalar;
    this.abrirPrograma = abrirPrograma;
    this.iconeLocal = iconeLocal; // o ícone de um programa do computador, pelo nome (o do atalho do menu Iniciar)
    this.icones = new IconesDoSite({ fetch, pastaDados });
    this.nomesInstalados = new Map();
    this.comando = comando;
    this.pastaDados = pastaDados;
    this.exec = new Executor();
    this.cache = new Map();
    this.fichas = null; // o nome, o resumo e a versão dos escolhidos, guardados por um dia (loja-winget.json)
  }

  arquivoFichas() { return this.pastaDados && path.join(this.pastaDados, 'loja-winget.json'); }

  /** O nome, o resumo e a versão de um dos escolhidos: da pasta de dados, se tiver menos de um dia. */
  async fichaCurta(id, idioma) {
    if (!this.fichas) {
      try { this.fichas = JSON.parse(fs.readFileSync(this.arquivoFichas(), 'utf8')); } catch { this.fichas = {}; }
    }
    const chave = idioma + ':' + id;
    const g = this.fichas[chave];
    if (g && Date.now() - g.em < 24 * 3600 * 1000) return g;
    const f = await this.detalhes(id, idioma).catch(() => null);
    if (!f || !f.versao) return g || null;
    this.fichas[chave] = { nome: f.nome, resumo: f.resumo, versao: f.versao, site: f.site, em: Date.now() };
    return this.fichas[chave];
  }

  guardarFichas() {
    const arq = this.arquivoFichas();
    if (!arq || !this.fichas) return;
    try { fs.mkdirSync(path.dirname(arq), { recursive: true }); fs.writeFileSync(arq, JSON.stringify(this.fichas)); } catch { }
  }

  async info() {
    try {
      const v = (await rodar(this.comando, ['--version'], { timeout: 15000 })).trim();
      return { plataforma: 'win32', loja: 'winget', versao: v || '?', pronta: true };
    } catch {
      return { plataforma: 'win32', loja: 'winget', versao: null, pronta: false };
    }
  }

  async pesquisar(termo) {
    const saida = await rodar(this.comando, ['search', '--query', termo, ...ARGS_WINGET], { timeout: 90000 }).catch((e) => {
      // Sem nada achado, o winget sai com erro e uma frase (sem a tabela).
      if (e.saida && /-{8,}/.test(e.saida)) return e.saida;
      return '';
    });
    return lerTabelaWinget(saida).filter((c) => idWinget(c[1])).map((c) => ({ id: c[1], nome: c[0], versao: c[2] || '' }));
  }

  async buscar({ termo = '', categoria = '', idioma = 'en' } = {}) {
    if (termo.trim()) {
      const achados = await this.pesquisar(termo.trim().slice(0, 100));
      return achados.slice(0, 60).map((x) => ({ id: x.id, nome: x.nome, resumo: x.id, icone: null, versao: x.versao }));
    }
    const ids = ESCOLHIDOS.win32[categoria] || ESCOLHIDOS.win32[''];
    // Quatro de cada vez: cada versão é uma pergunta ao winget.
    const fichas = await aosPoucos(ids, 4, (id) => this.fichaCurta(id, idioma));
    this.guardarFichas();
    return ids.map((id, i) => {
      const f = fichas[i];
      return { id, nome: (f && f.nome) || id, resumo: (f && f.resumo) || id, icone: null, versao: (f && f.versao) || '' };
    });
  }

  /** A versão de um pacote (a da fonte winget). */
  async versaoDe(id) {
    const chave = 'versao:' + id;
    if (this.cache.has(chave)) return this.cache.get(chave);
    const saida = await rodar(this.comando, ['search', '--id', id, '--exact', ...ARGS_WINGET], { timeout: 60000 }).catch((e) => e.saida || '');
    const linha = lerTabelaWinget(saida).find((c) => c[1] === id);
    const v = linha ? linha[2] : '';
    if (v) this.cache.set(chave, v);
    return v;
  }

  async texto(url) {
    if (this.cache.has(url)) return this.cache.get(url);
    const r = await this.fetch(url, { signal: AbortSignal.timeout(15000) });
    const t = r.ok ? await r.text() : null;
    this.cache.set(url, t);
    return t;
  }

  /** A ficha: o manifesto do pacote no repositório da Microsoft (no idioma do Retro Computer, se houver). */
  async detalhes(id, idioma = 'en', versao = '') {
    if (!idWinget(id)) throw new Error('id');
    const v = versao || (await this.versaoDe(id));
    let m = {};
    if (v) {
      const base = `https://raw.githubusercontent.com/microsoft/winget-pkgs/master/${pastaManifesto(id, v)}/${id}`;
      const padrao = await this.texto(`${base}.locale.en-US.yaml`).catch(() => null);
      const local = LOCALE_WINGET[idioma] && LOCALE_WINGET[idioma] !== 'en-US' ? await this.texto(`${base}.locale.${LOCALE_WINGET[idioma]}.yaml`).catch(() => null) : null;
      m = { ...lerManifesto(padrao), ...Object.fromEntries(Object.entries(lerManifesto(local)).filter(([, x]) => x)) };
    }
    const descricao = (m.Description || m.ShortDescription || '').split(/\n{2,}|\n(?=[-•*] )/).map((p) => p.replace(/\n/g, ' ').trim()).filter(Boolean);
    return {
      id,
      nome: m.PackageName || id,
      resumo: m.ShortDescription || '',
      descricao,
      desenvolvedor: m.Publisher || '',
      licenca: m.License || '',
      livre: /\b(GPL|LGPL|MIT|BSD|Apache|MPL|AGPL|ISC|Zlib|Unlicense)\b|Public License/i.test(m.License || ''),
      versao: v,
      site: /^https:\/\//.test(m.PackageUrl || '') ? m.PackageUrl : /^https:\/\//.test(m.PublisherUrl || '') ? m.PublisherUrl : '',
      icone: null,
      captura: null,
      baixar: 0,
      ocupa: 0,
    };
  }

  async imagem() { return null; }

  /**
   * O ícone de um programa: o do computador, se ele estiver instalado (pelo nome que o winget lista);
   * senão, o do site oficial (o da ficha guardada ou o do manifesto).
   */
  async icone(id, idioma = 'en') {
    if (!idWinget(id)) return null;
    const nome = this.nomesInstalados.get(id);
    if (nome) { const d = await this.iconeLocal(nome).catch(() => null); if (d) return d; }
    const guardada = this.fichas && this.fichas[idioma + ':' + id];
    const site = guardada && guardada.site !== undefined ? guardada.site : (await this.icones.naFila(() => this.detalhes(id, idioma)) || {}).site;
    return site ? this.icones.doSite(site) : null;
  }

  async instalados() {
    const saida = await rodar(this.comando, ['list', ...ARGS_WINGET], { timeout: 90000 }).catch((e) => e.saida || '');
    const l = lerTabelaWinget(saida).filter((c) => idWinget(c[1])).map((c) => ({ id: c[1], nome: c[0], versao: c[2] || '', usuario: true }));
    this.nomesInstalados = new Map(l.map((x) => [x.id, x.nome]));
    return l;
  }

  async atualizacoes() {
    const saida = await rodar(this.comando, ['upgrade', ...ARGS_WINGET], { timeout: 90000 }).catch((e) => e.saida || '');
    return lerTabelaWinget(saida).map((c) => c[1]).filter(idWinget);
  }

  async rodarDemorado(acao, id, aoAndar) {
    if (!idWinget(id)) throw new Error('id');
    const extra = acao === 'uninstall' ? [] : ['--accept-package-agreements'];
    try {
      await this.exec.executar(this.comando, [acao, '--id', id, '--exact', '--silent', ...extra, ...ARGS_WINGET], aoAndar, lerAndamentoWinget);
    } catch (e) {
      throw Object.assign(new Error(e.cancelado ? 'cancelado' : erroCurto(e)), { cancelado: !!e.cancelado });
    }
    this.cache.delete('versao:' + id);
    this.aoInstalar();
    return true;
  }

  instalar(id, aoAndar) { return this.rodarDemorado('install', id, aoAndar); }
  atualizar(id, aoAndar) { return this.rodarDemorado('upgrade', id, aoAndar); }
  remover(id, aoAndar) { return this.rodarDemorado('uninstall', id, aoAndar); }
  cancelar() { this.exec.cancelar(); }

  /** Abre o programa pelo atalho dele no menu Iniciar (pelo nome do pacote). */
  async abrir(id) {
    if (!idWinget(id)) return false;
    const inst = (await this.instalados()).find((x) => x.id === id);
    return this.abrirPrograma(inst ? inst.nome : id.split('.').pop());
  }
}

/* ---------- macOS: o Homebrew ---------- */

/** Os nomes dos casks (firefox, google-chrome, visual-studio-code@insiders). */
const idBrew = (id) => typeof id === 'string' && /^[a-z0-9][a-z0-9@._+-]{0,127}$/.test(id);

const API_BREW = 'https://formulae.brew.sh/api';

/** Um cask da interface oficial, só com o que a loja usa. */
function resumoCask(c) {
  const apps = (c.artifacts || []).flatMap((a) => (a && Array.isArray(a.app) ? a.app.filter((x) => typeof x === 'string') : []));
  const pkg = (c.artifacts || []).some((a) => a && a.pkg);
  return {
    id: c.token,
    nome: (Array.isArray(c.name) && c.name[0]) || c.token,
    resumo: c.desc || '',
    site: /^https:\/\//.test(c.homepage || '') ? c.homepage : '',
    versao: c.version || '',
    apps,
    janela: apps.length > 0 || pkg, // um aplicativo com janela (não só um comando de terminal)
    fora: !!(c.deprecated || c.disabled),
  };
}

/** brew list --cask --versions: "firefox 131.0" por linha. */
function lerListaBrew(s) {
  return String(s || '').split('\n').map((l) => l.trim().split(/\s+/)).filter((c) => c[0] && idBrew(c[0]))
    .map(([id, ...v]) => ({ id, nome: id, versao: v.join(' '), usuario: true }));
}

/** brew outdated --cask --json=v2 */
function lerDesatualizadosBrew(s) {
  try {
    const j = JSON.parse(s);
    return (j.casks || []).map((c) => c.name || c.token).filter(idBrew);
  } catch { return []; }
}

/** O andamento do Homebrew: a barra do download ("######## 45.0%"). */
function lerAndamentoBrew(texto) {
  const p = [...String(texto || '').matchAll(/(\d{1,3}(?:\.\d)?)%/g)].pop();
  return p ? { pct: Math.min(100, Math.round(Number(p[1]))), passo: 1, passos: 2 } : {};
}

/** A pesquisa nos casks: o nome, o token e a descrição, sem acento; os mais instalados primeiro. */
function pesquisarCasks(casks, termo, posicao = new Map()) {
  const t = normal(termo).trim();
  if (!t) return [];
  const pontos = (c) => {
    const n = normal(c.nome);
    if (c.id === t || n === t) return 0;
    if (c.id.startsWith(t) || n.startsWith(t)) return 1;
    if (c.id.includes(t) || n.includes(t)) return 2;
    if (normal(c.resumo).includes(t)) return 3;
    return 9;
  };
  return casks.filter((c) => c.janela && !c.fora).map((c) => ({ c, p: pontos(c) })).filter((x) => x.p < 9)
    .sort((a, b) => (a.p - b.p) || ((posicao.get(a.c.id) ?? 1e9) - (posicao.get(b.c.id) ?? 1e9)) || a.c.nome.localeCompare(b.c.nome))
    .map((x) => x.c);
}

/** Onde está o brew (o Finder não passa o PATH do Terminal para os aplicativos). */
function acharBrew(existe = fs.existsSync) {
  return ['/opt/homebrew/bin/brew', '/usr/local/bin/brew'].find((p) => existe(p)) || null;
}

class LojaBrew {
  constructor({ fetch, aoInstalar = () => { }, iconeLocal = async () => null, pastaDados = null, brew = acharBrew() } = {}) {
    this.fetch = fetch;
    this.aoInstalar = aoInstalar;
    this.iconeLocal = iconeLocal; // o ícone de um aplicativo do Mac, pelo caminho (/Applications/Firefox.app)
    this.icones = new IconesDoSite({ fetch, pastaDados });
    this.pastaDados = pastaDados;
    this.brew = brew;
    this.exec = new Executor();
    this.casks = null;
    this.posicao = new Map();
  }

  env() {
    const env = { ...process.env, HOMEBREW_NO_ENV_HINTS: '1', HOMEBREW_NO_EMOJI: '1', NONINTERACTIVE: '1' };
    if (this.brew) env.PATH = `${path.dirname(this.brew)}:${env.PATH || '/usr/bin:/bin'}`;
    return env;
  }

  async info() {
    if (!this.brew) this.brew = acharBrew();
    if (!this.brew) return { plataforma: 'darwin', loja: 'brew', versao: null, pronta: false };
    try {
      const v = (await rodar(this.brew, ['--version'], { timeout: 20000, env: this.env() })).split('\n')[0].replace(/^Homebrew\s*/i, '').trim();
      // O caminho do brew vai para o Prompt (quando um instalador pede a senha do Mac).
      return { plataforma: 'darwin', loja: 'brew', versao: v || '?', pronta: true, comando: this.brew };
    } catch {
      return { plataforma: 'darwin', loja: 'brew', versao: null, pronta: false };
    }
  }

  /** A lista de todos os casks e a popularidade (guardadas por um dia na pasta de dados). */
  async catalogo() {
    if (this.casks && Date.now() - this.casksEm < 24 * 3600 * 1000) return this.casks;
    const arq = this.pastaDados && path.join(this.pastaDados, 'loja-brew.json');
    try {
      const g = JSON.parse(fs.readFileSync(arq, 'utf8'));
      if (Date.now() - g.em < 24 * 3600 * 1000) Object.assign(this, { casks: g.casks, casksEm: g.em, posicao: new Map(g.populares.map((id, i) => [id, i])) });
    } catch { }
    if (this.casks && Date.now() - this.casksEm < 24 * 3600 * 1000) return this.casks;
    const [lista, pop] = await Promise.all([
      this.fetch(`${API_BREW}/cask.json`, { signal: AbortSignal.timeout(60000) }).then((r) => { if (!r.ok) throw new Error(`Homebrew: ${r.status}`); return r.json(); }),
      this.fetch(`${API_BREW}/analytics/cask-install/30d.json`, { signal: AbortSignal.timeout(30000) }).then((r) => (r.ok ? r.json() : { items: [] })).catch(() => ({ items: [] })),
    ]);
    const casks = lista.map(resumoCask);
    const populares = (pop.items || []).map((x) => x.cask).filter(idBrew).slice(0, 2000);
    Object.assign(this, { casks, casksEm: Date.now(), posicao: new Map(populares.map((id, i) => [id, i])) });
    if (arq) { try { fs.mkdirSync(path.dirname(arq), { recursive: true }); fs.writeFileSync(arq, JSON.stringify({ em: this.casksEm, casks, populares })); } catch { } }
    return casks;
  }

  async buscar({ termo = '', categoria = '' } = {}) {
    const casks = await this.catalogo();
    const porId = new Map(casks.map((c) => [c.id, c]));
    let lista;
    if (termo.trim()) lista = pesquisarCasks(casks, termo, this.posicao).slice(0, 60);
    else if (ESCOLHIDOS.darwin[categoria]) lista = ESCOLHIDOS.darwin[categoria].map((id) => porId.get(id)).filter(Boolean);
    else lista = [...this.posicao.keys()].map((id) => porId.get(id)).filter((c) => c && c.janela && !c.fora).slice(0, 40);
    return lista.map((c) => ({ id: c.id, nome: c.nome, resumo: c.resumo, icone: null, versao: c.versao }));
  }

  async detalhes(id) {
    if (!idBrew(id)) throw new Error('id');
    const c = (await this.catalogo()).find((x) => x.id === id);
    if (!c) throw new Error('id');
    return { id, nome: c.nome, resumo: c.resumo, descricao: [], desenvolvedor: '', licenca: '', livre: false, versao: c.versao, site: c.site, icone: null, captura: null, baixar: 0, ocupa: 0 };
  }

  async imagem() { return null; }

  /** O ícone de um programa: o do aplicativo na pasta Aplicativos, se estiver lá; senão, o do site oficial. */
  async icone(id) {
    if (!idBrew(id)) return null;
    const c = (await this.catalogo().catch(() => [])).find((x) => x.id === id);
    if (!c) return null;
    const app = c.apps.find((a) => /^[^/\\]+\.app$/.test(a));
    if (app && fs.existsSync(path.join('/Applications', app))) {
      const d = await this.iconeLocal(path.join('/Applications', app)).catch(() => null);
      if (d) return d;
    }
    return c.site ? this.icones.doSite(c.site) : null;
  }

  async instalados() {
    if (!this.brew) return [];
    const casks = await this.catalogo().catch(() => []);
    const nomes = new Map(casks.map((c) => [c.id, c.nome]));
    const l = lerListaBrew(await rodar(this.brew, ['list', '--cask', '--versions'], { env: this.env() }).catch(() => ''));
    return l.map((x) => ({ ...x, nome: nomes.get(x.id) || x.id }));
  }

  async atualizacoes() {
    if (!this.brew) return [];
    return lerDesatualizadosBrew(await rodar(this.brew, ['outdated', '--cask', '--json=v2'], { timeout: 120000, env: this.env() }).catch((e) => e.saida || ''));
  }

  async rodarDemorado(args, id, aoAndar) {
    if (!idBrew(id)) throw new Error('id');
    if (!this.brew) throw new Error('brew');
    try {
      await this.exec.executar(this.brew, [...args, id], aoAndar, lerAndamentoBrew, this.env());
    } catch (e) {
      // Os instaladores .pkg pedem a senha do Mac: sem o Terminal, o sudo não tem como perguntar.
      const senha = !e.cancelado && /sudo|password|senha/i.test(String(e.saida || ''));
      throw Object.assign(new Error(e.cancelado ? 'cancelado' : erroCurto(e)), { cancelado: !!e.cancelado, codigo: senha ? 'senha' : undefined });
    }
    this.aoInstalar();
    return true;
  }

  instalar(id, aoAndar) { return this.rodarDemorado(['install', '--cask'], id, aoAndar); }
  atualizar(id, aoAndar) { return this.rodarDemorado(['upgrade', '--cask'], id, aoAndar); }
  remover(id, aoAndar) { return this.rodarDemorado(['uninstall', '--cask'], id, aoAndar); }
  cancelar() { this.exec.cancelar(); }

  /** Abre o aplicativo (o .app que o cask põe em Aplicativos). */
  async abrir(id) {
    if (!idBrew(id)) return false;
    const c = (await this.catalogo().catch(() => [])).find((x) => x.id === id);
    const app = c && c.apps[0];
    if (!app || !/^[^/\\]+\.app$/.test(app)) return false;
    const p = spawn('open', ['-a', path.join('/Applications', app)], { detached: true, stdio: 'ignore' });
    p.on('error', () => { });
    p.unref();
    return true;
  }
}

/* ---------- As de mentira, para as capturas (RETRO_LOJA_FALSA=winget ou brew) ---------- */

/**
 * O winget de mentira: um instalado com atualização; instalar anda sozinho. As fichas com versão
 * conhecida vêm dos manifestos de verdade (a internet), as outras são inventadas.
 */
const VERSOES_FALSAS = { 'VideoLAN.VLC': '3.0.21', 'Mozilla.Firefox': '131.0', '7zip.7zip': '24.08', 'Audacity.Audacity': '3.6.4' };

class LojaWingetFalsa extends LojaWinget {
  constructor(o) {
    super({ ...o, pastaDados: null });
    this.lista = [{ id: 'VideoLAN.VLC', nome: 'VLC media player', versao: '3.0.20', usuario: true }];
  }

  async info() { return { plataforma: 'win32', loja: 'winget', versao: 'v1.11.400', pronta: true }; }
  async instalados() { this.nomesInstalados = new Map(this.lista.map((x) => [x.id, x.nome])); return this.lista.map((x) => ({ ...x })); }
  async versaoDe(id) { return VERSOES_FALSAS[id] || ''; }
  async detalhes(id, idioma) {
    const f = await super.detalhes(id, idioma);
    if (f.versao) return f;
    const nome = { 'TheDocumentFoundation.LibreOffice': 'LibreOffice', 'Google.Chrome': 'Google Chrome' }[id] || id.split('.')[1];
    return { ...f, nome, resumo: id, desenvolvedor: id.split('.')[0], versao: '1.0' };
  }
  async pesquisar(termo) { return Object.values(ESCOLHIDOS.win32).flat().filter((id, i, a) => a.indexOf(id) === i && normal(id).includes(normal(termo))).map((id) => ({ id, nome: id.split('.').pop(), versao: '1.0' })); }
  async atualizacoes() { return ['VideoLAN.VLC']; }
  async abrir() { return true; }
  async rodarDemorado(acao, id, aoAndar) {
    await falsoAndamento(aoAndar);
    if (acao === 'install' && !this.lista.some((x) => x.id === id)) this.lista.push({ id, nome: id.split('.').pop(), versao: '1.0', usuario: true });
    if (acao === 'uninstall') this.lista = this.lista.filter((x) => x.id !== id);
    return true;
  }
}

/** O Homebrew de mentira: a lista e a popularidade são as de verdade (a internet); o brew, não. */
class LojaBrewFalsa extends LojaBrew {
  constructor(o) {
    super({ ...o, brew: '/opt/homebrew/bin/brew' });
    this.lista = [{ id: 'vlc', nome: 'VLC', versao: '3.0.20', usuario: true }];
  }

  async info() { return { plataforma: 'darwin', loja: 'brew', versao: '4.6.0', pronta: true, comando: this.brew }; }
  async instalados() { return this.lista.map((x) => ({ ...x })); }
  async atualizacoes() { return ['vlc']; }
  async abrir() { return true; }
  async rodarDemorado(args, id, aoAndar) {
    await falsoAndamento(aoAndar);
    // O Zoom vem num instalador .pkg, que pede a senha do Mac: o caminho do Prompt.
    if (args[0] === 'install' && id === 'zoom') throw Object.assign(new Error('senha'), { codigo: 'senha' });
    if (args[0] === 'install' && !this.lista.some((x) => x.id === id)) this.lista.push({ id, nome: id, versao: '1.0', usuario: true });
    if (args[0] === 'uninstall') this.lista = this.lista.filter((x) => x.id !== id);
    return true;
  }
}

function falsoAndamento(aoAndar) {
  return new Promise((resolve) => {
    let pct = 0;
    const t = setInterval(() => {
      pct += 25;
      aoAndar({ pct, passo: 1, passos: 1, linha: pct + '%' });
      if (pct >= 100) { clearInterval(t); resolve(); }
    }, 250);
  });
}

module.exports = {
  IconesDoSite, iconesDaPagina, tipoDaImagem, atributos,
  LojaWinget, LojaBrew, LojaWingetFalsa, LojaBrewFalsa, ESCOLHIDOS,
  aosPoucos, idWinget, idBrew, lerTabelaWinget, lerAndamentoWinget, lerManifesto, pastaManifesto,
  resumoCask, lerListaBrew, lerDesatualizadosBrew, lerAndamentoBrew, pesquisarCasks, acharBrew, erroCurto,
};
