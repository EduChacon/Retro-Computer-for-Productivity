/*
 * A abertura: a tela do BIOS, a marca do Retro Computer e a área de trabalho.
 */
import { h, img, esperar } from './util.js';
import { carregarConfig, atualizarProgramas, estado, abrir, avisar, avisarRecebido, definirConfig, abrirEndereco } from './sistema.js';
import { aplicarFundo, aplicarEscala } from './aparencia.js';
import { montarBarra } from './barra.js';
import { montarMesa, atualizar as atualizarMesa } from './mesa.js';
import { tocar } from './sons.js';
import { confirmar } from './dialogos.js';
import * as janelas from './janelas.js';
import { carregarIdioma, tr } from './idioma.js';
import { atualizarEmSegundoPlano } from './apps/programas.js';
import { programasAbertos } from './apps/craft.js';
import { procurarAtualizacao } from './atualizacao.js';
import { bloquearAoAbrir } from './bloqueio.js';
import { iniciarLuzNoturna } from './luz-noturna.js';

import './apps/explorador.js';
import './apps/bloco.js';
import './apps/craft.js';
import './apps/prompt.js';
import './apps/programas.js';
import './apps/painel.js';
import './apps/diversos.js';
import './apps/foco.js';
import './apps/protecao.js';
import './apps/ajuda.js';
import './apps/calculadora.js';
import './apps/navegador.js';
import './apps/campominado.js';
import './apps/paciencia.js';
import './apps/breakout.js';
import './apps/nativos.js';
import './apps/imagens.js';
import './apps/midia.js';
import './apps/captura.js';
import './apps/monitor.js';
import './apps/atualizacoes.js';
import './apps/transferencia.js';
import './atalhos.js';

const boot = document.getElementById('boot');

// As linhas do BIOS: o nome, os pontos e o valor alinhado na coluna 35.
const pontos = (nome, valor) => `${nome} ${'.'.repeat(Math.max(3, 33 - nome.length))} ${valor}`;

async function telaBios() {
  const linhas = [
    ['Retro Computer BIOS v1.0', true],
    [tr('Copyright (C) 2026, projeto Retro Computer (código aberto)'), false],
    ['', false],
    [tr('Processador: {n} núcleo(s) ... OK', { n: navigator.hardwareConcurrency || 1 }), false],
    [pontos(tr('Memória'), '640K OK'), false],
    [pontos(tr('Disco C:'), estado.raizDisco ? 'OK' : '?'), false],
    [pontos(tr('Programas instalados'), String(estado.instalados.length)), false],
    ['', false],
    [tr('Iniciando o Retro Computer...'), true],
  ];
  const pre = h('div.bios');
  boot.replaceChildren(pre);
  boot.classList.add('visivel');
  for (const [t, destaque] of linhas) {
    pre.append(destaque ? h('span.destaque', t) : t, '\n');
    await esperar(t ? 90 : 40);
  }
  await esperar(350);
}

async function telaAbertura() {
  const abertura = h('div.abertura',
    h('div.marca', img('logo', 32), h('div.nome', h('b', 'Retro Computer'), h('span', tr('para produtividade')))),
    h('div.barra-carga'));
  boot.replaceChildren(abertura);
  await esperar(1500);
}

function dicas() {
  // Dicas no estilo da época (a caixinha amarela), no lugar das do sistema.
  const dica = document.getElementById('dica');
  let timer = null;
  let alvo = null;
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[title], [data-dica]');
    if (el === alvo) return;
    clearTimeout(timer);
    dica.hidden = true;
    alvo = el;
    if (!el) return;
    if (el.hasAttribute('title')) {
      el.dataset.dica = el.getAttribute('title');
      el.removeAttribute('title');
    }
    const texto = el.dataset.dica;
    if (!texto) return;
    timer = setTimeout(() => {
      dica.textContent = texto;
      dica.hidden = false;
      const r = dica.getBoundingClientRect();
      const t = document.getElementById('tela').getBoundingClientRect();
      let x = e.clientX + 2;
      let y = e.clientY + 20;
      if (x + r.width > t.width) x = t.width - r.width - 2;
      if (y + r.height > t.height) y = e.clientY - r.height - 4;
      dica.style.left = x + 'px';
      dica.style.top = y + 'px';
    }, 650);
  });
  document.addEventListener('mousedown', () => { clearTimeout(timer); dica.hidden = true; }, true);
}

async function iniciar() {
  await carregarConfig();
  // O idioma vem antes de qualquer texto na tela.
  await carregarIdioma(estado.config.idiomaEfetivo || 'pt-BR');
  estado.raizDisco = await retro.disco.raiz();
  await atualizarProgramas().catch(() => { });
  aplicarFundo(estado.config.papel);
  await aplicarEscala(estado.config.escala);
  iniciarLuzNoturna();
  const rapido = estado.config.inicioRapido || new URLSearchParams(location.search).has('rapido');
  if (!rapido) {
    await telaBios();
    await telaAbertura();
  }
  montarBarra();
  await montarMesa();
  dicas();
  // Com "pedir a senha ao abrir", a área de trabalho só aparece depois da senha.
  bloquearAoAbrir();
  boot.classList.remove('visivel');
  boot.replaceChildren();
  if (!rapido) tocar('inicio');

  retro.sistema.aoPedidoDesligar(() => abrir('desligar'));
  retro.sistema.aoRecebido((rel) => avisarRecebido(rel));
  retro.sistema.aoLink(async (url) => {
    // Os links dos programas abrem no Navegador; no do computador principal, só com a confirmação.
    if ((estado.config.navegador || {}).links !== 'principal' || estado.config.modoSistema) return abrirEndereco(url);
    if (await confirmar(tr('Abrir este endereço no navegador do computador principal?\n\n{url}', { url }), { titulo: tr('Abrir endereço') })) retro.sistema.abrirLink(url);
  });
  document.addEventListener('retro-disco-trocado', async () => {
    estado.raizDisco = await retro.disco.raiz();
    atualizarMesa();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F1') { e.preventDefault(); abrir('ajuda'); }
  });
  // O tamanho dos pixels acompanha o monitor (ao mudar de tela).
  matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', () => aplicarEscala(estado.config.escala));

  if (estado.config.primeiraVez) {
    await definirConfig({ primeiraVez: false });
    abrir('ajuda', { topico: 'inicio' });
    setTimeout(() => avisar(tr('Bem-vindo!'), tr('Clique em Iniciar para começar. O disco C: é uma pasta do seu computador.'), { icone: 'logo', som: null, ms: 9000 }), 1200);
  }

  // As atualizações: os programas (sem mexer nos que estão abertos) e o próprio Retro Computer.
  setTimeout(() => {
    atualizarEmSegundoPlano(() => programasAbertos().map((p) => p.id)).catch(() => { });
    if (estado.config.atualizacoes !== 'nunca') procurarAtualizacao().catch(() => { });
  }, 20000);
}

// Para os testes e as capturas.
window.__retro = { abrir, estado, janelas, definirConfig };

iniciar().catch((e) => {
  console.error(e);
  boot.classList.add('visivel');
  boot.replaceChildren(h('div.bios', `${tr('Erro ao iniciar o Retro Computer:')}\n\n${e && e.stack || e}`));
});
