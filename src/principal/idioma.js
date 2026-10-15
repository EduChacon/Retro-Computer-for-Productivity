'use strict';
/*
 * Os idiomas no processo principal (as caixas do sistema, os erros do disco,
 * o Leia-me). Os mesmos catálogos da área de trabalho: src/sistema/idiomas.
 */
const fs = require('node:fs');
const path = require('node:path');

const PASTA = path.join(__dirname, '..', 'sistema', 'idiomas');
const CODIGOS = ['pt-BR', 'en', 'es'];

// Os nomes das pastas do disco em cada idioma (criadas na primeira vez).
const PASTAS = {
  'pt-BR': { documentos: 'Meus documentos', mesa: 'Área de trabalho', recebidos: 'Recebidos', leiame: 'Leia-me.txt' },
  en: { documentos: 'Documents', mesa: 'Desktop', recebidos: 'Received', leiame: 'Read me.txt' },
  es: { documentos: 'Mis documentos', mesa: 'Escritorio', recebidos: 'Recibidos', leiame: 'Léame.txt' },
};

let atual = 'pt-BR';
let catalogo = {};

/** O idioma escolhido ('auto' segue o do sistema). */
function resolver(preferido, doSistema) {
  if (CODIGOS.includes(preferido)) return preferido;
  const s = String(doSistema || '').toLowerCase();
  if (s.startsWith('pt')) return 'pt-BR';
  if (s.startsWith('es')) return 'es';
  return 'en';
}

function definir(cod) {
  atual = CODIGOS.includes(cod) ? cod : 'pt-BR';
  catalogo = {};
  if (atual !== 'pt-BR') {
    try { catalogo = JSON.parse(fs.readFileSync(path.join(PASTA, `${atual}.json`), 'utf8')); } catch { }
  }
  return atual;
}

function tr(texto, vars) {
  let s = atual === 'pt-BR' ? texto : (catalogo[texto] || texto);
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}

function idioma() {
  return atual;
}

module.exports = { tr, definir, resolver, idioma, PASTAS, CODIGOS };
