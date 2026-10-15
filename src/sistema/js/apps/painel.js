/*
 * O Painel de controle: Aparência, Disco C:, Claude, Sons, Data e hora,
 * Adicionar ou remover programas, Foco e Sobre.
 */
import { h, img, tamanho, caminhoTela } from '../util.js';
import { Janela, lista as janelas } from '../janelas.js';
import { VistaIcones } from '../vista.js';
import { abrirMenu } from '../menus.js';
import { registrarApp, estado, definirConfig, abrir, carregarConfig, avisar } from '../sistema.js';
import { ajustarAoConteudo, confirmar, erro, info } from '../dialogos.js';
import { CORES, PADROES, fundoCss, aplicarFundo, aplicarEscala } from '../aparencia.js';
import { tocar } from '../sons.js';
import { esvaziarLixeira } from '../mesa.js';

const ITENS = [
  { chave: 'aparencia', rotulo: 'Aparência', icone: 'aparencia', abrir: () => dialogoAparencia() },
  { chave: 'disco', rotulo: 'Disco C:', icone: 'disco', abrir: () => dialogoDisco() },
  { chave: 'claude', rotulo: 'Claude', icone: 'claude', abrir: () => dialogoClaude() },
  { chave: 'sons', rotulo: 'Sons', icone: 'sons', abrir: () => dialogoSons() },
  { chave: 'data', rotulo: 'Data e hora', icone: 'relogio', abrir: () => dialogoData() },
  { chave: 'programas', rotulo: 'Adicionar ou remover programas', icone: 'programas-caixa', abrir: () => abrir('programas') },
  { chave: 'foco', rotulo: 'Foco', icone: 'foco', abrir: () => abrir('foco') },
  { chave: 'sobre', rotulo: 'Sobre o Retro Computer', icone: 'computador', abrir: () => dialogoSobre() },
];

function abrirPainel(args = {}) {
  if (args.secao) {
    const it = ITENS.find((i) => i.chave === args.secao);
    if (it) return it.abrir();
  }
  const aberta = janelas.find((j) => j.id === 'painel');
  if (aberta) return aberta.focar();
  const j = new Janela({
    id: 'painel', titulo: 'Painel de controle', icone: 'painel', largura: 420, altura: 300,
    status: [{ texto: `${ITENS.length} objeto(s)`, largura: 120, fixo: true }, ''],
    menus: [
      { rotulo: '&Arquivo', itens: () => [{ rotulo: '&Fechar', acao: () => j.fechar() }] },
      { rotulo: '&Exibir', itens: () => [{ rotulo: 'Ícones &grandes', radio: true, marcado: vista.modo === 'icones', acao: () => vista.definirModo('icones') }, { rotulo: '&Lista', radio: true, marcado: vista.modo === 'lista', acao: () => vista.definirModo('lista') }] },
      { rotulo: 'A&juda', itens: () => [{ rotulo: '&Tópicos da Ajuda', acao: () => abrir('ajuda', { topico: 'painel' }) }] },
    ],
  });
  const area = h('div.lista-arquivos', { style: { flex: '1' } });
  j.corpo.append(area);
  const descricoes = {
    aparencia: 'Muda a cor e o padrão do fundo, a tela cheia e o tamanho dos pixels.',
    disco: 'Mostra a pasta do disco C: no computador principal e permite trocá-la.',
    claude: 'Instala o Claude Code e guarda a chave de API.',
    sons: 'Liga, desliga e ajusta os sons do sistema.',
    data: 'Mostra a data e a hora do computador.',
    programas: 'Instala e remove programas.',
    foco: 'Abre o relógio de foco (Pomodoro).',
    sobre: 'Versão, licenças e créditos.',
  };
  const vista = new VistaIcones(area, {
    modo: 'icones',
    aoAbrir: (it) => ITENS.find((i) => i.chave === it.chave).abrir(),
    aoMenu: (sel, e) => { if (sel.length) abrirMenu([{ rotulo: '&Abrir', negrito: true, acao: () => ITENS.find((i) => i.chave === sel[0].chave).abrir() }], { x: e.clientX, y: e.clientY }); },
    aoSelecionar: (sel) => j.definirStatus([{ texto: `${ITENS.length} objeto(s)`, largura: 120, fixo: true }, sel.length === 1 ? descricoes[sel[0].chave] : '']),
  });
  vista.desenhar(ITENS.map((i) => ({ chave: i.chave, rotulo: i.rotulo, icone: i.icone, arrastavel: false })));
  return j;
}

/* ---------- Diálogos de propriedades ---------- */

function dialogoBase({ titulo, icone, abas, larg = 380, aoAplicar }) {
  const existente = janelas.find((x) => x.titulo === titulo);
  if (existente) { existente.focar(); return null; }
  const j = new Janela({ titulo, icone, largura: larg, altura: 420, redimensionavel: false, minimizavel: false, maximizavel: false });
  let atual = 0;
  const cab = h('div.abas');
  const painel = h('div.painel-aba');
  const desenhar = () => {
    cab.replaceChildren(...abas.map((a, i) => {
      const t = h('div' + (i === atual ? '.ativa' : ''), a.titulo);
      t.addEventListener('mousedown', () => { atual = i; desenhar(); });
      return t;
    }));
    painel.replaceChildren(abas[atual].conteudo);
  };
  desenhar();
  const aplicar = async () => { if (aoAplicar) await aoAplicar(); };
  const acoes = h('div.acoes.direita',
    h('button.padrao', { on: { click: async () => { await aplicar(); j.fechar(); } } }, 'OK'),
    h('button', { on: { click: () => j.fechar() } }, 'Cancelar'),
    aoAplicar ? h('button', { on: { click: aplicar } }, rotuloAplicar()) : null,
  );
  j.corpo.style.padding = '8px';
  j.corpo.append(cab, painel, acoes);
  ajustarAoConteudo(j, { largura: larg });
  return j;
}

function rotuloAplicar() {
  const s = h('span');
  s.append(h('u.atalho', 'A'), 'plicar');
  return s;
}

/* Aparência */

function dialogoAparencia() {
  const c = estado.config;
  let papel = { ...c.papel };
  let telaCheia = c.telaCheiaAgora;
  let escala = c.escala || 'auto';
  let protecao = { ...c.protecaoTela };

  const previa = h('div.tela-previa');
  const atualizarPrevia = () => Object.assign(previa.style, fundoCss(papel));
  const monitor = h('div.monitor-previa', previa);
  atualizarPrevia();

  const cores = h('div.cores', CORES.map((cor) => {
    const el = h('div', { title: cor }, h('div', { style: { background: cor } }));
    el.addEventListener('mousedown', () => { papel.cor = cor; marcarCores(); atualizarPrevia(); });
    return el;
  }));
  const marcarCores = () => [...cores.children].forEach((el, i) => el.classList.toggle('sel', CORES[i] === papel.cor));
  marcarCores();
  const outra = h('input', { type: 'color', value: papel.cor, style: { width: '40px', height: '21px', padding: '0', border: 'none' } });
  outra.addEventListener('input', () => { papel.cor = outra.value; marcarCores(); atualizarPrevia(); });

  const listaPadroes = h('select', { size: 6, style: { height: 'auto', width: '140px', background: '#fff' } }, Object.entries(PADROES).map(([k, p]) => h('option', { value: k }, p.nome)));
  listaPadroes.value = papel.padrao || 'nenhum';
  listaPadroes.addEventListener('change', () => { papel.padrao = listaPadroes.value; atualizarPrevia(); });

  const abaFundo = h('div',
    monitor,
    h('div', { style: { display: 'flex', gap: '14px' } },
      h('fieldset', { style: { flex: '1', margin: '0' } }, h('legend', 'Cor'), cores, h('div', { style: { marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' } }, 'Outra:', outra)),
      h('fieldset', { style: { margin: '0' } }, h('legend', 'Padrão'), listaPadroes)),
  );

  const chkProt = h('input', { type: 'checkbox', checked: protecao.ligada });
  const minProt = h('input', { type: 'number', min: 1, max: 120, value: protecao.minutos, style: { width: '56px' } });
  const tipoProt = h('select', h('option', { value: 'estrelas' }, 'Voando pelas estrelas'), h('option', { value: 'canos' }, 'Linhas coloridas'), h('option', { value: 'relogio' }, 'Relógio'));
  tipoProt.value = protecao.tipo || 'estrelas';
  const abaProtecao = h('div',
    h('div.monitor-previa', h('div.tela-previa', { style: { background: '#000' } })),
    h('fieldset', { style: { margin: '0' } }, h('legend', 'Proteção de tela'),
      h('div.linha', h('div.select-caixa', { style: { flex: '1' } }, tipoProt), h('button', { on: { click: () => { aplicarProt(); abrir('protecao', { agora: true }); } } }, 'Visualizar')),
      h('div.linha', h('label', chkProt, h('span', 'Ligar depois de')), minProt, h('span', 'minutos sem uso'))),
  );
  const aplicarProt = () => { protecao = { ligada: chkProt.checked, minutos: Math.max(1, Number(minProt.value) || 10), tipo: tipoProt.value }; };

  const radioCheia = h('input', { type: 'radio', name: 'modo-tela', checked: telaCheia });
  const radioJanela = h('input', { type: 'radio', name: 'modo-tela', checked: !telaCheia });
  const selEscala = h('select', h('option', { value: 'auto' }, 'Automático'), h('option', { value: '1' }, '1 × (pequeno)'), h('option', { value: '2' }, '2 × (grande)'), h('option', { value: '3' }, '3 × (muito grande)'));
  selEscala.value = String(escala);
  const chkRapido = h('input', { type: 'checkbox', checked: !!c.inicioRapido });
  const abaConfig = h('div',
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', 'Tela'),
      h('div', h('label', radioCheia, h('span', 'Tela cheia (recomendado para o foco)'))),
      h('div', { style: { marginTop: '6px' } }, h('label', radioJanela, h('span', 'Numa janela do computador principal'))),
      h('div', { style: { marginTop: '6px', color: '#808080' } }, 'A tecla F11 alterna a qualquer momento.')),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', 'Tamanho dos pixels'),
      h('div.linha', h('div.select-caixa', { style: { flex: '1' } }, selEscala)),
      h('div', { style: { color: '#808080', lineHeight: '13px' } }, 'Cada pixel da interface usa um número inteiro de pixels da tela, para as letras e os ícones ficarem nítidos.')),
    h('fieldset', { style: { margin: '0' } }, h('legend', 'Inicialização'),
      h('label', chkRapido, h('span', 'Pular a tela de abertura'))),
  );

  dialogoBase({
    titulo: 'Propriedades de Aparência',
    icone: 'aparencia',
    larg: 440,
    abas: [{ titulo: 'Plano de fundo', conteudo: abaFundo }, { titulo: 'Proteção de tela', conteudo: abaProtecao }, { titulo: 'Configurações', conteudo: abaConfig }],
    aoAplicar: async () => {
      aplicarProt();
      escala = selEscala.value;
      await definirConfig({ papel, escala, protecaoTela: protecao, inicioRapido: chkRapido.checked });
      aplicarFundo(papel);
      await aplicarEscala(escala);
      if (radioCheia.checked !== telaCheia) {
        telaCheia = radioCheia.checked;
        await retro.sistema.telaCheia(telaCheia);
      }
    },
  });
}

/* Disco */

async function dialogoDisco() {
  const raiz = await retro.disco.raiz();
  const esp = await retro.disco.espaco();
  const lixo = await retro.disco.lixeira();
  const usado = esp.total - esp.livre;
  const pct = esp.total ? usado / esp.total : 0;
  const pizza = h('div', { style: { width: '120px', height: '60px', margin: '10px auto', borderRadius: '50%', background: `conic-gradient(#0000ff 0 ${pct * 360}deg, #ff00ff ${pct * 360}deg 360deg)`, boxShadow: '0 6px 0 #555', transform: 'scaleY(0.75)' } });
  const caminho = h('div.campo', { style: { height: 'auto', userSelect: 'text', overflowWrap: 'anywhere', marginBottom: '8px' } }, raiz);
  const conteudo = h('div',
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' } }, img('disco', 32), h('b', 'Disco local (C:)')),
    h('hr.sulco'),
    h('div', 'Pasta no computador principal:'),
    caminho,
    h('div', { style: { display: 'flex', gap: '6px', marginBottom: '10px' } },
      h('button', { on: { click: () => retro.disco.mostrar('') } }, 'Mostrar a pasta'),
      h('button', { on: { click: trocar } }, 'Trocar a pasta…')),
    h('hr.sulco'),
    h('div', { style: { display: 'grid', gridTemplateColumns: '14px 100px 1fr', gap: '4px 6px', alignItems: 'center' } },
      h('div', { style: { width: '12px', height: '12px', background: '#0000ff', boxShadow: 'inset 0 0 0 1px #000' } }), 'Espaço usado:', tamanho(usado),
      h('div', { style: { width: '12px', height: '12px', background: '#ff00ff', boxShadow: 'inset 0 0 0 1px #000' } }), 'Espaço livre:', tamanho(esp.livre),
      h('div'), 'Capacidade:', tamanho(esp.total)),
    pizza,
    h('hr.sulco'),
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, img(lixo.length ? 'lixeira-cheia' : 'lixeira', 32),
      h('div', { style: { flex: '1' } }, `A Lixeira tem ${lixo.length} item(ns). Os itens só são apagados de verdade quando você a esvazia.`),
      h('button', { disabled: !lixo.length, on: { click: () => esvaziarLixeira() } }, 'Esvaziar')),
  );
  async function trocar() {
    const ok = await confirmar('O Retro Computer vai passar a usar outra pasta como disco C:.\n\nOs arquivos da pasta atual continuam onde estão; nada é apagado.\n\nDeseja escolher a nova pasta?', { titulo: 'Trocar a pasta do disco' });
    if (!ok) return;
    const nova = await retro.disco.trocar().catch((e) => { erro(e.message); return null; });
    if (nova) {
      caminho.textContent = nova;
      avisar('Disco C: trocado', nova, { som: null });
      document.dispatchEvent(new CustomEvent('retro-disco-trocado'));
    }
  }
  dialogoBase({ titulo: 'Propriedades de Disco local (C:)', icone: 'disco', larg: 360, abas: [{ titulo: 'Geral', conteudo }] });
}

/* Claude */

async function dialogoClaude() {
  const c = await carregarConfig();
  const estadoEl = h('div', 'Procurando o Claude Code…');
  const btInstalar = h('button', { hidden: true, on: { click: () => abrir('claude') } }, 'Instalar…');
  retro.terminal.acharClaude().then((p) => {
    estadoEl.textContent = p ? `Instalado: ${p}` : 'O Claude Code não está instalado.';
    btInstalar.hidden = !!p;
  });
  const campo = h('input', { type: 'password', placeholder: c.temChave ? '•••••••• (guardada)' : 'sk-ant-…', spellcheck: false, style: { width: '100%' } });
  const situacao = h('div', { style: { color: '#808080', marginTop: '4px', lineHeight: '13px' } },
    c.cofre
      ? (c.temChave ? 'Há uma chave guardada (cifrada pelo cofre de senhas do sistema).' : 'Nenhuma chave guardada.')
      : 'O cofre de senhas do sistema não está disponível: a chave não pode ser guardada aqui.');
  const conteudo = h('div.texto-ajuda',
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' } }, img('claude', 32), h('div', h('b', 'Claude Code'), h('div', 'O assistente de programação e de trabalho da Anthropic, no Prompt de comando.'))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', 'Programa'),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, h('div', { style: { flex: '1', overflowWrap: 'anywhere' } }, estadoEl), btInstalar)),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', 'Chave de API (opcional)'),
      h('p', { style: { marginTop: '0' } }, 'Com uma chave, o Claude Code a usa direto; sem ela, ele pede para entrar com a conta da sua assinatura do Claude.'),
      campo, situacao,
      h('div', { style: { display: 'flex', gap: '6px', marginTop: '8px' } },
        h('button', { disabled: !c.cofre, on: { click: guardar } }, 'Guardar'),
        h('button', { disabled: !c.temChave, on: { click: apagar } }, 'Apagar a chave'),
        h('button', { on: { click: () => retro.sistema.abrirLink('https://console.anthropic.com/settings/keys') } }, 'Obter uma chave…'))),
    h('p', { style: { color: '#808080' } }, 'A chave só é entregue ao Prompt de comando (variável ANTHROPIC_API_KEY); ela não aparece na tela nem vai para o disco C:.'),
  );
  async function guardar() {
    const v = campo.value.trim();
    if (!v) return;
    try {
      await retro.config.gravarChave(v);
      campo.value = '';
      campo.placeholder = '•••••••• (guardada)';
      situacao.textContent = 'Chave guardada (cifrada pelo cofre de senhas do sistema). Vale para os próximos Prompts abertos.';
      await carregarConfig();
    } catch (e) {
      erro(e.message, 'Claude');
    }
  }
  async function apagar() {
    if (!(await confirmar('Apagar a chave de API guardada?', { titulo: 'Claude' }))) return;
    await retro.config.gravarChave('');
    campo.placeholder = 'sk-ant-…';
    situacao.textContent = 'Nenhuma chave guardada.';
    await carregarConfig();
  }
  dialogoBase({ titulo: 'Propriedades do Claude', icone: 'claude', larg: 400, abas: [{ titulo: 'Geral', conteudo }] });
}

/* Sons */

function dialogoSons() {
  const c = estado.config;
  const chk = h('input', { type: 'checkbox', checked: !!c.sons });
  const vol = h('input', { type: 'range', min: 0, max: 100, value: Math.round((c.volume || 0) * 100), style: { flex: '1' } });
  const teste = (nome, rot) => h('button', { on: { click: async () => { await definirConfig({ sons: chk.checked, volume: vol.value / 100 }); tocar(nome); } } }, rot);
  const conteudo = h('div',
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' } }, img('sons', 32), h('label', chk, h('span', 'Tocar os sons do sistema'))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', 'Volume'), h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, 'Baixo', vol, 'Alto')),
    h('fieldset', { style: { margin: '0' } }, h('legend', 'Ouvir'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' } },
        teste('inicio', 'Abertura'), teste('desligar', 'Desligar'), teste('erro', 'Erro'), teste('aviso', 'Aviso'),
        teste('pergunta', 'Pergunta'), teste('lixeira', 'Lixeira'), teste('foco', 'Fim do foco'), teste('info', 'Informação'))),
  );
  dialogoBase({
    titulo: 'Propriedades de Sons', icone: 'sons', larg: 340,
    abas: [{ titulo: 'Sons', conteudo }],
    aoAplicar: () => definirConfig({ sons: chk.checked, volume: vol.value / 100 }),
  });
}

/* Data e hora */

function dialogoData() {
  const relogio = h('canvas', { width: 120, height: 120, style: { width: '120px', height: '120px', display: 'block', margin: '0 auto 8px', imageRendering: 'auto' } });
  const texto = h('div', { style: { textAlign: 'center', fontWeight: 'bold' } });
  const desenhar = () => {
    const d = new Date();
    const ctx = relogio.getContext('2d');
    ctx.clearRect(0, 0, 120, 120);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(60, 60, 54, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#808080'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#000';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.fillRect(60 + Math.sin(a) * 46 - 2, 60 - Math.cos(a) * 46 - 2, 4, 4);
    }
    const ponteiro = (frac, comp, larg, cor) => {
      const a = frac * Math.PI * 2;
      ctx.strokeStyle = cor; ctx.lineWidth = larg; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(60, 60); ctx.lineTo(60 + Math.sin(a) * comp, 60 - Math.cos(a) * comp); ctx.stroke();
    };
    ponteiro(((d.getHours() % 12) + d.getMinutes() / 60) / 12, 28, 4, '#000080');
    ponteiro((d.getMinutes() + d.getSeconds() / 60) / 60, 40, 3, '#000080');
    ponteiro(d.getSeconds() / 60, 44, 1, '#800000');
    texto.textContent = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' — ' + d.toLocaleTimeString('pt-BR');
  };
  desenhar();
  const t = setInterval(desenhar, 1000);
  const conteudo = h('div', relogio, texto, h('p', { style: { color: '#808080', textAlign: 'center', marginTop: '10px' } }, 'A data e a hora vêm do computador principal.'), h('p', { style: { color: '#808080', textAlign: 'center' } }, `Fuso horário: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`));
  const j = dialogoBase({ titulo: 'Propriedades de Data e hora', icone: 'relogio', larg: 320, abas: [{ titulo: 'Data e hora', conteudo }] });
  if (j) j.ev.on('fechada', () => clearInterval(t));
  else clearInterval(t);
}

/* Sobre */

function dialogoSobre() {
  const c = estado.config;
  const conteudo = h('div.texto-ajuda',
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' } }, img('logo', 32), h('div', h('b', 'Retro Computer'), h('div', `Versão ${c.versaoApp} · ${({ win32: 'Windows', darwin: 'macOS', linux: 'Linux' })[c.plataforma] || c.plataforma}`))),
    h('p', 'Um computador retrô para produtividade, de código aberto (licença MIT).'),
    h('hr.sulco'),
    h('p', h('b', 'Créditos')),
    h('p', 'Ícones e fontes de sistema: SerenityOS (BSD-2-Clause), com as pastas recoloridas; o computador, o disquete, a caixa, o tomate e a pena são desenhos próprios do projeto.'),
    h('p', 'Terminal: xterm.js (MIT) e node-pty (MIT). Aplicativo: Electron (MIT).'),
    h('p', 'Os programas Craft são do ArtCraft Team (MIT ou Apache-2.0), baixados dos lançamentos oficiais; os nomes e logotipos são marcas deles.'),
    h('p', 'Claude e Claude Code são da Anthropic.'),
    h('p', { style: { color: '#808080' } }, 'O visual homenageia os computadores pessoais dos anos 90; nenhum ícone, som ou fonte da Microsoft ou da Apple é usado.'),
  );
  dialogoBase({ titulo: 'Sobre o Retro Computer', icone: 'computador', larg: 380, abas: [{ titulo: 'Geral', conteudo }] });
}

registrarApp('painel', { nome: 'Painel de controle', icone: 'painel', abrir: abrirPainel });
export { info, caminhoTela };
