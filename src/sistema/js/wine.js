/*
 * Os programas do Windows no Linux (src/principal/wine.js): dois cliques num .exe ou num .msi do
 * disco C: o abrem pelo WINE. Sem o WINE, a pergunta oferece instalá-lo pela Loja (o Flathub,
 * sem a senha de administrador), e o arquivo abre logo depois.
 */
import { nomeDe } from './util.js';
import { avisar } from './sistema.js';
import { tr } from './idioma.js';
import { mensagem, erro } from './dialogos.js';

const FLATPAK_ID = 'org.winehq.Wine';

export async function abrirComWine(rel) {
  const nome = nomeDe(rel);
  let r = await retro.wine.abrir(rel).catch((e) => ({ ok: false, erro: e.message }));
  if (r.faltaWine) {
    if (!r.instalavel) {
      return erro(tr('Para abrir "{nome}", instale o WINE (o pacote "wine" do Linux): é ele que roda os programas do Windows.', { nome }), tr('Programas do Windows'));
    }
    const v = await mensagem({
      titulo: tr('Programas do Windows'), tipo: 'pergunta',
      texto: tr('"{nome}" é um programa do Windows. No Linux, ele abre pelo WINE, que ainda não está instalado.\n\nInstalar o WINE pela Loja de programas (o Flathub)? Leva alguns minutos e não pede a senha.', { nome }),
      botoes: [{ texto: tr('Instalar o WINE'), valor: true, padrao: true }, { texto: tr('Cancelar'), valor: false }],
    });
    if (!v) return null;
    avisar(tr('Programas do Windows'), tr('Instalando o WINE pelo Flathub… O programa abre quando terminar.'), { icone: 'executavel', som: null });
    const inst = await retro.loja.instalar(FLATPAK_ID).catch((e) => ({ ok: false, erro: e.message }));
    if (inst && inst.ok === false) return erro(tr('Não foi possível instalar o WINE: {erro}', { erro: inst.erro || '?' }), tr('Programas do Windows'));
    r = await retro.wine.abrir(rel).catch((e) => ({ ok: false, erro: e.message }));
  }
  if (!r.ok) return erro(tr('Não foi possível abrir "{nome}": {erro}', { nome, erro: r.erro || '?' }), tr('Programas do Windows'));
  // A primeira abertura do WINE prepara o "C:" do Windows e demora um pouco.
  avisar(tr('Programas do Windows'), /\.msi$|setup|instal/i.test(nome)
    ? tr('Abrindo o instalador "{nome}" pelo WINE. Os programas instalados aparecem em Iniciar › Programas › Programas do Windows.', { nome })
    : tr('Abrindo "{nome}" pelo WINE…', { nome }), { icone: 'executavel', som: null });
  return r;
}
