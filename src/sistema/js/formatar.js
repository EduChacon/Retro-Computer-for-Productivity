/*
 * Formatar um pendrive (Meu computador › botão direito no pendrive › Formatar…), como a caixa da
 * época: a capacidade, o sistema de arquivos (o exFAT, que o Windows, o Mac e o Linux leem, ou o
 * FAT32, dos aparelhos antigos) e o rótulo. No Linux, com a senha de administrador; no Windows e
 * no Mac, a caixa explica o caminho do próprio sistema. Apagar tudo é o que formatar faz: a
 * confirmação diz isso com todas as letras.
 */
import { h, img, tamanho } from './util.js';
import { Janela, lista as janelas } from './janelas.js';
import { estado } from './sistema.js';
import { tr } from './idioma.js';
import { ajustarAoConteudo, confirmar, erro, info } from './dialogos.js';
import { comSenhaAdmin } from './admin.js';
import { nomeUnidade } from './unidades.js';

export function formatarUnidade(u) {
  const nome = nomeUnidade(u);
  const titulo = tr('Formatar {nome}', { nome });
  const aberta = janelas.find((x) => x.titulo === titulo);
  if (aberta) return aberta.focar();
  const j = new Janela({ titulo, icone: 'removivel', largura: 320, altura: 300, redimensionavel: false, minimizavel: false, maximizavel: false });
  j.corpo.style.padding = '10px';
  const linux = estado.config.plataforma === 'linux';
  if (!linux) {
    const mac = estado.config.plataforma === 'darwin';
    j.corpo.append(
      h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' } }, img('removivel', 32),
        h('div', { style: { lineHeight: '13px' } }, mac
          ? tr('No Mac, os pendrives são formatados pelo Utilitário de Disco (escolha o pendrive à esquerda e clique em Apagar).')
          : tr('No Windows, os pendrives são formatados pelo Explorador de Arquivos: botão direito no pendrive › Formatar.'))),
      h('div.acoes.direita',
        h('button.padrao', { on: { click: () => { retro.unidades.formatarNoSistema().catch(() => { }); j.fechar(); } } }, mac ? tr('Abrir o Utilitário de Disco') : tr('Abrir o Explorador de Arquivos')),
        h('button', { on: { click: () => j.fechar() } }, tr('Fechar'))));
    ajustarAoConteudo(j, { largura: 340 });
    return j;
  }
  const sistema = h('select', { style: { width: '100%' } },
    h('option', { value: 'exfat' }, tr('exFAT (o Windows, o Mac e o Linux leem)')),
    h('option', { value: 'fat32' }, tr('FAT32 (aparelhos antigos; arquivos de até 4 GB)')));
  const rotulo = h('input', { type: 'text', value: u.rotulo || '', maxLength: 15, spellcheck: false, style: { width: '100%' } });
  const situacao = h('div', { style: { minHeight: '13px', lineHeight: '13px' } });
  const btIniciar = h('button.padrao', tr('Iniciar'));
  const btFechar = h('button', { on: { click: () => j.fechar() } }, tr('Fechar'));
  const campo = (rot, el) => h('div', { style: { marginBottom: '8px' } }, h('div', { style: { marginBottom: '2px' } }, rot), el);
  j.corpo.append(
    campo(tr('Capacidade:'), h('div.campo', { style: { height: 'auto' } }, u.tamanho ? tamanho(u.tamanho) : '?')),
    campo(tr('Sistema de arquivos:'), h('div.select-caixa', { style: { width: '100%' } }, sistema)),
    campo(tr('Rótulo do volume:'), rotulo),
    h('div', { style: { color: '#800000', lineHeight: '13px', margin: '4px 0 8px' } }, tr('Formatar apaga todos os arquivos do disco.')),
    situacao,
    h('div.acoes.direita', btIniciar, btFechar));
  btIniciar.addEventListener('click', async () => {
    const ok = await confirmar(tr('AVISO: formatar vai apagar TODOS os arquivos de {nome}.\n\nPara formatar, clique em Sim. Para sair, clique em Não.', { nome }), { titulo, tipo: 'aviso' });
    if (!ok) return;
    btIniciar.disabled = true;
    btFechar.disabled = true;
    situacao.textContent = tr('Formatando…');
    const r = await comSenhaAdmin(tr('Para formatar o pendrive, digite a senha de administrador do Linux:'), (senha) => retro.unidades.formatar(u.id, { sistema: sistema.value, rotulo: rotulo.value }, senha));
    btIniciar.disabled = false;
    btFechar.disabled = false;
    situacao.textContent = '';
    if (!r) return;
    if (r.ok) {
      await info(tr('Formatação concluída.'), titulo);
      j.fechar();
    } else if (r.emUso) erro(tr('Este disco está em uso (ele guarda o disco C: ou o próprio sistema) e não pode ser formatado.'), titulo);
    else if (r.ocupado) erro(tr('Um arquivo do pendrive ainda está aberto. Feche-o e tente de novo.'), titulo);
    else if (!r.senhaErrada && !r.naoPode) erro(tr('Não foi possível formatar: {erro}', { erro: r.erro || '?' }), titulo);
  });
  ajustarAoConteudo(j, { largura: 320 });
  return j;
}
