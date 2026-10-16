'use strict';
/*
 * Os arquivos que rodam como programa no computador principal (os executáveis, os instaladores e
 * os roteiros): baixados por um programa Craft, eles são recusados; abertos "no computador
 * principal", eles pedem a confirmação. A área de trabalho tem a mesma lista em js/util.js
 * (EXECUTAVEIS); o teste confere que as duas são iguais.
 */
const EXECUTAVEIS = /\.(exe|msi|msix|msixbundle|appx|appxbundle|bat|cmd|com|scr|pif|cpl|msc|hta|js|jse|vbs|vbe|wsf|wsh|ps1|psm1|psd1|reg|lnk|url|scf|inf|jar|app|pkg|mpkg|dmg|command|tool|sh|bash|zsh|csh|run|bin|appimage|deb|rpm|flatpakref|desktop|py|pyw|pl|rb)$/i;

const ehExecutavel = (nome) => EXECUTAVEIS.test(String(nome || '').trim());

module.exports = { EXECUTAVEIS, ehExecutavel };
