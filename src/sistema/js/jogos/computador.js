/*
 * O adversário dos jogos de tabuleiro: manda a partida para o Worker (jogos/pensar.js) e espera
 * o lance. Sem o Worker, pensa aqui mesmo (a janela trava um pouco, mas o jogo segue). O lance
 * nunca chega depressa demais: espera um instante, como quem pensa.
 */

const ESPERA_MIN = 450;

export class Computador {
  constructor() {
    this.w = null;
    this.n = 0;
    this.pendente = null;
  }

  trabalhador() {
    if (this.w) return this.w;
    try {
      this.w = new Worker(new URL('./pensar.js', import.meta.url), { type: 'module' });
      this.w.onmessage = (e) => {
        const p = this.pendente;
        if (!p || e.data.id !== p.id) return;
        this.pendente = null;
        const resta = ESPERA_MIN - (Date.now() - p.inicio);
        setTimeout(() => p.resolver(e.data), Math.max(0, resta));
      };
      this.w.onerror = () => this.semTrabalhador();
    } catch {
      this.w = null;
    }
    return this.w;
  }

  /** Se o Worker falhar, a conta em andamento é feita aqui mesmo. */
  async semTrabalhador() {
    const p = this.pendente;
    this.parar();
    this.falhou = true;
    if (p) p.resolver(await this.aqui(p.dados));
  }

  async aqui(dados) {
    const { pensar } = await import('./pensar.js');
    await new Promise((r) => setTimeout(r, ESPERA_MIN));
    try { return pensar(dados); } catch (e) { return { erro: e.message }; }
  }

  /** Pede o lance. A promessa devolve { uci } (xadrez), { lance } (damas) ou null (cancelado). */
  pensar(dados) {
    this.cancelar();
    const id = ++this.n;
    return new Promise((resolver) => {
      const w = this.falhou ? null : this.trabalhador();
      if (!w) { this.aqui(dados).then((r) => resolver(id === this.n ? r : null)); return; }
      this.pendente = { id, dados, resolver, inicio: Date.now() };
      w.postMessage({ ...dados, id });
    });
  }

  /** Desiste da conta em andamento (um lance desfeito, uma partida nova). */
  cancelar() {
    this.n++;
    if (this.pendente) {
      const p = this.pendente;
      this.pendente = null;
      // O Worker não para no meio da conta: é trocado por outro.
      this.parar();
      p.resolver(null);
    }
  }

  parar() {
    if (this.w) { try { this.w.terminate(); } catch { } }
    this.w = null;
  }

  get pensando() { return !!this.pendente; }
}
