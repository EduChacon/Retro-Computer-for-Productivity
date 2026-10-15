/*
 * A atualização do próprio Retro Computer, do lado da área de trabalho: procura
 * a versão nova, baixa (sozinho, no modo automático) e oferece reiniciar para
 * instalar. Onde a cópia não pode se trocar sozinha (macOS, o .zip do Windows),
 * o aviso abre a página de download.
 */
import { estado, avisar, abrirEndereco, definirConfig } from './sistema.js';
import { lista as janelas } from './janelas.js';
import { confirmar } from './dialogos.js';
import { tr } from './idioma.js';

let ultimo = { etapa: 'parado' };
const ouvintes = new Set();

export const estadoAtual = () => ultimo;

export function aoMudar(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

retro.sistema.atualizacao.aoMudar((e) => {
  ultimo = e;
  ouvintes.forEach((f) => f(e));
  if (e.etapa === 'baixada') avisarPronta(e.versao);
});

function avisarPronta(versao) {
  avisar(tr('Atualização pronta'), tr('A versão {nova} do Retro Computer foi baixada. Clique para reiniciar e instalar agora; se preferir, ela entra quando você desligar.', { nova: versao }), {
    icone: 'logo', ms: 20000, aoClicar: () => reiniciarParaAtualizar(),
  });
}

/** Fecha as janelas (cada programa pergunta se há algo por salvar) e reinicia instalando. */
export async function reiniciarParaAtualizar() {
  const info = await retro.sistema.atualizacao.info();
  if (info.senha && !(await confirmar(tr('Para instalar a versão nova, o Linux vai pedir a senha de administrador. Continuar?'), { titulo: tr('Atualizar o Retro Computer') }))) return false;
  for (const j of janelas.slice().reverse()) {
    if (j.dialogo) continue;
    j.focar();
    if (!(await j.fechar())) return false;
  }
  return retro.sistema.atualizacao.instalar();
}

/**
 * Procura a versão nova. No modo automático, já baixa (e avisa quando estiver pronta);
 * no "perguntar", avisa com um balão que baixa ao ser clicado.
 */
export async function procurarAtualizacao() {
  const modo = estado.config.atualizacoes || 'automatico';
  const info = await retro.sistema.atualizacao.info();
  if (!info.sozinho) return avisarPagina();
  const r = await retro.sistema.atualizacao.verificar();
  if (r.etapa !== 'disponivel') return r;
  if (modo === 'automatico') {
    retro.sistema.atualizacao.baixar().catch(() => { });
  } else if (estado.config.versaoAvisada !== r.versao) {
    avisar(tr('Há uma versão nova do Retro Computer'), tr('A versão {nova} está disponível (esta é a {atual}). Clique para baixar e instalar.', { nova: r.versao, atual: r.atual }), {
      icone: 'logo', ms: 15000, aoClicar: () => retro.sistema.atualizacao.baixar().catch(() => { }),
    });
    definirConfig({ versaoAvisada: r.versao }).catch(() => { });
  }
  return r;
}

/** Onde não há atualização direta: o aviso leva à página de download (uma vez por versão). */
async function avisarPagina() {
  const v = await retro.sistema.novaVersao();
  if (!v || !v.temAtualizacao || estado.config.versaoAvisada === v.nova) return v;
  avisar(tr('Há uma versão nova do Retro Computer'), tr('A versão {nova} está disponível (esta é a {atual}). Clique para abrir a página de download.', v), {
    icone: 'logo', ms: 15000, aoClicar: () => abrirEndereco(v.pagina),
  });
  definirConfig({ versaoAvisada: v.nova }).catch(() => { });
  return v;
}
