'use strict';
/*
 * O histórico da área de transferência (a tecla do logotipo com V, como no Windows 10): os
 * últimos textos copiados em qualquer programa. Fica só na memória: nada vai para o disco,
 * e tudo some ao fechar o Retro Computer. O que os gerenciadores de senhas marcam como
 * secreto fica de fora.
 *
 * O Electron não avisa quando a área de transferência muda: ela é lida de tempos em tempos,
 * mais devagar quando ninguém mexe no computador. (Desde o Electron 44, a leitura e a escrita
 * devolvem promessas, como o navigator.clipboard das páginas.)
 */

const MAX = 25; // itens guardados (os fixados não contam)
const TAMANHO_MAX = 200000; // caracteres de um item: um texto maior entra cortado
const RAPIDO = 1000; // ms entre uma leitura e outra, com alguém usando o computador
const DEVAGAR = 5000; // e depois de um minuto parado
const PARADO = 60; // s sem teclado nem mouse
const ESPERA_MAX = 3000; // ms: um programa que não responde à leitura não trava o histórico

// As marcas dos gerenciadores de senhas (KeePassXC, Bitwarden, 1Password…) para "não guarde isto":
// a do KDE, a do Windows e a do macOS (nspasteboard.org). São formatos do próprio sistema, que o
// Electron confere pelo tipo "electron application/osclipboard".
const SECRETOS = ['x-kde-passwordManagerHint', 'ExcludeClipboardContentFromMonitorProcessing', 'org.nspasteboard.ConcealedType', 'org.nspasteboard.TransientType'];
const formatoDoSistema = (f) => `electron application/osclipboard;format="${f}"`;
function comPrazo(p, ms, senao) {
  let timer;
  const prazo = new Promise((ok) => { timer = setTimeout(() => ok(senao), ms); });
  return Promise.race([Promise.resolve(p), prazo]).finally(() => clearTimeout(timer));
}

/** Um item novo na lista: o mesmo texto sobe para o topo (sem repetir); os fixados ficam. */
function acrescentar(itens, texto, { id, quando, max = MAX } = {}) {
  const antes = itens.find((i) => i.texto === texto);
  const resto = itens.filter((i) => i !== antes);
  const novo = { id, texto, quando, fixado: !!(antes && antes.fixado) };
  const lista = [novo, ...resto];
  // Os mais antigos saem primeiro, menos os fixados.
  let soltos = lista.filter((i) => !i.fixado).length;
  for (let k = lista.length - 1; k >= 0 && soltos > max; k--) {
    if (!lista[k].fixado) { lista.splice(k, 1); soltos--; }
  }
  return lista;
}

class HistoricoTransferencia {
  /**
   * @param {object} o
   * @param {Electron.Clipboard} o.clipboard
   * @param {() => number} [o.parado] os segundos sem uso (powerMonitor.getSystemIdleTime)
   * @param {() => void} [o.aoMudar]
   */
  constructor({ clipboard, parado = () => 0, aoMudar = () => { } }) {
    this.clipboard = clipboard;
    this.parado = parado;
    this.aoMudar = aoMudar;
    this.itens = [];
    this.ligado = false;
    this.ultimo = null; // o texto da última leitura
    this.primeira = true; // a primeira leitura só guarda o que já estava lá (pode ser uma senha de antes)
    this.timer = null;
    this.lendo = null; // a leitura em andamento (uma de cada vez)
    this.contador = 0;
  }

  ligar(v) {
    v = !!v;
    if (v === this.ligado) return;
    this.ligado = v;
    clearTimeout(this.timer);
    this.timer = null;
    if (!v) {
      // Desligado, o histórico some (como no Windows).
      this.itens = [];
      this.aoMudar();
      return;
    }
    // O que já estava copiado antes de ligar não entra (pode ser uma senha de antes).
    this.primeira = true;
    this.agendar(0);
  }

  agendar(ms) {
    if (!this.ligado) return;
    if (ms == null) ms = this.parado() >= PARADO ? DEVAGAR : RAPIDO;
    this.timer = setTimeout(async () => {
      await this.olhar();
      this.agendar();
    }, ms);
    if (this.timer.unref) this.timer.unref();
  }

  async secreto() {
    for (const f of SECRETOS) {
      try { if (await comPrazo(this.clipboard.has(formatoDoSistema(f)), ESPERA_MAX, false)) return true; } catch { }
    }
    return false;
  }

  /** O texto de agora (null quando a leitura não respondeu a tempo). */
  async lerTexto() {
    try {
      const t = await comPrazo(this.clipboard.readText(), ESPERA_MAX, null);
      return t == null ? null : String(t);
    } catch {
      return '';
    }
  }

  /** Uma leitura: um texto novo entra no topo. */
  olhar() {
    if (!this.lendo) this.lendo = this.olharJa().finally(() => { this.lendo = null; });
    return this.lendo;
  }

  async olharJa() {
    const t = await this.lerTexto();
    if (t == null || !this.ligado) return false;
    if (this.primeira) { this.primeira = false; this.ultimo = t; return false; }
    if (t === this.ultimo) return false;
    this.ultimo = t;
    if (!t.trim() || await this.secreto()) return false;
    this.itens = acrescentar(this.itens, t.slice(0, TAMANHO_MAX), { id: ++this.contador, quando: Date.now() });
    this.aoMudar();
    return true;
  }

  async listar() {
    // O que acabou de ser copiado aparece mesmo que a leitura seguinte ainda não tenha vindo.
    if (this.ligado) await this.olhar();
    return { ligado: this.ligado, itens: this.itens.map((i) => ({ ...i })) };
  }

  /** Põe o item de volta na área de transferência (e no topo da lista). */
  async usar(id) {
    const it = this.itens.find((i) => i.id === Number(id));
    if (!it) return false;
    this.ultimo = it.texto;
    await this.clipboard.writeText(it.texto);
    this.itens = acrescentar(this.itens, it.texto, { id: it.id, quando: it.quando });
    this.aoMudar();
    return true;
  }

  apagar(id) {
    const antes = this.itens.length;
    this.itens = this.itens.filter((i) => i.id !== Number(id));
    if (this.itens.length !== antes) this.aoMudar();
    return true;
  }

  fixar(id, v) {
    const it = this.itens.find((i) => i.id === Number(id));
    if (!it) return false;
    it.fixado = !!v;
    this.aoMudar();
    return true;
  }

  /** Limpar tudo: os fixados ficam (como no Windows). */
  limpar() {
    this.itens = this.itens.filter((i) => i.fixado);
    this.aoMudar();
    return true;
  }
}

module.exports = { HistoricoTransferencia, acrescentar, MAX, SECRETOS };
