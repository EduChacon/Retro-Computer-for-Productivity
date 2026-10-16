'use strict';
/*
 * A acessibilidade do teclado e do mouse no modo sistema (Painel de controle › Acessibilidade),
 * pelo AccessX do X, com o xkbset: as teclas de aderência (Shift, Ctrl, Alt e a tecla do
 * logotipo valem para a próxima tecla; duas vezes seguidas, ficam travadas) e as teclas do mouse
 * (o teclado numérico move o ponteiro). Valem também para os programas do Linux. As escolhas
 * ficam na configuração e voltam a cada entrada (o X as esquece ao sair).
 *
 * RETRO_ACESSIBILIDADE_FALSA=1: nada muda no computador (para as capturas).
 */
const { execFile } = require('node:child_process');

function rodar(cmd, args, { timeout = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, env: { ...process.env, LC_ALL: 'C' } }, (erro, saida) => (erro ? reject(erro) : resolve(String(saida))));
  });
}

/** "xkbset q": { aderencia, teclasMouse } (as linhas "Sticky-Keys = On" e "Mouse-Keys = On"). */
function lerXkbset(s) {
  const t = String(s || '');
  return { aderencia: /^Sticky-Keys\s*=\s*On\s*$/m.test(t), teclasMouse: /^Mouse-Keys\s*=\s*On\s*$/m.test(t) };
}

/** Os comandos do xkbset para as escolhas (e para elas não expirarem com o computador parado). */
function comandosXkbset({ aderencia, teclasMouse }) {
  return [
    aderencia ? ['sticky', '-twokey', 'latchlock'] : ['-sticky'],
    teclasMouse ? ['m'] : ['-m'],
    ['exp', '=sticky', '=mousekeys'],
  ];
}

class AcessibilidadeLinux {
  constructor({ falso = false } = {}) {
    this.falso = falso;
    this.atual = { aderencia: false, teclasMouse: false };
    this.tem = undefined;
  }

  async disponivel() {
    if (this.falso) return true;
    if (this.tem === undefined) this.tem = await rodar('xkbset', ['q']).then(() => true, () => false);
    return this.tem;
  }

  async estado() {
    if (!(await this.disponivel())) return { disponivel: false };
    if (this.falso) return { disponivel: true, ...this.atual };
    return { disponivel: true, ...lerXkbset(await rodar('xkbset', ['q']).catch(() => '')) };
  }

  async aplicar(escolhas = {}) {
    const e = { aderencia: !!escolhas.aderencia, teclasMouse: !!escolhas.teclasMouse };
    if (!(await this.disponivel())) return { ok: false, erro: 'xkbset' };
    if (this.falso) { this.atual = e; return { ok: true, ...e }; }
    for (const args of comandosXkbset(e)) await rodar('xkbset', args).catch(() => { });
    return { ok: true, ...(await this.estado()) };
  }
}

module.exports = { AcessibilidadeLinux, lerXkbset, comandosXkbset };
