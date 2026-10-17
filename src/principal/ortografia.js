'use strict';
/*
 * O corretor ortográfico (o Hunspell do Chromium) sem internet: os dicionários vão junto com o
 * programa (dicionarios/, os do Chromium, sem modificação) e são copiados para a pasta em que o
 * Chromium os procura (<dados do usuário>/Dictionaries) antes de ligar o corretor; o endereço de
 * baixar dicionários fica num domínio que não existe, para nada sair para a internet. No Mac, o
 * corretor é o do próprio sistema (o Electron não usa o Hunspell lá), que reconhece o idioma sozinho.
 */
const fs = require('node:fs');
const path = require('node:path');

const PASTA = path.join(__dirname, 'dicionarios');
// O idioma → o arquivo que o Chromium do Electron pede (o nome muda quando o Chromium troca o dicionário).
const DICIONARIOS = Object.freeze({ 'pt-BR': 'pt-BR-3-0.bdic', 'en-US': 'en-US-10-1.bdic', 'es-ES': 'es-ES-3-0.bdic' });
// O idioma da interface → o do dicionário.
const DO_IDIOMA = Object.freeze({ 'pt-BR': 'pt-BR', en: 'en-US', es: 'es-ES' });
// O domínio .invalid nunca existe (RFC 2606): o Chromium não consegue baixar nada.
const SEM_DOWNLOAD = 'https://dicionarios.invalid/';
const MAX_PALAVRA = 64;

/** Os idiomas do corretor: os escolhidos (só os que têm dicionário) ou, sem escolha, o da interface. */
function idiomasDe(cfg, idiomaInterface) {
  const escolhidos = Array.isArray(cfg && cfg.idiomas) ? cfg.idiomas.filter((i) => Object.prototype.hasOwnProperty.call(DICIONARIOS, i)) : [];
  if (escolhidos.length) return [...new Set(escolhidos)];
  return [DO_IDIOMA[idiomaInterface] || 'pt-BR'];
}

/** Copia os dicionários que faltam (ou que mudaram de tamanho) para a pasta do Chromium. */
function prepararDicionarios(dados, origem = PASTA) {
  const destino = path.join(dados, 'Dictionaries');
  fs.mkdirSync(destino, { recursive: true });
  const copiados = [];
  for (const arquivo of Object.values(DICIONARIOS)) {
    const de = path.join(origem, arquivo);
    const para = path.join(destino, arquivo);
    let igual = false;
    try { igual = fs.statSync(para).size === fs.statSync(de).size; } catch { /* falta */ }
    if (igual) continue;
    // Pelo temporário renomeado: o Chromium nunca lê um dicionário pela metade.
    const tmp = para + '.tmp';
    fs.writeFileSync(tmp, fs.readFileSync(de));
    fs.renameSync(tmp, para);
    copiados.push(arquivo);
  }
  return copiados;
}

/** Liga ou desliga o corretor na sessão, com os idiomas da configuração. */
function aplicarOrtografia(sessao, cfg, idiomaInterface, plataforma = process.platform) {
  const ligada = !cfg || cfg.ligada !== false;
  sessao.setSpellCheckerEnabled(ligada);
  if (plataforma === 'darwin') return { ligada, idiomas: [] };
  sessao.setSpellCheckerDictionaryDownloadURL(SEM_DOWNLOAD);
  const idiomas = idiomasDe(cfg, idiomaInterface);
  if (ligada) sessao.setSpellCheckerLanguages(idiomas);
  return { ligada, idiomas };
}

/** Uma palavra que pode ir para o dicionário do usuário (ou trocar a errada): sem espaços nem controles. */
function palavraValida(p) {
  return typeof p === 'string' && p.length > 0 && p.length <= MAX_PALAVRA && !/[\s\u0000-\u001f\u007f-\u009f]/.test(p);
}

/** Uma sugestão do corretor para trocar a palavra (pode ter espaço: "em cima"), sem controles. */
function trocaValida(s) {
  return typeof s === 'string' && s.length > 0 && s.length <= MAX_PALAVRA && !/[\u0000-\u001f\u007f-\u009f]/.test(s);
}

module.exports = { DICIONARIOS, DO_IDIOMA, SEM_DOWNLOAD, idiomasDe, prepararDicionarios, aplicarOrtografia, palavraValida, trocaValida };
