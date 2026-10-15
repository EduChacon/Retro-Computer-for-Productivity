/*
 * A senha de administrador do Linux, pedida numa caixa do Retro Computer (e não na
 * janela do sistema, que nem existe na sessão "Retro Computer"). A senha vai direto
 * para o sudo, no processo principal; nada a guarda.
 */
import { entrada, erro } from './dialogos.js';
import { tr } from './idioma.js';

/**
 * Pede a senha e chama fazer(senha) até dar certo (três tentativas).
 * @param {string} texto  a frase inteira, já traduzida, do que a senha vai fazer
 * @param {(senha:string)=>Promise<{ok:boolean, senhaErrada?:boolean, naoPode?:boolean, erro?:string}>} fazer
 * @returns {Promise<object|null>} o resultado de fazer, ou null se o usuário cancelou
 */
export async function comSenhaAdmin(texto, fazer) {
  let aviso = texto;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const senha = await entrada({ titulo: tr('Senha de administrador'), texto: aviso, tipo: 'password', icone: 'chave', larg: 400 });
    if (senha == null) return null;
    const r = await fazer(senha);
    if (r && r.ok) return r;
    if (r && r.naoPode) {
      await erro(tr('Este usuário do Linux não pode fazer alterações de administrador.'), tr('Senha de administrador'));
      return r;
    }
    if (!r || !r.senhaErrada) return r;
    aviso = tr('A senha não está certa. Digite de novo a senha de administrador:');
  }
  await erro(tr('A senha não foi aceita.'), tr('Senha de administrador'));
  return { ok: false, senhaErrada: true };
}
