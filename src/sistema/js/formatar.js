/*
 * Formatar um pendrive ou cartão (Meu computador › botão direito no pendrive › Formatar…, ou o
 * programa Discos), como a caixa da época: a capacidade, o sistema de arquivos (o exFAT, que o
 * Windows, o Mac e o Linux leem; o FAT32, dos aparelhos antigos; no Windows, também o NTFS), o rótulo
 * e, para o pendrive que recebeu uma imagem e ficou com um pedaço só à vista, o disco inteiro com uma
 * partição só. No Linux, com a senha de administrador; no Windows e no Mac, com a confirmação do
 * próprio sistema. Apagar tudo é o que formatar faz: a confirmação diz isso com todas as letras.
 */
import { h, tamanho } from './util.js';
import { Janela, lista as janelas } from './janelas.js';
import { estado } from './sistema.js';
import { tr } from './idioma.js';
import { ajustarAoConteudo, confirmar, erro, info } from './dialogos.js';
import { comSenhaAdmin } from './admin.js';
import { nomeUnidade } from './unidades.js';

// O tamanho do rótulo em cada sistema de arquivos.
const MAX_ROTULO = { fat32: 11, exfat: 15, ntfs: 32 };

/** Formatar uma unidade do Meu computador (uma partição do pendrive). */
export function formatarUnidade(u) {
  return caixaFormatar({ nome: nomeUnidade(u), capacidade: u.tamanho, rotulo: u.rotulo, alvo: { volume: u.id } });
}

/**
 * Formatar pelo programa Discos: um volume do disco (com a opção do disco inteiro) ou o disco
 * inteiro (o pendrive sem nada à vista, depois de receber uma imagem).
 */
export function formatarDoDisco(d, v, { aoTerminar } = {}) {
  if (v && v.id) return caixaFormatar({ nome: nomeDoVolume(v), capacidade: v.tamanho, rotulo: v.rotulo, alvo: { volume: v.id }, disco: d, aoTerminar });
  return caixaFormatar({ nome: nomeDoDisco(d), capacidade: d.tamanho, rotulo: '', alvo: { disco: d.id }, disco: d, inteiro: true, aoTerminar });
}

/** "PENDRIVE (E:)", "PENDRIVE" ou "Sem nome (E:)". */
export function nomeDoVolume(v) {
  const letra = v.letra ? v.letra + ':' : '';
  if (v.rotulo) return letra ? `${v.rotulo} (${letra})` : v.rotulo;
  return letra ? tr('Sem nome ({letra})', { letra }) : tr('Sem nome');
}

/** "SanDisk Cruzer Blade (8 GB)". */
export function nomeDoDisco(d) {
  return tr('{nome} ({tamanho})', { nome: d.nome || tr('Disco removível'), tamanho: tamanho(d.tamanho) });
}

/** A mensagem de um resultado que não deu certo (ou null, quando não há o que dizer). */
export function textoDoErro(r, { gravar = false } = {}) {
  if (!r || r.ok || r.cancelado || r.senhaErrada || r.naoPode) return null;
  if (r.emUso) return tr('Este disco guarda o disco C:, os dados ou o próprio Retro Computer e não pode ser apagado.');
  if (r.ocupado) return tr('Um arquivo do pendrive ainda está aberto. Feche-o e tente de novo.');
  if (r.gravando) return tr('Espere a gravação da imagem terminar.');
  if (r.naoExterno) return tr('Este disco não é um pendrive nem um cartão de memória: o Retro Computer só apaga esses.');
  if (r.fat32Grande) return tr('O Windows só formata em FAT32 até 32 GB. Escolha o exFAT, que o Windows, o Mac e o Linux também leem.');
  if (r.pequeno) return tr('A imagem é maior que o pendrive.');
  if (r.tipo) return tr('Escolha uma imagem .iso ou .img. Uma imagem compactada (.zip, .xz) precisa ser extraída antes.');
  if (r.diferente) return tr('A cópia gravada não confere com a imagem: o pendrive pode estar com defeito. Tente de novo ou use outro pendrive.');
  if (r.parado) return tr('A gravação foi interrompida. O pendrive ficou sem nada legível: grave de novo ou formate-o para usá-lo.');
  return gravar ? tr('Não foi possível gravar a imagem: {erro}', { erro: r.erro || '?' }) : tr('Não foi possível formatar: {erro}', { erro: r.erro || '?' });
}

/** O que dizer enquanto o sistema pede a confirmação dele (no Linux, a senha vem antes, na nossa caixa). */
export function textoDaConfirmacao() {
  if (estado.config.plataforma === 'win32') return tr('Confirme no aviso do Windows…');
  if (estado.config.plataforma === 'darwin') return tr('Se o Mac pedir, digite a senha dele…');
  return '';
}

/**
 * Chama fazer(senha): no Linux, com a senha de administrador pedida na nossa caixa (texto); no
 * Windows e no Mac, sem senha (o próprio sistema confirma).
 */
export function comPermissao(texto, fazer) {
  if (estado.config.plataforma === 'linux') return comSenhaAdmin(texto, fazer);
  return fazer('');
}

function caixaFormatar({ nome, capacidade, rotulo: rotuloInicial, alvo, inteiro = false, aoTerminar }) {
  const titulo = tr('Formatar {nome}', { nome });
  const aberta = janelas.find((x) => x.titulo === titulo);
  if (aberta) return aberta.focar();
  const j = new Janela({ titulo, icone: 'removivel', largura: 320, altura: 300, redimensionavel: false, minimizavel: false, maximizavel: false });
  j.corpo.style.padding = '10px';
  const win = estado.config.plataforma === 'win32';
  const sistema = h('select', { style: { width: '100%' } },
    h('option', { value: 'exfat' }, tr('exFAT (o Windows, o Mac e o Linux leem)')),
    h('option', { value: 'fat32' }, tr('FAT32 (aparelhos antigos; arquivos de até 4 GB)')),
    win ? h('option', { value: 'ntfs' }, tr('NTFS (só o Windows grava nele)')) : null);
  const rotulo = h('input', { type: 'text', value: rotuloInicial || '', maxLength: MAX_ROTULO.exfat, spellcheck: false, style: { width: '100%' } });
  sistema.addEventListener('change', () => {
    rotulo.maxLength = MAX_ROTULO[sistema.value];
    if (sistema.value === 'fat32') rotulo.value = rotulo.value.toUpperCase();
    rotulo.value = rotulo.value.slice(0, rotulo.maxLength);
  });
  rotulo.addEventListener('input', () => { if (sistema.value === 'fat32') rotulo.value = rotulo.value.toUpperCase(); });
  // O pendrive inteiro: apaga todas as partições e cria uma só (o que sobra de uma imagem gravada, por exemplo).
  const chkInteiro = h('input', { type: 'checkbox', checked: inteiro, disabled: inteiro });
  const situacao = h('div', { style: { minHeight: '13px', lineHeight: '13px' } });
  const btIniciar = h('button.padrao', tr('Iniciar'));
  const btFechar = h('button', { on: { click: () => j.fechar() } }, tr('Fechar'));
  const campo = (rot, el) => h('div', { style: { marginBottom: '8px' } }, h('div', { style: { marginBottom: '2px' } }, rot), el);
  j.corpo.append(
    campo(tr('Capacidade:'), h('div.campo', { style: { height: 'auto' } }, capacidade ? tamanho(capacidade) : '?')),
    campo(tr('Sistema de arquivos:'), h('div.select-caixa', { style: { width: '100%' } }, sistema)),
    campo(tr('Rótulo do volume:'), rotulo),
    h('label', { style: { display: 'flex', gap: '6px', alignItems: 'flex-start', lineHeight: '13px', marginBottom: '8px' } }, chkInteiro,
      h('span', tr('Usar o pendrive inteiro (apaga todas as partições e cria uma só)'))),
    h('div', { style: { color: '#800000', lineHeight: '13px', margin: '4px 0 8px' } }, tr('Formatar apaga todos os arquivos do disco.')),
    situacao,
    h('div.acoes.direita', btIniciar, btFechar));
  btIniciar.addEventListener('click', async () => {
    const ok = await confirmar(tr('AVISO: formatar vai apagar TODOS os arquivos de {nome}.\n\nPara formatar, clique em Sim. Para sair, clique em Não.', { nome }), { titulo, tipo: 'aviso' });
    if (!ok) return;
    btIniciar.disabled = true;
    btFechar.disabled = true;
    situacao.textContent = textoDaConfirmacao() || tr('Formatando…');
    const opcoes = { sistema: sistema.value, rotulo: rotulo.value, inteiro: chkInteiro.checked };
    const fazer = (senha) => {
      situacao.textContent = textoDaConfirmacao() || tr('Formatando…');
      return (alvo.disco ? retro.discos.formatar(alvo, opcoes, senha) : retro.unidades.formatar(alvo.volume, opcoes, senha)).catch((e) => ({ ok: false, erro: e.message }));
    };
    const r = await comPermissao(tr('Para formatar o pendrive, digite a senha de administrador do Linux:'), fazer);
    btIniciar.disabled = false;
    btFechar.disabled = false;
    situacao.textContent = '';
    if (!r) return;
    if (r.ok) {
      await info(tr('Formatação concluída.'), titulo);
      j.fechar();
      if (aoTerminar) aoTerminar();
      return;
    }
    const t = textoDoErro(r);
    if (t) erro(t, titulo);
  });
  ajustarAoConteudo(j, { largura: 320 });
  return j;
}
