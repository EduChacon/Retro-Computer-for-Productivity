'use strict';
/*
 * Os atalhos do Windows: de uma tecla (o "input" do before-input-event do Electron) para a
 * ação que a área de trabalho entende (retro.sistema.aoTecla). Sem nada do Electron aqui,
 * para os testes.
 *
 *   Alt+F4                fechar-janela (sem nenhuma janela, a área de trabalho abre o Desligar)
 *   Alt+Tab, Alt+Shift+Tab alternar, alternar-volta (o soltar do Alt é alternar-fim)
 *   Alt+Esc               alternar-cancelar
 *   logotipo + letra      E explorador, R executar, D área de trabalho, M minimizar tudo,
 *                         I painel, S ou Q busca, V área de transferência, L bloquear
 *   logotipo + Shift+S    captura-regiao
 *   logotipo + 1…9        fixado:N (o programa fixado nessa posição)
 *   logotipo + seta       encaixe:ArrowLeft… (os cantos magnéticos)
 */

const DO_LOGOTIPO = { e: 'explorador', r: 'executar', d: 'area-de-trabalho', m: 'minimizar-tudo', i: 'painel', s: 'busca', q: 'busca', v: 'area-transferencia', l: 'bloquear' };

function acaoDoLogotipo(input) {
  if (!input.meta || input.control || input.alt) return null;
  const k = input.key && input.key.length === 1 ? input.key.toLowerCase() : input.key;
  if (input.shift) return k === 's' ? 'captura-regiao' : null;
  const digito = /^Digit([1-9])$/.exec(input.code || '');
  if (digito) return 'fixado:' + digito[1];
  if (/^Arrow(Left|Right|Up|Down)$/.test(k)) return 'encaixe:' + k;
  return DO_LOGOTIPO[k] || null;
}

/**
 * A ação de uma tecla apertada, ou null. No Mac, a tecla do logotipo é o Cmd dos programas:
 * lá ela fica de fora (o modo sistema é só do Linux).
 */
function acaoDaTecla(input, { plataforma = process.platform, sistema = false } = {}) {
  if (!input || input.type !== 'keyDown') return null;
  if (input.key === 'F4' && input.alt && !input.control && !input.shift && !input.meta) return 'fechar-janela';
  if (input.key === 'Tab' && input.alt && !input.control && !input.meta) return input.shift ? 'alternar-volta' : 'alternar';
  if (input.key === 'Escape' && input.alt) return 'alternar-cancelar';
  if (plataforma === 'darwin' && !sistema) return null;
  return acaoDoLogotipo(input);
}

/** As mesmas teclas como atalhos globais do modo sistema (valem também com um programa do Linux na frente). */
const GLOBAIS = [
  ['Alt+Tab', 'alternar'], ['Alt+Shift+Tab', 'alternar-volta'], ['Alt+F4', 'fechar-janela'],
  ...Object.entries({ E: 'explorador', R: 'executar', D: 'area-de-trabalho', M: 'minimizar-tudo', I: 'painel', S: 'busca', V: 'area-transferencia', L: 'bloquear' })
    .map(([k, a]) => ['Super+' + k, a]),
  ['Super+Shift+S', 'captura-regiao'],
  ...['Left', 'Right', 'Up', 'Down'].map((s) => ['Super+' + s, 'encaixe:Arrow' + s]),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ['Super+' + n, 'fixado:' + n]),
];

module.exports = { acaoDaTecla, GLOBAIS };
