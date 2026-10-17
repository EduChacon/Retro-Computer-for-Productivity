/*
 * O lado do processo principal do processo de trabalho (trabalho-processo.js): abre o processo na
 * primeira tarefa, manda uma de cada vez com um tempo máximo e o fecha depois de um minuto parado.
 * Uma tarefa que passa do tempo encerra o processo (as outras que esperavam falham juntas).
 */
'use strict';
const path = require('path');

const PARADO_MS = 60 * 1000;

class Trabalhos {
  constructor({ utilityProcess, script = path.join(__dirname, 'trabalho-processo.js'), memoriaMb = 3072 } = {}) {
    this.utilityProcess = utilityProcess;
    this.script = script;
    this.memoriaMb = memoriaMb;
    this.proc = null;
    this.pendentes = new Map();
    this.seq = 0;
    this.relogio = null;
  }

  processo() {
    if (this.proc) return this.proc;
    const p = this.utilityProcess.fork(this.script, [], {
      serviceName: 'Retro Computer',
      stdio: 'ignore',
      execArgv: [`--max-old-space-size=${this.memoriaMb}`],
    });
    p.on('message', (m) => {
      const t = m && this.pendentes.get(m.id);
      if (!t) return;
      this.pendentes.delete(m.id);
      if (m.ok) t.ok(m.r);
      else t.falha(Object.assign(new Error(m.mensagem || m.codigo), { codigo: m.codigo, indice: m.indice }));
      this.agendarFim();
    });
    p.on('exit', () => {
      if (this.proc === p) this.proc = null;
      // Caiu no meio (a memória acabou, um erro sem tratamento): quem esperava fica sabendo.
      for (const t of this.pendentes.values()) t.falha(Object.assign(new Error('caiu'), { codigo: 'caiu' }));
      this.pendentes.clear();
    });
    this.proc = p;
    return p;
  }

  agendarFim() {
    clearTimeout(this.relogio);
    if (this.pendentes.size) return;
    this.relogio = setTimeout(() => this.encerrar(), PARADO_MS);
    if (this.relogio.unref) this.relogio.unref();
  }

  encerrar() {
    clearTimeout(this.relogio);
    const p = this.proc;
    this.proc = null;
    if (p) { try { p.kill(); } catch { } }
  }

  /** Uma tarefa ('pdf:combinar'…) com os dados dela; devolve o resultado ou o erro com o código. */
  executar(tipo, dados, { tempo = 3 * 60 * 1000 } = {}) {
    clearTimeout(this.relogio);
    return new Promise((ok, falha) => {
      const id = ++this.seq;
      const limite = setTimeout(() => {
        if (!this.pendentes.has(id)) return;
        this.pendentes.delete(id);
        falha(Object.assign(new Error('demorou'), { codigo: 'demorou' }));
        this.encerrar();
      }, tempo);
      this.pendentes.set(id, {
        ok: (v) => { clearTimeout(limite); ok(v); },
        falha: (e) => { clearTimeout(limite); falha(e); },
      });
      try {
        this.processo().postMessage({ id, tipo, dados });
      } catch (e) {
        this.pendentes.delete(id);
        clearTimeout(limite);
        falha(Object.assign(new Error(e.message), { codigo: 'caiu' }));
      }
    });
  }
}

module.exports = { Trabalhos };
