/*
 * A abertura: a tela do BIOS, a marca do Retro Computer e a área de trabalho.
 */
import { h, img, esperar } from './util.js';
import { carregarConfig, atualizarProgramas, estado, abrir, avisar, avisarRecebido, definirConfig, abrirEndereco, registrarPreguicoso, carregarOsQueFaltam, eventos as evSistema } from './sistema.js';
import { aplicarFundo, aplicarEscala, fundoParaTema } from './aparencia.js';
import { montarBarra } from './barra.js';
import { montarBarraMac } from './barra-mac.js';
import { aplicarTema, temaMac, temaAtual } from './tema.js';
import { montarMesa, atualizar as atualizarMesa } from './mesa.js';
import { tocar } from './sons.js';
import { confirmar } from './dialogos.js';
import * as janelas from './janelas.js';
import { carregarIdioma, tr } from './idioma.js';
import { atualizarEmSegundoPlano } from './apps/programas.js';
import { programasAbertos } from './apps/craft.js';
import { procurarAtualizacao } from './atualizacao.js';
import { bloquearAoAbrir } from './bloqueio.js';
import { carregarPerfis, telaDeEntrada } from './perfis.js';
import { iniciarLuzNoturna } from './luz-noturna.js';
import { iniciarTelas, telaDoPonto } from './telas.js';
import { iniciarAcessibilidade } from './acessibilidade.js';

import './apps/explorador.js';
import './apps/bloco.js';
import './apps/craft.js';
import './apps/programas.js';
import './apps/diversos.js';
import './apps/protecao.js';
import './apps/navegador.js';
import './apps/nativos.js';
import './apps/imagens.js';
import './apps/midia.js';
import './apps/atualizacoes.js';
import './atalhos.js';
import { iniciarMcp } from './mcp.js';

// Estes carregam só quando abrem (ou com o computador parado, logo depois da abertura). Os de
// cima ficam prontos desde o início: abrem arquivos pelo tipo, recebem avisos do processo
// principal (os links, as permissões do Navegador) ou têm relógios próprios.
registrarPreguicoso({ prompt: { nome: 'Prompt de comando', icone: 'prompt' }, claude: { nome: 'Claude', icone: 'claude' } }, () => import('./apps/prompt.js'));
registrarPreguicoso({ painel: { nome: 'Painel de controle', icone: 'painel' } }, () => import('./apps/painel.js'));
registrarPreguicoso({ foco: { nome: 'Foco', icone: 'foco' } }, () => import('./apps/foco.js'));
registrarPreguicoso({ ajuda: { nome: 'Ajuda', icone: 'ajuda' } }, () => import('./apps/ajuda.js'));
registrarPreguicoso({ calculadora: { nome: 'Calculadora', icone: 'calculadora' } }, () => import('./apps/calculadora.js'));
registrarPreguicoso({ antivirus: { nome: 'Antivírus', icone: 'seguranca' } }, () => import('./apps/antivirus.js'));
registrarPreguicoso({ caracteres: { nome: 'Mapa de caracteres', icone: 'caracteres' } }, () => import('./apps/caracteres.js'));
registrarPreguicoso({ diario: { nome: 'Diário de trabalho', icone: 'diario' } }, () => import('./apps/diario.js'));
registrarPreguicoso({ discos: { nome: 'Discos', icone: 'discos' } }, () => import('./apps/discos.js'));
registrarPreguicoso({ pdf: { nome: 'Ferramentas de PDF', icone: 'pdf' } }, () => import('./apps/pdf.js'));
registrarPreguicoso({ ocr: { nome: 'Copiar o texto', icone: 'texto' } }, () => import('./apps/ocr.js'));
registrarPreguicoso({ captura: { nome: 'Captura de tela', icone: 'captura' } }, () => import('./apps/captura.js'));
registrarPreguicoso({ monitor: { nome: 'Monitor do sistema', icone: 'monitor' } }, () => import('./apps/monitor.js'));
registrarPreguicoso({ transferencia: { nome: 'Área de transferência', icone: 'transferencia' } }, () => import('./apps/transferencia.js'));
registrarPreguicoso({ 'campo-minado': { nome: 'Campo Minado', icone: 'campo-minado' } }, () => import('./apps/campominado.js'));
registrarPreguicoso({ paciencia: { nome: 'Paciência', icone: 'paciencia' } }, () => import('./apps/paciencia.js'));
registrarPreguicoso({ breakout: { nome: 'Breakout', icone: 'breakout' } }, () => import('./apps/breakout.js'));
registrarPreguicoso({ damas: { nome: 'Damas', icone: 'damas' } }, () => import('./apps/damas.js'));
registrarPreguicoso({ dos: { nome: 'DOS', icone: 'dos' } }, () => import('./apps/dos.js'));
registrarPreguicoso({ mac: { nome: 'Mac Plus', icone: 'mac' } }, () => import('./apps/mac.js'));
registrarPreguicoso({ xadrez: { nome: 'Xadrez', icone: 'xadrez' } }, () => import('./apps/xadrez.js'));

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
  if (temaMac()) return aberturaMac();
  const abertura = h('div.abertura',
    h('div.marca', img('logo', 32), h('div.nome', h('b', 'Retro Computer'), h('span', tr('para produtividade')))),
    h('div.barra-carga'));
  boot.replaceChildren(abertura);
  await esperar(1500);
}

/**
 * A abertura do tema Mac clássico, como a do Mac da época: a caixa no meio, com a marca e a barra de
 * progresso, e os ícones dos programas aparecendo embaixo, um a um (sem a tela do BIOS).
 */
async function aberturaMac() {
  const barra = h('div');
  const icones = h('div.am-icones');
  boot.replaceChildren(h('div.abertura-mac',
    h('div.am-caixa', h('div.am-marca', img('logo', 32), h('b', 'Retro Computer')), h('div.am-texto', tr('Iniciando…')), h('div.progresso', barra)),
    icones));
  boot.classList.add('visivel');
  const nomes = ['disco', 'computador', 'pasta', 'documentos', 'navegador', 'correio', 'painel', 'claude'];
  for (let i = 0; i < nomes.length; i++) {
    barra.style.width = Math.round(((i + 1) / nomes.length) * 100) + '%';
    icones.append(img(nomes[i], 32));
    await esperar(170);
  }
  await esperar(250);
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
      // A tela do ponteiro (com as duas telas, a dica não passa para a outra).
      const s = telaDoPonto(e.clientX, e.clientY);
      let x = e.clientX + 2;
      let y = e.clientY + 20;
      if (x + r.width > s.x + s.w) x = s.x + s.w - r.width - 2;
      if (y + r.height > s.y + s.h) y = e.clientY - r.height - 4;
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
  aplicarTema(estado.config.tema);
  evSistema.on('config', () => {
    // O fundo de sempre de um tema vira o do outro, mude o tema por onde mudar (o Painel já manda
    // o fundo trocado; o Claude, pelo servidor MCP, só o tema).
    const antes = temaAtual();
    const depois = estado.config.tema === 'mac' ? 'mac' : 'pc';
    if (antes !== depois) {
      const atual = estado.config.papel || {};
      const papel = fundoParaTema(atual, antes, depois);
      aplicarFundo(papel);
      if (papel.cor !== atual.cor || papel.padrao !== atual.padrao) definirConfig({ papel }).catch(() => { });
    }
    aplicarTema(estado.config.tema);
  });
  aplicarFundo(estado.config.papel);
  await aplicarEscala(estado.config.escala);
  // As duas telas em tela cheia: onde está cada monitor dentro da janela (telas.js).
  await iniciarTelas().catch(() => { });
  iniciarLuzNoturna();
  iniciarAcessibilidade();
  // O Claude do Prompt pede pelo processo principal o que só a área de trabalho faz (mcp.js).
  iniciarMcp();
  // O fim da cópia de segurança (a automática e a feita na hora): um aviso, e o erro quando houver.
  retro.copia.aoFim(async (r) => {
    await carregarConfig();
    if (r.ok) {
      if (r.manual || r.copiados) avisar(tr('Cópia de segurança'), tr('Pronta: {n} arquivo(s) copiado(s).', { n: r.copiados }), { icone: 'copia' });
    } else {
      const { erroDaCopia } = await import('./apps/painel.js');
      avisar(tr('Cópia de segurança'), erroDaCopia(r) || tr('A cópia não terminou.'), { icone: 'copia', aoClicar: () => abrir('painel', { secao: 'copia' }) });
    }
  });
  // Os usuários: na troca de usuário e no logoff, o Retro Computer abre de novo sem o BIOS.
  const perfis = await carregarPerfis();
  const rapido = estado.config.inicioRapido || new URLSearchParams(location.search).has('rapido') || perfis.reaberto;
  if (!rapido) {
    if (!temaMac()) await telaBios();
    await telaAbertura();
  }
  // Com mais de um usuário (ou depois do logoff), a tela de entrada vem antes da área de trabalho.
  let entrou = perfis.entrou;
  if (perfis.logon) {
    boot.classList.remove('visivel');
    boot.replaceChildren();
    await telaDeEntrada();
    entrou = true;
  }
  montarBarra();
  montarBarraMac();
  await montarMesa();
  dicas();
  // Com "pedir a senha ao abrir", a área de trabalho só aparece depois da senha (a não ser que ela
  // tenha sido pedida na tela de entrada, ou que seja o mesmo usuário abrindo de novo).
  if (!entrou) bloquearAoAbrir();
  boot.classList.remove('visivel');
  boot.replaceChildren();
  if (!rapido) tocar('inicio');
  // O que o computador principal mandou antes de a área de trabalho ficar pronta (o Dock do Mac, o "Enviar para" do Windows).
  retro.computador.pronto().catch(() => { });
  // Os programas que ficaram para depois carregam com o computador parado: a primeira vez que abrem já é rápida.
  setTimeout(carregarOsQueFaltam, 4000);

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

// Para os testes e as capturas (mostrarAbertura: a tela da marca, a do tema de agora, por cima da área de trabalho).
const mostrarAbertura = async () => { await telaAbertura(); boot.classList.remove('visivel'); boot.replaceChildren(); };
window.__retro = { abrir, estado, janelas, definirConfig, mostrarAbertura };

iniciar().catch((e) => {
  console.error(e);
  boot.classList.add('visivel');
  boot.replaceChildren(h('div.bios', `${tr('Erro ao iniciar o Retro Computer:')}\n\n${e && e.stack || e}`));
});
