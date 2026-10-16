'use strict';
/*
 * O mouse e o touchpad do modo sistema (no Linux, pelo xinput e o controlador libinput): a
 * velocidade do ponteiro, a aceleração, a rolagem natural e o botão principal (canhoto); no
 * touchpad, também tocar para clicar, rolar e clicar com dois dedos e desligá-lo enquanto se
 * digita ou com um mouse ligado. As escolhas ficam no config.json (mouse) e voltam a cada
 * abertura; um aparelho ligado depois (o mouse sem fio, por exemplo) recebe as mesmas.
 * Fora do modo sistema, quem cuida do mouse é o sistema do computador principal.
 */
const fs = require('node:fs');
const { execFile } = require('node:child_process');

function rodar(args, { timeout = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile('xinput', args, { timeout, env: { ...process.env, LC_ALL: 'C' } }, (erro, saida, serr) => {
      if (erro) { erro.saida = String(serr || saida || '').trim(); return reject(erro); }
      resolve(String(saida));
    });
  });
}

/** xinput list → [{ id, nome }] dos aparelhos de apontar de verdade (sem os virtuais do X). */
function lerLista(texto) {
  const r = [];
  for (const linha of String(texto).split('\n')) {
    const m = /↳\s+(.+?)\s+id=(\d+)\s+\[slave\s+pointer\b/.exec(linha);
    if (m && !/XTEST/.test(m[1])) r.push({ id: Number(m[2]), nome: m[1].trim() });
  }
  return r;
}

/** xinput list-props <id> → Map(nome da propriedade → [valores]). */
function lerPropriedades(texto) {
  const props = new Map();
  for (const linha of String(texto).split('\n')) {
    const m = /^\s+(.+?) \(\d+\):\s*(.*)$/.exec(linha);
    if (!m) continue;
    props.set(m[1], m[2].split(/,\s*/).map((v) => (/^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v)));
  }
  return props;
}

// Os nomes das propriedades do libinput (os campos de cada uma estão na ordem do controlador).
const P = {
  velocidade: 'libinput Accel Speed',
  perfis: 'libinput Accel Profiles Available', // [adaptativo, plano(, personalizado)]
  perfil: 'libinput Accel Profile Enabled',
  natural: 'libinput Natural Scrolling Enabled',
  canhoto: 'libinput Left Handed Enabled',
  tocar: 'libinput Tapping Enabled',
  digitando: 'libinput Disable While Typing Enabled',
  rolagens: 'libinput Scroll Methods Available', // [dois dedos, borda, botão]
  rolagem: 'libinput Scroll Method Enabled',
  cliques: 'libinput Click Methods Available', // [áreas do botão, dedos]
  clique: 'libinput Click Method Enabled',
  eventos: 'libinput Send Events Modes Available', // [desligado, desligado com um mouse ligado]
  evento: 'libinput Send Events Mode Enabled',
};

/**
 * Um aparelho pelas propriedades: { tipo ('mouse' ou 'touchpad'), valores, pode } ou null
 * (sem o libinput, como no controlador synaptics antigo, não há o que ajustar por aqui).
 */
function aparelhoDe(props) {
  const v = (k) => props.get(P[k]);
  if (!v('velocidade') && !v('canhoto') && !v('natural')) return null;
  const um = (k) => (v(k) ? v(k)[0] === 1 : undefined);
  const perfis = v('perfis') || [];
  const rolagens = v('rolagens') || [];
  const cliques = v('cliques') || [];
  const eventos = v('eventos') || [];
  const valores = {
    velocidade: v('velocidade') ? Number(v('velocidade')[0]) || 0 : undefined,
    aceleracao: v('perfil') ? v('perfil')[0] === 1 : undefined,
    natural: um('natural'),
    canhoto: um('canhoto'),
    tocar: um('tocar'),
    digitando: um('digitando'),
    doisDedos: v('rolagem') ? v('rolagem')[0] === 1 : undefined,
    cliqueDedos: v('clique') ? v('clique')[1] === 1 : undefined,
    comMouse: v('evento') ? v('evento')[1] === 1 : undefined,
  };
  const pode = {
    velocidade: !!v('velocidade'),
    aceleracao: !!v('perfil') && perfis[0] === 1 && perfis[1] === 1,
    natural: !!v('natural'),
    canhoto: !!v('canhoto'),
    tocar: !!v('tocar'),
    digitando: !!v('digitando'),
    doisDedos: !!v('rolagem') && rolagens[0] === 1 && rolagens[1] === 1,
    cliqueDedos: !!v('clique') && cliques[0] === 1 && cliques[1] === 1,
    comMouse: !!v('evento') && eventos[1] === 1,
  };
  return { tipo: v('tocar') ? 'touchpad' : 'mouse', valores, pode, campos: { perfil: (v('perfil') || []).length, rolagem: (v('rolagem') || []).length, clique: (v('clique') || []).length, evento: (v('evento') || []).length } };
}

// Os valores de uma propriedade de vários campos, com um só ligado (os outros desligados).
const so = (n, i) => Array.from({ length: n }, (_, k) => (k === i ? '1' : '0'));

/**
 * O que mudar num aparelho para ele ficar como as escolhas: [[propriedade, [valores]]].
 * As escolhas: { canhoto, mouse: { velocidade, aceleracao, natural }, touchpad: { …, tocar,
 * digitando, doisDedos, cliqueDedos, comMouse } }; o que não vier fica como está.
 */
function ajustesPara(ap, escolhas = {}) {
  if (!ap) return [];
  const e = { ...(escolhas[ap.tipo] || {}), canhoto: escolhas.canhoto };
  const r = [];
  const muda = (k) => e[k] !== undefined && e[k] !== null && ap.pode[k] && e[k] !== ap.valores[k];
  const bool = (k) => { if (muda(k)) r.push([P[k], [e[k] ? '1' : '0']]); };
  if (ap.pode.velocidade && typeof e.velocidade === 'number') {
    const vel = Math.max(-1, Math.min(1, e.velocidade));
    if (Math.abs(vel - (ap.valores.velocidade || 0)) > 0.005) r.push([P.velocidade, [vel.toFixed(2)]]);
  }
  if (muda('aceleracao')) r.push([P.perfil, so(ap.campos.perfil, e.aceleracao ? 0 : 1)]);
  bool('natural');
  bool('canhoto');
  bool('tocar');
  bool('digitando');
  if (muda('doisDedos')) r.push([P.rolagem, so(ap.campos.rolagem, e.doisDedos ? 0 : 1)]);
  if (muda('cliqueDedos')) r.push([P.clique, so(ap.campos.clique, e.cliqueDedos ? 1 : 0)]);
  if (muda('comMouse')) r.push([P.evento, e.comMouse ? ['0', '1'] : ['0', '0']]);
  return r;
}

/** As escolhas que chegam da área de trabalho, só com o que se conhece e nos limites. */
function limparEscolhas(x) {
  const e = x && typeof x === 'object' ? x : {};
  const parte = (o, chaves) => {
    const r = {};
    if (!o || typeof o !== 'object') return r;
    if (typeof o.velocidade === 'number' && Number.isFinite(o.velocidade)) r.velocidade = Math.round(Math.max(-1, Math.min(1, o.velocidade)) * 100) / 100;
    for (const k of chaves) if (typeof o[k] === 'boolean') r[k] = o[k];
    return r;
  };
  const r = { mouse: parte(e.mouse, ['aceleracao', 'natural']), touchpad: parte(e.touchpad, ['aceleracao', 'natural', 'tocar', 'digitando', 'doisDedos', 'cliqueDedos', 'comMouse']) };
  if (typeof e.canhoto === 'boolean') r.canhoto = e.canhoto;
  return r;
}

class Mouse {
  constructor({ plataforma = process.platform, sistema = false } = {}) {
    this.plataforma = plataforma;
    this.sistema = sistema;
    this.vistos = new Set();
  }

  xinput(args) { return rodar(args); }

  disponivel() {
    return this.sistema && this.plataforma === 'linux' && !!process.env.DISPLAY && ['/usr/bin/xinput', '/bin/xinput'].some((p) => fs.existsSync(p));
  }

  async aparelhos() {
    const lista = lerLista(await this.xinput(['list']));
    const r = [];
    for (const a of lista) {
      const ap = aparelhoDe(lerPropriedades(await this.xinput(['list-props', String(a.id)]).catch(() => '')));
      if (ap) r.push({ id: a.id, nome: a.nome, ...ap });
    }
    return r;
  }

  /** { disponivel, aparelhos: [{ id, nome, tipo, valores, pode }] } */
  async estado() {
    if (!this.disponivel()) return { disponivel: false };
    try {
      const aparelhos = await this.aparelhos();
      return { disponivel: true, aparelhos: aparelhos.map(({ campos, ...a }) => a) };
    } catch {
      return { disponivel: false };
    }
  }

  /** Aplica as escolhas a todos os aparelhos (ou só aos de ids). */
  async aplicar(escolhas, ids = null) {
    if (!this.disponivel()) return { ok: false, erro: 'xinput' };
    const erros = [];
    let aparelhos;
    try { aparelhos = await this.aparelhos(); } catch (e) { return { ok: false, erro: (e.saida || e.message || '').split('\n').pop() }; }
    for (const ap of aparelhos) {
      this.vistos.add(ap.id);
      if (ids && !ids.includes(ap.id)) continue;
      for (const [prop, valores] of ajustesPara(ap, escolhas)) {
        try { await this.xinput(['set-prop', String(ap.id), prop, ...valores]); } catch (e) { erros.push(`${ap.nome}: ${(e.saida || e.message || '').split('\n').pop()}`); }
      }
    }
    return erros.length ? { ok: false, erro: erros.join('; ') } : { ok: true };
  }

  /**
   * De tempos em tempos, confere se um aparelho novo apareceu (um mouse sem fio ligado depois,
   * um que voltou da suspensão) e lhe dá as escolhas guardadas.
   */
  vigiar(escolhas, ms = 15000) {
    if (!this.disponivel() || this.relogio) return;
    this.relogio = setInterval(async () => {
      const e = escolhas();
      if (!e || this.ocupado) return;
      this.ocupado = true;
      try {
        const ids = (await this.xinput(['list', '--id-only'])).split('\n').map(Number).filter((n) => n > 0);
        const novos = ids.filter((id) => !this.vistos.has(id));
        if (novos.length) await this.aplicar(e, novos);
        for (const id of novos) this.vistos.add(id);
      } catch { } finally { this.ocupado = false; }
    }, ms);
    this.relogio.unref?.();
  }

  parar() { clearInterval(this.relogio); this.relogio = null; }
}

/**
 * Para os testes e as capturas (RETRO_MOUSE_FALSO=1): um mouse sem fio e o touchpad de um
 * notebook, com o xinput imitado na memória (o mesmo caminho de leitura e de ajuste).
 */
class MouseFalso extends Mouse {
  constructor(o) {
    super(o);
    this.feitos = [];
    const comum = { 'Device Enabled': [1], [P.velocidade]: [0], [P.perfis]: [1, 1], [P.perfil]: [1, 0], [P.natural]: [0], [P.canhoto]: [0], [P.eventos]: [1, 0], [P.evento]: [0, 0] };
    this.props = {
      10: { nome: 'Logitech Wireless Mouse', p: { ...comum } },
      12: { nome: 'SynPS/2 Synaptics TouchPad', p: { ...comum, [P.eventos]: [1, 1], [P.natural]: [1], [P.tocar]: [1], [P.digitando]: [1], [P.rolagens]: [1, 1, 0], [P.rolagem]: [1, 0, 0], [P.cliques]: [1, 1], [P.clique]: [1, 0] } },
    };
  }

  disponivel() { return true; }

  async xinput(args) {
    if (args[0] === 'list' && args[1] === '--id-only') return '2\n4\n10\n12\n3\n5\n';
    if (args[0] === 'list') {
      return ['⎡ Virtual core pointer\tid=2\t[master pointer  (3)]', '⎜   ↳ Virtual core XTEST pointer\tid=4\t[slave  pointer  (2)]',
        ...Object.entries(this.props).map(([id, a]) => `⎜   ↳ ${a.nome}\tid=${id}\t[slave  pointer  (2)]`),
        '⎣ Virtual core keyboard\tid=3\t[master keyboard (2)]', '    ↳ Virtual core XTEST keyboard\tid=5\t[slave  keyboard (3)]'].join('\n');
    }
    const a = this.props[args[1]];
    if (!a) throw Object.assign(new Error('unable to find device'), { saida: `unable to find device ${args[1]}` });
    if (args[0] === 'list-props') {
      let n = 200;
      return `Device '${a.nome}':\n` + Object.entries(a.p).map(([k, v]) => `\t${k} (${n++}):\t${v.map((x) => (Number.isInteger(x) && k !== P.velocidade ? x : Number(x).toFixed(6))).join(', ')}`).join('\n') + '\n';
    }
    if (args[0] === 'set-prop') {
      if (!(args[2] in a.p)) throw Object.assign(new Error('property'), { saida: `property '${args[2]}' doesn't exist` });
      a.p[args[2]] = args.slice(3).map(Number);
      this.feitos.push([Number(args[1]), args[2], args.slice(3)]);
      return '';
    }
    return '';
  }
}

module.exports = { Mouse, MouseFalso, lerLista, lerPropriedades, aparelhoDe, ajustesPara, limparEscolhas, PROPS: P };
