/*
 * A abertura: a tela do BIOS, a marca do Retro Computer e a área de trabalho.
 */
import { h, img, esperar } from './util.js';
import { carregarConfig, atualizarProgramas, estado, abrir, avisar, avisarRecebido, definirConfig } from './sistema.js';
import { aplicarFundo, aplicarEscala } from './aparencia.js';
import { montarBarra } from './barra.js';
import { montarMesa, atualizar as atualizarMesa } from './mesa.js';
import { tocar } from './sons.js';
import { confirmar } from './dialogos.js';
import * as janelas from './janelas.js';

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

const boot = document.getElementById('boot');

async function telaBios() {
  const linhas = [
    ['Retro Computer BIOS v1.0', true],
    ['Copyright (C) 2026, projeto Retro Computer (código aberto)', false],
    ['', false],
    [`Processador: ${navigator.hardwareConcurrency || 1} núcleo(s) ... OK`, false],
    ['Memória .......................... 640K OK', false],
    [`Disco C: ......................... ${estado.raizDisco ? 'OK' : '?'}`, false],
    [`Programas instalados ............. ${estado.instalados.length}`, false],
    ['', false],
    ['Iniciando o Retro Computer...', true],
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
    h('div.marca', img('logo', 32), h('div.nome', h('b', 'Retro Computer'), h('span', 'para produtividade'))),
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
  estado.raizDisco = await retro.disco.raiz();
  await atualizarProgramas().catch(() => { });
  aplicarFundo(estado.config.papel);
  await aplicarEscala(estado.config.escala);
  const rapido = estado.config.inicioRapido || new URLSearchParams(location.search).has('rapido');
  if (!rapido) {
    await telaBios();
    await telaAbertura();
  }
  montarBarra();
  await montarMesa();
  dicas();
  boot.classList.remove('visivel');
  boot.replaceChildren();
  if (!rapido) tocar('inicio');

  retro.sistema.aoPedidoDesligar(() => abrir('desligar'));
  retro.sistema.aoRecebido((rel) => avisarRecebido(rel));
  retro.sistema.aoLink(async (url) => {
    if (await confirmar(`Abrir este endereço no navegador do computador principal?\n\n${url}`, { titulo: 'Abrir endereço' })) retro.sistema.abrirLink(url);
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
    setTimeout(() => avisar('Bem-vindo!', 'Clique em Iniciar para começar. O disco C: é uma pasta do seu computador.', { icone: 'logo', som: null, ms: 9000 }), 1200);
  }
}

// Para os testes e as capturas.
window.__retro = { abrir, estado, janelas };

iniciar().catch((e) => {
  console.error(e);
  boot.classList.add('visivel');
  boot.replaceChildren(h('div.bios', `Erro ao iniciar o Retro Computer:\n\n${e && e.stack || e}`));
});
