'use strict';
/*
 * As pastas compactadas: ver o que há num .zip, extrair (tudo ou uma parte) e compactar
 * arquivos e pastas num .zip novo. Os .tar (.tar.gz, .tgz, .tar.xz, .tar.bz2) são extraídos
 * pelo "tar" do sistema (o Linux, o macOS e o Windows 10 em diante têm).
 *
 * Nada sai da pasta de destino (os nomes com ".." ou caminho absoluto são recusados) e nada
 * é gravado por cima: o .zip novo e a pasta extraída recebem um nome livre de quem chama.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const yauzl = require('yauzl');
const yazl = require('yazl');
const { tr } = require('./idioma');

const TAR = /\.(tar|tar\.gz|tgz|tar\.xz|txz|tar\.bz2|tbz2?)$/i;
const ehZip = (nome) => /\.zip$/i.test(nome);
const ehTar = (nome) => TAR.test(nome);
/** O nome sem a extensão de pacote ("fotos.tar.gz" → "fotos"). */
const semExtensao = (nome) => nome.replace(TAR, '').replace(/\.zip$/i, '') || nome;

/** Um nome de dentro do pacote, seguro: sem "..", sem barra no começo, com "/". */
function nomeSeguro(nome) {
  const partes = String(nome).replace(/\\/g, '/').split('/').filter((p) => p && p !== '.');
  if (!partes.length || partes.some((p) => p === '..') || /^[a-z]:$/i.test(partes[0])) return null;
  return partes.join('/');
}

// Contra as "bombas" de compactação (um .zip pequeno que vira gigabytes): a soma do que vai ser
// gravado não passa do espaço livre (menos uma folga), nem as entradas de um número razoável.
const FOLGA = 256 * 1024 * 1024;
const ENTRADAS_MAX = 200000;

async function espacoLivre(pasta) {
  try {
    const s = await fsp.statfs(pasta);
    return s.bavail * s.bsize;
  } catch {
    return Infinity;
  }
}

function grandeDemais() {
  const e = new Error(tr('A pasta compactada é grande demais para o espaço livre do disco.'));
  e.codigo = 'grande';
  return e;
}

/**
 * Depois de extrair um .tar: os atalhos (links simbólicos) que apontam para fora da pasta saem
 * (o disco C: nunca leva a um lugar fora dele). Devolve quantos saíram.
 */
async function tirarLinksDeFora(raiz) {
  let tirados = 0;
  const base = path.resolve(raiz);
  const andar = async (pasta) => {
    for (const d of await fsp.readdir(pasta, { withFileTypes: true })) {
      const abs = path.join(pasta, d.name);
      if (d.isSymbolicLink()) {
        const alvo = path.resolve(pasta, await fsp.readlink(abs));
        if (alvo !== base && !alvo.startsWith(base + path.sep)) { await fsp.unlink(abs); tirados++; }
      } else if (d.isDirectory()) {
        await andar(abs);
      }
    }
  };
  await andar(base);
  return tirados;
}

function abrirZip(arquivo) {
  return new Promise((resolve, reject) => yauzl.open(arquivo, { lazyEntries: true, autoClose: false }, (e, zip) => (e ? reject(e) : resolve(zip))));
}

/** O que há no .zip: [{ nome, pasta, tamanho, compactado, modificado }] (as pastas implícitas também). */
async function listarZip(arquivo) {
  const zip = await abrirZip(arquivo);
  const itens = new Map();
  const pastaImplicita = (nome) => {
    const partes = nome.split('/');
    for (let i = 1; i < partes.length; i++) {
      const p = partes.slice(0, i).join('/');
      if (!itens.has(p)) itens.set(p, { nome: p, pasta: true, tamanho: 0, compactado: 0, modificado: 0 });
    }
  };
  try {
    await new Promise((resolve, reject) => {
      zip.on('error', reject);
      zip.on('end', resolve);
      zip.on('entry', (e) => {
        const pasta = /\/$/.test(e.fileName);
        const nome = nomeSeguro(e.fileName);
        if (nome) {
          pastaImplicita(nome);
          itens.set(nome, { nome, pasta, tamanho: pasta ? 0 : e.uncompressedSize, compactado: pasta ? 0 : e.compressedSize, modificado: e.getLastModDate().getTime() });
        }
        zip.readEntry();
      });
      zip.readEntry();
    });
  } finally {
    zip.close();
  }
  return [...itens.values()];
}

/**
 * Extrai o .zip na pasta de destino (que precisa existir). Com "apenas", só esses nomes
 * (e o que estiver dentro das pastas da lista). Devolve os nomes gravados.
 */
async function extrairZip(arquivo, destino, { apenas = null } = {}) {
  const raiz = path.resolve(destino);
  const quer = apenas && apenas.map(nomeSeguro).filter(Boolean);
  const entra = (nome) => !quer || quer.some((q) => nome === q || nome.startsWith(q + '/'));
  const zip = await abrirZip(arquivo);
  const feitos = [];
  // O tamanho declarado de cada entrada é conferido pelo yauzl na leitura (validateEntrySizes).
  const limite = (await espacoLivre(raiz)) - FOLGA;
  let soma = 0;
  let entradas = 0;
  try {
    await new Promise((resolve, reject) => {
      zip.on('error', reject);
      zip.on('end', resolve);
      const proxima = () => zip.readEntry();
      zip.on('entry', (e) => {
        if (++entradas > ENTRADAS_MAX) return reject(grandeDemais());
        const nome = nomeSeguro(e.fileName);
        if (!nome || !entra(nome)) return proxima();
        soma += e.uncompressedSize || 0;
        if (soma > limite) return reject(grandeDemais());
        const alvo = path.resolve(raiz, ...nome.split('/'));
        if (!alvo.startsWith(raiz + path.sep)) return proxima();
        if (/\/$/.test(e.fileName)) {
          fs.mkdir(alvo, { recursive: true }, (erro) => (erro ? reject(erro) : proxima()));
          return;
        }
        fs.mkdir(path.dirname(alvo), { recursive: true }, (erro) => {
          if (erro) return reject(erro);
          zip.openReadStream(e, (erro2, leitura) => {
            if (erro2) return reject(erro2);
            // "wx": se já existe (dois nomes iguais no pacote), não grava por cima.
            const escrita = fs.createWriteStream(alvo, { flags: 'wx' });
            escrita.on('error', (erro3) => (erro3.code === 'EEXIST' ? (leitura.resume(), proxima()) : reject(erro3)));
            escrita.on('finish', () => {
              feitos.push(nome);
              const data = e.getLastModDate();
              fs.utimes(alvo, data, data, () => proxima());
            });
            leitura.on('error', reject);
            leitura.pipe(escrita);
          });
        });
      });
      proxima();
    });
  } finally {
    zip.close();
  }
  return feitos;
}

/**
 * Extrai um .tar (comprimido ou não) pelo "tar" do sistema. O GNU tar e o bsdtar já recusam os
 * nomes com ".." e o caminho absoluto; os links que apontam para fora da pasta são tirados depois.
 */
async function extrairTar(arquivo, destino) {
  await new Promise((resolve, reject) => {
    execFile('tar', ['-xf', arquivo, '-C', destino], { timeout: 30 * 60 * 1000, windowsHide: true }, (erro, _saida, serr) => {
      if (erro) {
        erro.message = String(serr || erro.message).trim().split('\n')[0];
        return reject(erro);
      }
      resolve();
    });
  });
  return tirarLinksDeFora(destino);
}

/** Todos os arquivos de uma pasta (com os caminhos relativos a "base"), as pastas vazias também. */
async function percorrer(abs, base, saida) {
  const st = await fsp.stat(abs);
  if (!st.isDirectory()) {
    saida.push({ abs, nome: base, pasta: false, mtime: st.mtime });
    return;
  }
  const filhos = await fsp.readdir(abs);
  if (!filhos.length) saida.push({ abs, nome: base, pasta: true, mtime: st.mtime });
  for (const f of filhos.sort()) await percorrer(path.join(abs, f), `${base}/${f}`, saida);
}

/**
 * Compacta os itens ([{ abs, nome }]: o caminho no computador e o nome dentro do .zip) num
 * .zip novo. O arquivo é escrito ao lado e só ganha o nome final no fim (nada pela metade).
 */
async function compactar(itens, destinoZip) {
  const lista = [];
  for (const it of itens) await percorrer(it.abs, nomeSeguro(it.nome) || path.basename(it.abs), lista);
  const zip = new yazl.ZipFile();
  for (const f of lista) {
    if (f.pasta) zip.addEmptyDirectory(f.nome, { mtime: f.mtime });
    else zip.addFile(f.abs, f.nome, { mtime: f.mtime });
  }
  const parcial = destinoZip + '.parcial';
  try {
    await new Promise((resolve, reject) => {
      const escrita = fs.createWriteStream(parcial, { flags: 'wx' });
      escrita.on('error', reject);
      escrita.on('close', resolve);
      zip.outputStream.on('error', reject);
      zip.outputStream.pipe(escrita);
      zip.end();
    });
  } catch (e) {
    if (e.code !== 'EEXIST') await fsp.rm(parcial, { force: true }); // só o pela metade, que é nosso
    throw e;
  }
  if (fs.existsSync(destinoZip)) {
    await fsp.rm(parcial, { force: true });
    throw new Error('existe');
  }
  await fsp.rename(parcial, destinoZip);
  return lista.length;
}

module.exports = { listarZip, extrairZip, extrairTar, compactar, nomeSeguro, ehZip, ehTar, semExtensao, tirarLinksDeFora, ENTRADAS_MAX };
