'use strict';
/*
 * Os acentos no Linux como no Windows. No layout EUA internacional, o Windows junta a tecla morta
 * com a letra que serve (´ + a = á, ´ + c = ç, " + u = ü, ~ + n = ñ) e, com qualquer outra, escreve
 * os dois: " + B = "B, ' + t = 't, ^ + 2 = ^2. O Linux faz outras coisas (¨B, ´t, ś, ²) e, em inglês,
 * ć no lugar do ç. Para o EUA internacional, o Retro Computer usa uma tabela própria, com as regras
 * do Windows, pelo método de entrada do X (o XIM, com XCOMPOSEFILE): nenhum arquivo do usuário é
 * mexido, e vale também para o Firefox e os programas abertos por ele. Nos outros layouts (o ABNT2,
 * em que o ´ e o ¨ são as teclas mortas), o módulo "cedilla" do GTK basta para o ç. Quem usa o IBus
 * ou o Fcitx fica como está.
 */
const fs = require('node:fs');
const path = require('node:path');

const MORTAS = { dead_acute: "'", dead_diaeresis: '"', dead_grave: '`', dead_tilde: '~', dead_circumflex: '^' };
const par = (letras, saidas) => Object.fromEntries([...letras].map((l, i) => [l, [...saidas][i]]));
// As que o Windows junta (o resto sai como o sinal seguido da tecla).
const JUNTAS = {
  dead_acute: par('aeiouycAEIOUYC', 'áéíóúýçÁÉÍÓÚÝÇ'),
  dead_diaeresis: par('aeiouyAEIOUY', 'äëïöüÿÄËÏÖÜŸ'),
  dead_grave: par('aeiouAEIOU', 'àèìòùÀÈÌÒÙ'),
  dead_tilde: par('aonAON', 'ãõñÃÕÑ'),
  dead_circumflex: par('aeiouAEIOU', 'âêîôûÂÊÎÔÛ'),
};
// Os nomes do X para os sinais (as letras e os números têm o próprio nome).
const NOMES = {
  ' ': 'space', '!': 'exclam', '"': 'quotedbl', '#': 'numbersign', $: 'dollar', '%': 'percent', '&': 'ampersand', "'": 'apostrophe',
  '(': 'parenleft', ')': 'parenright', '*': 'asterisk', '+': 'plus', ',': 'comma', '-': 'minus', '.': 'period', '/': 'slash',
  ':': 'colon', ';': 'semicolon', '<': 'less', '=': 'equal', '>': 'greater', '?': 'question', '@': 'at', '[': 'bracketleft',
  '\\': 'backslash', ']': 'bracketright', '^': 'asciicircum', _: 'underscore', '`': 'grave', '{': 'braceleft', '|': 'bar',
  '}': 'braceright', '~': 'asciitilde',
};

const aspas = (s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

/** A tabela de composição (o formato do XCompose) com as regras do EUA internacional do Windows. */
function composeWindows() {
  const linhas = [
    '# Feito pelo Retro Computer: as teclas mortas do EUA internacional como no Windows.',
    '# Primeiro, a tabela do idioma (a tecla Compose continua valendo); depois, as regras do Windows.',
    'include "%L"',
    '',
  ];
  for (const [morta, sinal] of Object.entries(MORTAS)) {
    linhas.push(`<${morta}> <space> : ${aspas(sinal)}`);
    for (let i = 0x21; i < 0x7f; i++) {
      const c = String.fromCharCode(i);
      linhas.push(`<${morta}> <${NOMES[c] || c}> : ${aspas(JUNTAS[morta][c] || sinal + c)}`);
    }
    // Duas teclas mortas seguidas: os dois sinais.
    for (const [outra, s2] of Object.entries(MORTAS)) linhas.push(`<${morta}> <${outra}> : ${aspas(sinal + s2)}`);
  }
  return linhas.join('\n') + '\n';
}

/**
 * O módulo de entrada do GTK 3 está instalado? (No Debian e no Ubuntu, o "xim" e o "cedilla" vêm com o
 * GTK; no Fedora, o "xim" é um pacote à parte.) Sem achar a pasta dos módulos, a resposta é "sim".
 */
function temModuloGtk(nome, existe = fs.existsSync) {
  const bases = ['/usr/lib', '/usr/lib64', ...['x86_64', 'aarch64', 'arm', 'i386'].map((a) => `/usr/lib/${a}-linux-gnu${a === 'arm' ? 'eabihf' : ''}`)];
  const pastas = bases.map((b) => path.join(b, 'gtk-3.0', '3.0.0', 'immodules')).filter((p) => existe(p));
  return !pastas.length || pastas.some((p) => existe(path.join(p, `im-${nome}.so`)));
}

/**
 * A regra dos acentos para este layout: 'windows' (o EUA internacional), 'cedilla' (os outros) ou
 * 'sistema' (o usuário já escolheu um método de entrada: nada muda). Devolve as variáveis a pôr.
 */
function modoAcentos({ env = process.env, layout = '', variante = '', arquivo = '', temModulo = temModuloGtk } = {}) {
  // O método de entrada já escolhido (o IBus, o Fcitx) e as sessões Wayland (em que o XIM não vale) ficam como estão.
  if (env.GTK_IM_MODULE || env.WAYLAND_DISPLAY || env.XDG_SESSION_TYPE === 'wayland') return { modo: 'sistema', env: {} };
  const xim = (!env.XMODIFIERS || env.XMODIFIERS === '@im=none') && temModulo('xim');
  if (layout === 'us' && variante === 'intl' && xim && arquivo) {
    return { modo: 'windows', env: { GTK_IM_MODULE: 'xim', XMODIFIERS: '@im=none', XCOMPOSEFILE: arquivo } };
  }
  return { modo: 'cedilla', env: { GTK_IM_MODULE: 'cedilla' } };
}

/** Grava a tabela na pasta (só quando ela muda) e devolve o caminho; null se não deu. */
function gravarCompose(pasta) {
  try {
    const arquivo = path.join(pasta, 'teclado', 'Compose');
    const texto = composeWindows();
    let atual = null;
    try { atual = fs.readFileSync(arquivo, 'utf8'); } catch { }
    if (atual !== texto) {
      fs.mkdirSync(path.dirname(arquivo), { recursive: true });
      fs.writeFileSync(arquivo, texto);
    }
    return arquivo;
  } catch {
    return null;
  }
}

module.exports = { composeWindows, modoAcentos, gravarCompose, temModuloGtk, MORTAS, JUNTAS };
