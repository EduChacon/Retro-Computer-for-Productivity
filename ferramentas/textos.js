#!/usr/bin/env node
/*
 * Os textos da interface: acha todo tr('…') e marcar('…') em src/ e confere se
 * cada um tem tradução em src/sistema/idiomas/en.json e es.json.
 *
 *   node ferramentas/textos.js            lista o que falta (e o que sobra)
 *   node ferramentas/textos.js --novos    mostra o que falta como JSON, para colar nos catálogos
 *   node ferramentas/textos.js --chaves   todas as chaves, como JSON (na ordem em que aparecem)
 *
 * O texto em português é a chave; os {nomes} entre chaves são trocados na hora.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PASTA_IDIOMAS = path.join(RAIZ, 'src', 'sistema', 'idiomas');
const IDIOMAS = ['en', 'es'];

// tr('…'), tr("…"), marcar('…'): o primeiro argumento, quando é um texto fixo.
const PADRAO = /\b(?:tr|marcar)\(\s*('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")/g;

function arquivos(pasta, lista = []) {
  for (const nome of fs.readdirSync(pasta)) {
    const c = path.join(pasta, nome);
    if (nome === 'vendor' || nome === 'node_modules') continue;
    if (fs.statSync(c).isDirectory()) arquivos(c, lista);
    else if (/\.(m?js)$/.test(nome)) lista.push(c);
  }
  return lista;
}

/** O texto de um literal de JavaScript ('a\nb' → a, quebra, b). */
function lerLiteral(lit) {
  const q = lit[0];
  const miolo = lit.slice(1, -1).replace(/\\(.)/g, (m, c) => (c === 'n' ? '\n' : c === 't' ? '\t' : c === q || c === '\\' || c === '"' || c === "'" ? c : m));
  return miolo;
}

/** Todas as chaves usadas no código: chave → [onde aparece]. */
function extrair() {
  const chaves = new Map();
  for (const arq of arquivos(path.join(RAIZ, 'src'))) {
    const t = fs.readFileSync(arq, 'utf8');
    for (const m of t.matchAll(PADRAO)) {
      const chave = lerLiteral(m[1]);
      const linha = t.slice(0, m.index).split('\n').length;
      if (!chaves.has(chave)) chaves.set(chave, []);
      chaves.get(chave).push(`${path.relative(RAIZ, arq)}:${linha}`);
    }
  }
  return chaves;
}

function catalogo(cod) {
  return JSON.parse(fs.readFileSync(path.join(PASTA_IDIOMAS, cod + '.json'), 'utf8'));
}

/** Os {nomes} de um texto, em ordem. */
const variaveis = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** O que falta, o que sobra e as traduções com {nomes} diferentes da chave. */
function conferir() {
  const chaves = extrair();
  const r = {};
  for (const cod of IDIOMAS) {
    const cat = catalogo(cod);
    r[cod] = {
      faltam: [...chaves.keys()].filter((k) => !(k in cat) || !String(cat[k]).trim()),
      sobram: Object.keys(cat).filter((k) => !chaves.has(k)),
      variaveis: Object.keys(cat).filter((k) => chaves.has(k) && variaveis(k).join() !== variaveis(cat[k]).join()),
    };
  }
  return { chaves, r };
}

module.exports = { extrair, conferir, catalogo, variaveis, IDIOMAS };

if (require.main === module) {
  const { chaves, r } = conferir();
  if (process.argv.includes('--chaves')) {
    console.log(JSON.stringify([...chaves.keys()], null, 2));
  } else if (process.argv.includes('--novos')) {
    const faltam = new Set(IDIOMAS.flatMap((c) => r[c].faltam));
    const o = {};
    for (const k of faltam) o[k] = '';
    console.log(JSON.stringify(o, null, 2));
  } else {
    console.log(`${chaves.size} textos no código.`);
    for (const cod of IDIOMAS) {
      console.log(`\n${cod}: faltam ${r[cod].faltam.length}, sobram ${r[cod].sobram.length}, {nomes} diferentes ${r[cod].variaveis.length}`);
      for (const k of r[cod].faltam) console.log('  falta:', JSON.stringify(k), '←', chaves.get(k)[0]);
      for (const k of r[cod].sobram) console.log('  sobra:', JSON.stringify(k));
      for (const k of r[cod].variaveis) console.log('  {nomes}:', JSON.stringify(k));
    }
  }
}
