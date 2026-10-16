/*
 * As janelas dos programas do Linux na barra de tarefas (no Retro Computer como sistema).
 * Cada uma vira um objeto com a mesma cara das janelas do Retro Computer (titulo, focar,
 * minimizar, fechar), para a barra tratar todas do mesmo jeito. Quem lista e comanda é o
 * processo principal (janelas-linux.js de lá, pelo wmctrl).
 */
import { Eventos } from './util.js';

export const eventosNativas = new Eventos();
let atual = { lista: [], retroAtivo: true };

function receber(r) {
  atual = r && Array.isArray(r.lista) ? r : { lista: [], retroAtivo: true };
  document.body.classList.toggle('fora-de-foco', !retroAtivo());
  eventosNativas.emit('mudou');
}

if (window.retro && retro.janelasLinux) {
  retro.janelasLinux.aoMudar(receber);
  retro.janelasLinux.listar().then(receber).catch(() => { });
}

/** O Retro Computer está na frente (nenhuma janela do Linux ativa)? */
export const retroAtivo = () => atual.retroAtivo !== false;

/** As janelas do Linux, como objetos parecidos com as do Retro Computer. */
export function janelasNativas() {
  return atual.lista.map((j) => ({
    nativa: true,
    id: j.id,
    titulo: j.titulo,
    // As do Firefox do Retro Computer são do Navegador (o mesmo ícone e o mesmo botão fixado).
    icone: j.programa === 'retro:navegador' ? 'navegador' : 'programa',
    programa: j.programa === 'retro:navegador' ? 'navegador' : j.programa ? 'nativo:' + j.programa : null,
    ativa: !!j.ativa,
    minimizada: false,
    maximizada: false,
    focar: () => retro.janelasLinux.ativar(j.id),
    minimizar: () => retro.janelasLinux.minimizar(j.id),
    fechar: async () => { await retro.janelasLinux.fechar(j.id); return true; },
    restaurar: () => retro.janelasLinux.ativar(j.id),
    maximizar: () => retro.janelasLinux.ativar(j.id),
  }));
}

/** Antes da tela de bloqueio: nenhuma janela do Linux fica por cima. */
export function minimizarNativas() {
  if (!atual.lista.length || !window.retro || !retro.janelasLinux) return Promise.resolve(0);
  return retro.janelasLinux.minimizarTodas().catch(() => 0);
}
