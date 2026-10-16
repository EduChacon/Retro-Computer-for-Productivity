'use strict';
/*
 * O Diário de trabalho: o registro de cada dia num .txt do disco C: (Meus documentos › Diário
 * de trabalho › 2026-10-16.txt), com a hora de cada foco concluído, de cada arquivo alterado
 * (a primeira vez no dia) e das notas escritas pelo usuário. Só acrescenta linhas no fim: o que
 * o usuário escrever no arquivo fica.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');

// Os arquivos de trabalho dos programas (temporários, travas, downloads pela metade) ficam de fora.
const IGNORAR = /(^|\/)(\.|~\$)|~$|\.(tmp|temp|swp|swx|part|crdownload|lock|lck)$/i;

const doisDigitos = (n) => String(n).padStart(2, '0');
/** 2026-10-16.txt */
const nomeDoDia = (d) => `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}.txt`;
const horaDe = (d) => `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
/** "C:\Meus documentos\carta.txt", como a área de trabalho mostra. */
const caminhoTela = (rel) => 'C:\\' + String(rel || '').split('/').filter(Boolean).join('\\');

/** A primeira linha do dia: o título e a data por extenso, sublinhados. */
function cabecalho(titulo, d, localidade) {
  const data = d.toLocaleDateString(localidade, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const linha = `${titulo} — ${data}`;
  return `${linha}\n${'='.repeat(linha.length)}\n\n`;
}

/** Uma linha do diário: a hora e o texto (numa linha só, sem caracteres de controle). */
function linhaDe(d, texto) {
  const t = String(texto || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 300);
  return t ? `${horaDe(d)}  ${t}\n` : '';
}

class Diario {
  /**
   * @param {object} o
   * @param {() => import('./disco').Disco} o.disco
   * @param {() => string} o.pasta       a pasta do diário (caminho interno)
   * @param {() => boolean} o.ligado     anotar sozinho os focos e os arquivos?
   * @param {(t: string, v?: object) => string} o.tr
   * @param {() => string} o.localidade
   */
  constructor({ disco, pasta, ligado, tr, localidade, agora = () => new Date() }) {
    Object.assign(this, { disco, pasta, ligado, tr, localidade, agora });
    this.vistos = new Set(); // os arquivos já anotados hoje
    this.dia = '';
    this.fila = Promise.resolve();
  }

  /** O arquivo de hoje (caminho interno). */
  arquivoDeHoje() {
    return `${this.pasta()}/${nomeDoDia(this.agora())}`;
  }

  /** O arquivo de hoje, criado com o cabeçalho se ainda não existe (para abrir no Bloco de notas). */
  garantirHoje() {
    this.fila = this.fila.then(async () => {
      const d = this.agora();
      const rel = `${this.pasta()}/${nomeDoDia(d)}`;
      const real = this.disco().real(rel);
      await fsp.mkdir(this.disco().real(this.pasta()), { recursive: true });
      if (!fs.existsSync(real)) await fsp.writeFile(real, cabecalho(this.tr('Diário de trabalho'), d, this.localidade()), { encoding: 'utf8', flag: 'wx' }).catch(() => { });
      return rel;
    }).catch(() => null);
    return this.fila;
  }

  /** Acrescenta uma linha no arquivo de hoje (o automático só com o diário ligado). */
  anotar(texto, { sempre = false } = {}) {
    if (!sempre && !this.ligado()) return Promise.resolve(false);
    const d = this.agora();
    const linha = linhaDe(d, texto);
    if (!linha) return Promise.resolve(false);
    // Uma gravação por vez: duas linhas ao mesmo tempo não se misturam.
    this.fila = this.fila.then(async () => {
      const rel = `${this.pasta()}/${nomeDoDia(d)}`;
      const real = this.disco().real(rel);
      await fsp.mkdir(this.disco().real(this.pasta()), { recursive: true });
      const novo = !fs.existsSync(real);
      await fsp.appendFile(real, (novo ? cabecalho(this.tr('Diário de trabalho'), d, this.localidade()) : '') + linha, 'utf8');
      return true;
    }).catch(() => false);
    return this.fila;
  }

  /** Um arquivo do disco mudou: na primeira vez no dia, uma linha no diário. */
  async arquivoMudou(rel) {
    if (!this.ligado() || !rel || IGNORAR.test(rel)) return false;
    const pasta = this.pasta();
    if (rel === pasta || rel.startsWith(pasta + '/')) return false;
    const hoje = nomeDoDia(this.agora());
    if (hoje !== this.dia) { this.dia = hoje; this.vistos.clear(); }
    if (this.vistos.has(rel)) return false;
    // Marcado antes de conferir: o sistema costuma avisar duas ou três vezes da mesma gravação.
    this.vistos.add(rel);
    let st;
    try { st = await fsp.stat(this.disco().real(rel)); } catch { st = null; } // excluído ou movido
    if (!st || !st.isFile()) { this.vistos.delete(rel); return false; }
    return this.anotar(this.tr('Arquivo alterado: {arquivo}', { arquivo: caminhoTela(rel) }));
  }
}

module.exports = { Diario, nomeDoDia, horaDe, cabecalho, linhaDe, IGNORAR };
