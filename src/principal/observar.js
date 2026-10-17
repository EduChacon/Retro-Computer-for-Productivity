'use strict';
/*
 * Observar uma pasta e as de dentro dela. No Windows e no Mac, o fs.watch recursivo do sistema. No
 * Linux, o recursivo do Node vigia cada arquivo pelo inotify do próprio arquivo: depois de uma
 * gravação segura (o temporário renomeado por cima, como o disco C: grava), ele fica preso ao
 * arquivo velho e perde as gravações seguintes feitas no lugar por outro programa. Aqui, no Linux,
 * uma vigia por pasta (o inotify da pasta vê a mudança de qualquer arquivo dela), e as pastas novas
 * passam a ser vigiadas assim que aparecem.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

// Um disco com mais pastas que isso fica com as primeiras vigiadas (o limite do inotify é por usuário).
const MAX_PASTAS = 20000;

/**
 * @param {string} raiz
 * @param {(rel: string) => void} aoEvento  o caminho (com /, relativo à raiz) do que mudou
 * @param {object} [o]
 * @param {(rel: string) => boolean} [o.ignorar]  as pastas que não precisam de vigia (o que muda nelas não avisa)
 * @param {string} [o.plataforma]
 * @param {number} [o.max]
 * @returns {() => void} para de observar
 */
function observarArvore(raiz, aoEvento, { ignorar = () => false, plataforma = process.platform, max = MAX_PASTAS } = {}) {
  if (plataforma !== 'linux') {
    // O mesmo que no Linux: o que muda dentro de uma pasta ignorada não avisa (a própria pasta, sim).
    const dentroDeIgnorada = (rel) => {
      const partes = rel.split('/');
      for (let i = 1; i < partes.length; i++) if (ignorar(partes.slice(0, i).join('/'))) return true;
      return false;
    };
    const w = fs.watch(raiz, { recursive: true }, (_ev, arquivo) => {
      if (!arquivo) return;
      const rel = String(arquivo).split(path.sep).join('/');
      if (!dentroDeIgnorada(rel)) aoEvento(rel);
    });
    w.on('error', () => { });
    return () => w.close();
  }
  const vigias = new Map(); // a pasta ('' = a raiz) → a vigia dela
  let parado = false;
  const remover = (rel) => {
    for (const [r, w] of [...vigias]) {
      if (rel === '' || r === rel || r.startsWith(rel + '/')) { try { w.close(); } catch { } vigias.delete(r); }
    }
  };
  async function adicionar(rel) {
    if (parado || vigias.has(rel) || vigias.size >= max || (rel && ignorar(rel))) return;
    const abs = rel ? path.join(raiz, ...rel.split('/')) : raiz;
    let w;
    try {
      w = fs.watch(abs, (ev, nome) => {
        if (!nome || parado) return;
        const filho = rel ? `${rel}/${nome}` : String(nome);
        aoEvento(filho);
        // Uma pasta nova (criada, trazida ou renomeada para cá) passa a ser vigiada; a que saiu, não mais.
        if (ev === 'rename') {
          fsp.lstat(path.join(abs, String(nome))).then(
            (st) => { if (st.isDirectory()) adicionar(filho).catch(() => { }); },
            () => { if (vigias.has(filho)) remover(filho); });
        }
      });
    } catch {
      return; // sem acesso, ou o limite do inotify
    }
    w.on('error', () => remover(rel));
    vigias.set(rel, w);
    let itens = [];
    try { itens = await fsp.readdir(abs, { withFileTypes: true }); } catch { return; }
    for (const e of itens) {
      // Os links ficam de fora: vigiar por eles seria vigiar fora da raiz.
      if (e.isDirectory() && !e.isSymbolicLink()) await adicionar(rel ? `${rel}/${e.name}` : e.name);
    }
  }
  adicionar('').catch(() => { });
  const parar = () => { parado = true; remover(''); };
  parar.vigias = () => [...vigias.keys()];
  return parar;
}

module.exports = { observarArvore, MAX_PASTAS };
