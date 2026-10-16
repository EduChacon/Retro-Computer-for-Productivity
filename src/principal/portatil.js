'use strict';
/*
 * O modo portátil: com uma pasta "Retro Computer (dados)" ao lado do programa (o "Retro
 * Computer.exe" do .zip do Windows, o AppImage do Linux ou o aplicativo do Mac), as
 * configurações, os programas instalados e o disco C: ficam dentro dela. Num pendrive, tudo vai
 * junto, e nada fica no computador emprestado. O disco C: é sempre "Disco C" dentro da pasta,
 * porque a letra ou o caminho do pendrive muda de um computador para outro.
 */
const fs = require('node:fs');
const path = require('node:path');

const NOME = 'Retro Computer (dados)';

/** A pasta onde o programa está (a do .exe, a do AppImage ou a do .app no Mac). */
function pastaDoPrograma({ env = process.env, exe, plataforma = process.platform } = {}) {
  if (env.PORTABLE_EXECUTABLE_DIR) return env.PORTABLE_EXECUTABLE_DIR;
  if (env.APPIMAGE) return path.dirname(env.APPIMAGE);
  if (plataforma === 'darwin') {
    const i = String(exe).indexOf('.app/');
    if (i >= 0) return path.dirname(String(exe).slice(0, i + 4));
  }
  return path.dirname(String(exe));
}

/** A pasta dos dados portáteis, se existir ao lado do programa; senão, null. */
function pastaPortatil(o = {}, existe = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } }) {
  const p = path.join(pastaDoPrograma(o), NOME);
  return existe(p) ? p : null;
}

/** Onde cada coisa fica no modo portátil. */
function caminhosPortateis(pasta) {
  return { dados: path.join(pasta, 'Sistema'), disco: path.join(pasta, 'Disco C') };
}

module.exports = { NOME, pastaDoPrograma, pastaPortatil, caminhosPortateis };
