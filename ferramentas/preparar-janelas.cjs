'use strict';
/* Compila só o auxiliar do Mac, na arquitetura do pacote. O Windows usa o .NET do sistema. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
function preparar(contexto) {
  if (process.platform !== 'darwin') return;
  const raiz = path.resolve(__dirname, '..'), pasta = path.join(raiz, 'recursos/janelas');
  fs.mkdirSync(pasta, { recursive: true });
  const saida = path.join(pasta, 'retro-janelas-mac');
  const arch = contexto ? (contexto.arch === 3 ? 'arm64' : contexto.arch === 1 ? 'x86_64' : null) : (process.arch === 'arm64' ? 'arm64' : 'x86_64');
  if (!arch) throw new Error('Arquitetura não suportada para o auxiliar de janelas.');
  execFileSync('/usr/bin/xcrun', ['swiftc', '-O', '-target', arch + '-apple-macosx12.0', path.join(raiz, 'src/principal/nativo/janelas-mac.swift'), '-o', saida], { stdio: 'inherit' });
  execFileSync('/usr/bin/codesign', ['--force', '--sign', '-', saida], { stdio: 'inherit' });
}
module.exports = preparar;
if (require.main === module) preparar();
