'use strict';
/*
 * As saídas de som e os microfones (Painel de controle › Sons › Reprodução e Gravação).
 *
 * No Linux, pelo pactl, que responde tanto no PulseAudio quanto no PipeWire (com o
 * pipewire-pulse, o padrão do Linux Mint e do Ubuntu): a lista, a padrão, o volume e o mudo do
 * microfone. Trocar a saída leva junto o que já está tocando (e trocar o microfone, o que já está
 * gravando). No Windows e no macOS, quem escolhe é o próprio sistema: o Painel abre as
 * configurações de som dele.
 *
 * RETRO_SOM_FALSO=1: duas saídas e dois microfones de mentira, para as capturas.
 */
const { execFile } = require('node:child_process');

/** Roda um comando e devolve a saída (em inglês, para ler sempre do mesmo jeito). */
function rodar(cmd, args, { timeout = 6000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 8 << 20, env: { ...process.env, LC_ALL: 'C', LANG: 'C' } }, (erro, saida, serr) => {
      if (erro) { erro.saida = String(serr || saida || '').trim(); return reject(erro); }
      resolve(String(saida));
    });
  });
}

/* ---------- Leitura das saídas do pactl (funções puras, testadas em testes/som.test.js) ---------- */

/** "pactl list sinks" ou "pactl list sources": [{ indice, nome, descricao, monitorDe, mudo, volume }]. */
function lerLista(s) {
  const itens = [];
  let atual = null;
  for (const linha of String(s).split('\n')) {
    const cab = /^(?:Sink|Source) #(\d+)/.exec(linha);
    if (cab) {
      atual = { indice: Number(cab[1]), nome: '', descricao: '', monitorDe: '', mudo: false, volume: null };
      itens.push(atual);
      continue;
    }
    // Só as linhas de primeiro nível ("\tName: …"); as das propriedades e das portas ficam mais para dentro.
    const m = /^\t([A-Z][A-Za-z ]*):\s?(.*)$/.exec(linha);
    if (!atual || !m) continue;
    const [, chave, valor] = m;
    if (chave === 'Name') atual.nome = valor.trim();
    else if (chave === 'Description') atual.descricao = valor.trim();
    else if (chave === 'Monitor of Sink') atual.monitorDe = valor.trim() === 'n/a' ? '' : valor.trim();
    else if (chave === 'Mute') atual.mudo = /^yes/i.test(valor.trim());
    else if (chave === 'Volume' && atual.volume == null) {
      const p = /(\d+)%/.exec(valor);
      if (p) atual.volume = Number(p[1]);
    }
  }
  return itens.filter((x) => x.nome);
}

/** "pactl info": { saida, entrada } (os nomes das padrão). */
function lerInfo(s) {
  const saida = /^Default Sink:\s*(.+)$/m.exec(s);
  const entrada = /^Default Source:\s*(.+)$/m.exec(s);
  return { saida: saida ? saida[1].trim() : '', entrada: entrada ? entrada[1].trim() : '' };
}

/** "pactl list short sink-inputs" (ou source-outputs): os números do que está tocando (ou gravando). */
function lerCurtos(s) {
  return String(s).split('\n').map((l) => l.split('\t')[0].trim()).filter((x) => /^\d+$/.test(x));
}

/** As saídas e os microfones para a tela: os "monitores" (o som que sai, gravado) ficam de fora. */
function montarEstado(sinks, sources, padrao) {
  const saidas = sinks.map((x) => ({ id: x.nome, nome: x.descricao || x.nome, padrao: x.nome === padrao.saida }));
  const reais = sources.filter((x) => !x.monitorDe && !/\.monitor$/.test(x.nome));
  const entradas = reais.map((x) => ({ id: x.nome, nome: x.descricao || x.nome, padrao: x.nome === padrao.entrada }));
  const mic = reais.find((x) => x.nome === padrao.entrada);
  return { disponivel: true, saidas, entradas, microfone: mic ? { nivel: mic.volume == null ? 100 : mic.volume, mudo: mic.mudo } : null };
}

class Som {
  constructor({ plataforma = process.platform } = {}) {
    this.plataforma = plataforma;
    this.temPactl = undefined;
  }

  async pactl() {
    if (this.plataforma !== 'linux') return false;
    if (this.temPactl === undefined) this.temPactl = await rodar('pactl', ['info'], { timeout: 3000 }).then(() => true, () => false);
    return this.temPactl;
  }

  /** { disponivel, saidas, entradas, microfone } ou, fora do Linux, { disponivel: false, sistema: true }. */
  async estado() {
    if (!(await this.pactl())) return { disponivel: false, sistema: this.plataforma !== 'linux' };
    const [info, sinks, sources] = await Promise.all([rodar('pactl', ['info']), rodar('pactl', ['list', 'sinks']), rodar('pactl', ['list', 'sources'])]);
    return montarEstado(lerLista(sinks), lerLista(sources), lerInfo(info));
  }

  /** A saída padrão; o que está tocando vai junto. */
  async escolherSaida(id) {
    const nome = String(id || '');
    if (!nome || !(await this.pactl())) return this.estado();
    await rodar('pactl', ['set-default-sink', nome]);
    for (const n of lerCurtos(await rodar('pactl', ['list', 'short', 'sink-inputs']).catch(() => ''))) {
      await rodar('pactl', ['move-sink-input', n, nome]).catch(() => { });
    }
    return this.estado();
  }

  /** O microfone padrão; o que está gravando vai junto. */
  async escolherEntrada(id) {
    const nome = String(id || '');
    if (!nome || !(await this.pactl())) return this.estado();
    await rodar('pactl', ['set-default-source', nome]);
    for (const n of lerCurtos(await rodar('pactl', ['list', 'short', 'source-outputs']).catch(() => ''))) {
      await rodar('pactl', ['move-source-output', n, nome]).catch(() => { });
    }
    return this.estado();
  }

  /** O volume (0 a 100) e o mudo do microfone padrão. */
  async microfone({ nivel, mudo } = {}) {
    if (!(await this.pactl())) return this.estado();
    if (nivel != null) await rodar('pactl', ['set-source-volume', '@DEFAULT_SOURCE@', Math.max(0, Math.min(100, Math.round(Number(nivel) || 0))) + '%']);
    if (mudo != null) await rodar('pactl', ['set-source-mute', '@DEFAULT_SOURCE@', mudo ? '1' : '0']);
    return this.estado();
  }
}

/** A versão de mentira: um notebook com um fone Bluetooth pareado. */
class SomFalso {
  constructor() {
    this.saidas = [
      // Os nomes como o Linux os dá (o pactl fala inglês).
      { id: 'alsa_output.pci-0000_00_1f.3.analog-stereo', nome: 'Built-in Audio Analog Stereo' },
      { id: 'bluez_output.00_1B_66_A1_B2_C3.1', nome: 'Wireless Headphones' },
      { id: 'alsa_output.pci-0000_00_1f.3.hdmi-stereo', nome: 'Built-in Audio Digital Stereo (HDMI)' },
    ];
    this.entradas = [
      { id: 'alsa_input.pci-0000_00_1f.3.analog-stereo', nome: 'Built-in Audio Analog Stereo' },
      { id: 'bluez_input.00_1B_66_A1_B2_C3.0', nome: 'Wireless Headphones (Headset)' },
    ];
    this.saida = this.saidas[0].id;
    this.entrada = this.entradas[0].id;
    this.mic = { nivel: 70, mudo: false };
  }

  async estado() {
    return {
      disponivel: true,
      saidas: this.saidas.map((x) => ({ ...x, padrao: x.id === this.saida })),
      entradas: this.entradas.map((x) => ({ ...x, padrao: x.id === this.entrada })),
      microfone: { ...this.mic },
    };
  }

  async escolherSaida(id) { if (this.saidas.some((x) => x.id === id)) this.saida = id; return this.estado(); }
  async escolherEntrada(id) { if (this.entradas.some((x) => x.id === id)) this.entrada = id; return this.estado(); }
  async microfone({ nivel, mudo } = {}) {
    if (nivel != null) this.mic.nivel = Math.max(0, Math.min(100, Math.round(nivel)));
    if (mudo != null) this.mic.mudo = !!mudo;
    return this.estado();
  }
}

module.exports = { Som, SomFalso, lerLista, lerInfo, lerCurtos, montarEstado };
