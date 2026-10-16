'use strict';
/*
 * A cópia de segurança do disco C: para outra pasta (um disco externo, um pendrive, uma pasta
 * da nuvem do computador principal), de tempos em tempos (todo dia ou toda semana) ou na hora.
 *
 * Nada se perde: a cópia só acrescenta e atualiza. Um arquivo excluído do disco C: continua na
 * cópia, e a Lixeira e as versões anteriores (.lixeira e .versoes) vão junto. Cada arquivo é
 * copiado com um nome provisório e só então ganha o nome certo: uma cópia interrompida no meio
 * (o pendrive tirado) não estraga a anterior.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const DIA = 24 * 60 * 60 * 1000;
const INTERVALOS = { diaria: DIA, semanal: 7 * DIA };
const PARCIAL = '.retro-parcial';

/** O destino não pode ficar dentro do disco C:, nem o disco C: dentro dele (a cópia se copiaria). */
function destinoValido(origem, destino) {
  if (!destino || !path.isAbsolute(destino)) return false;
  const dentro = (a, b) => { const r = path.relative(a, b); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };
  const o = path.resolve(origem);
  const d = path.resolve(destino);
  return !dentro(o, d) && !dentro(d, o);
}

/** Precisa copiar? (o arquivo não está na cópia, ou mudou de tamanho, ou é mais novo) */
function mudou(stOrigem, stDestino) {
  if (!stDestino) return true;
  return stOrigem.size !== stDestino.size || stOrigem.mtimeMs > stDestino.mtimeMs + 1000;
}

/** Já passou da hora? (sem nenhuma cópia, sim) */
function venceu(ultima, quando, agora = Date.now()) {
  const intervalo = INTERVALOS[quando] || DIA;
  return !ultima || agora - ultima >= intervalo;
}

/** Todos os arquivos de uma pasta, com o caminho relativo (os atalhos simbólicos ficam de fora). */
async function* arquivosDe(raiz, rel = '') {
  let itens;
  try { itens = await fsp.readdir(path.join(raiz, rel), { withFileTypes: true }); } catch { return; }
  for (const it of itens) {
    const r = rel ? `${rel}/${it.name}` : it.name;
    if (it.isSymbolicLink()) continue;
    if (it.isDirectory()) yield* arquivosDe(raiz, r);
    else if (it.isFile() && !it.name.endsWith(PARCIAL)) yield r;
  }
}

class CopiaSeguranca {
  constructor({ origem }) {
    this.origem = origem; // () => a pasta do disco C:
    this.rodando = null;
  }

  /**
   * Faz a cópia de origem para destino/pasta.
   * @returns {Promise<{ok, copiados, iguais, bytes, erros, pasta}>}
   */
  fazer({ destino, pasta, aoProgresso = () => { } }) {
    if (this.rodando) return this.rodando;
    this.rodando = this.copiar({ destino, pasta, aoProgresso }).finally(() => { this.rodando = null; });
    return this.rodando;
  }

  async copiar({ destino, pasta, aoProgresso }) {
    const origem = this.origem();
    if (!destinoValido(origem, destino)) return { ok: false, erro: 'destino' };
    if (!fs.existsSync(destino)) return { ok: false, erro: 'semDestino' };
    const alvo = path.join(destino, pasta);
    // O que falta copiar, e quanto espaço isso pede.
    const fila = [];
    let bytes = 0;
    let iguais = 0;
    for await (const rel of arquivosDe(origem)) {
      let so;
      try { so = await fsp.stat(path.join(origem, rel)); } catch { continue; }
      let sd = null;
      try { sd = await fsp.stat(path.join(alvo, rel)); } catch { }
      if (mudou(so, sd)) { fila.push([rel, so]); bytes += so.size; } else iguais++;
    }
    try {
      const s = await fsp.statfs(destino);
      if (s.bavail * s.bsize < bytes + 16 * 1024 * 1024) return { ok: false, erro: 'espaco', bytes, livre: s.bavail * s.bsize };
    } catch { }
    const erros = [];
    let copiados = 0;
    let feitos = 0;
    for (const [rel, st] of fila) {
      const final = path.join(alvo, rel);
      const parcial = final + PARCIAL;
      try {
        await fsp.mkdir(path.dirname(final), { recursive: true });
        await fsp.copyFile(path.join(origem, rel), parcial);
        await fsp.utimes(parcial, st.atime, st.mtime);
        await fsp.rename(parcial, final);
        copiados++;
      } catch (e) {
        await fsp.rm(parcial, { force: true }).catch(() => { });
        erros.push(`${rel}: ${e.code || e.message}`);
        // O destino sumiu (o pendrive foi tirado): para aqui.
        if (!fs.existsSync(destino)) return { ok: false, erro: 'semDestino', copiados, iguais, bytes, erros, pasta: alvo };
      }
      feitos += st.size;
      aoProgresso({ copiados, total: fila.length, bytes: feitos, totalBytes: bytes });
    }
    return { ok: erros.length === 0, copiados, iguais, bytes, erros: erros.slice(0, 5), pasta: alvo };
  }
}

module.exports = { CopiaSeguranca, destinoValido, mudou, venceu, arquivosDe, INTERVALOS };
