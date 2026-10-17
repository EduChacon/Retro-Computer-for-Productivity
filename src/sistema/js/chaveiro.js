/*
 * O chaveiro do Linux trancado (o Retro Computer como sistema, com a entrada automática): a senha é
 * pedida numa caixa do Retro Computer, e o processo principal abre o chaveiro com ela (chaveiro.js de
 * lá). Antes, a caixa do próprio Linux aparecia e parava a área de trabalho até ser respondida.
 */
import { entrada, erro } from './dialogos.js';
import { tr } from './idioma.js';
import { estado } from './sistema.js';
import { estaBloqueado } from './bloqueio.js';

export const chaveiroTrancado = () => !!(estado.config && estado.config.chaveiroTrancado);

let pedindo = null;

/** Pede a senha e abre o chaveiro: true se abriu, false se o usuário cancelou ou não deu. */
export function abrirChaveiro() {
  if (pedindo) return pedindo;
  pedindo = (async () => {
    let aviso = tr('O chaveiro do Linux guarda os cookies do Navegador e a chave do Claude. Digite a senha de entrada do Linux para abri-lo:');
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const senha = await entrada({ titulo: tr('Chaveiro do Linux'), texto: aviso, tipo: 'password', icone: 'chave', larg: 420 });
      if (senha == null) return false;
      const r = await retro.chaveiro.abrir(senha).catch(() => ({ erro: true }));
      if (r && r.ok) { estado.config.chaveiroTrancado = false; return true; }
      if (!r || !r.negado) {
        await erro(tr('Não foi possível abrir o chaveiro do Linux.'), tr('Chaveiro do Linux'));
        return false;
      }
      aviso = tr('A senha não está certa. Digite a senha do chaveiro do Linux (em geral, a mesma da entrada):');
    }
    return false;
  })().finally(() => { pedindo = null; });
  return pedindo;
}

/** Na abertura: depois da tela de bloqueio, se houver (a senha digitada nela já pode ter aberto o chaveiro). */
export function pedirChaveiroAoAbrir() {
  if (!chaveiroTrancado()) return;
  const pedir = async () => {
    const e = await retro.chaveiro.estado().catch(() => null);
    if (e && !e.trancado) { estado.config.chaveiroTrancado = false; return; }
    abrirChaveiro();
  };
  if (estaBloqueado()) document.addEventListener('retro-desbloqueado', pedir, { once: true });
  else pedir();
}

retro.chaveiro.aoAbrir(() => { if (estado.config) estado.config.chaveiroTrancado = false; });
