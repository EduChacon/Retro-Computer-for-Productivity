/*
 * O Painel de controle: Aparência, Disco C:, Claude, Idioma, Sons, Data e hora,
 * Adicionar ou remover programas, Foco e Sobre.
 */
import { h, img, tamanho, caminhoTela, rotulo } from '../util.js';
import { Janela, lista as janelas } from '../janelas.js';
import { VistaIcones } from '../vista.js';
import { abrirMenu } from '../menus.js';
import { registrarApp, estado, definirConfig, abrir, carregarConfig, avisar } from '../sistema.js';
import { ajustarAoConteudo, confirmar, erro, info } from '../dialogos.js';
import { CORES, PADROES, fundoCss, aplicarFundo, aplicarEscala } from '../aparencia.js';
import { tocar } from '../sons.js';
import { esvaziarLixeira } from '../mesa.js';
import { tr, marcar, IDIOMAS, localidade } from '../idioma.js';

const ITENS = [
  { chave: 'aparencia', rotulo: marcar('Aparência'), icone: 'aparencia', descricao: marcar('Muda a cor e o padrão do fundo, a tela cheia e o tamanho dos pixels.'), abrir: () => dialogoAparencia() },
  { chave: 'disco', rotulo: marcar('Disco C:'), icone: 'disco', descricao: marcar('Mostra a pasta do disco C: no computador principal e permite trocá-la.'), abrir: () => dialogoDisco() },
  { chave: 'claude', rotulo: marcar('Claude'), icone: 'claude', descricao: marcar('Instala o Claude Code e guarda a chave de API.'), abrir: () => dialogoClaude() },
  { chave: 'idioma', rotulo: marcar('Idioma'), icone: 'internet', descricao: marcar('Escolhe o idioma do Retro Computer.'), abrir: () => dialogoIdioma() },
  { chave: 'sons', rotulo: marcar('Sons'), icone: 'sons', descricao: marcar('Liga, desliga e ajusta os sons do sistema.'), abrir: () => dialogoSons() },
  { chave: 'data', rotulo: marcar('Data e hora'), icone: 'relogio', descricao: marcar('Mostra a data e a hora do computador.'), abrir: () => dialogoData() },
  { chave: 'programas', rotulo: marcar('Adicionar ou remover programas'), icone: 'programas-caixa', descricao: marcar('Instala, atualiza e remove programas.'), abrir: () => abrir('programas') },
  { chave: 'foco', rotulo: marcar('Foco'), icone: 'foco', descricao: marcar('Abre o relógio de foco (Pomodoro).'), abrir: () => abrir('foco') },
  { chave: 'sobre', rotulo: marcar('Sobre o Retro Computer'), icone: 'computador', descricao: marcar('Versão, licenças e créditos.'), abrir: () => dialogoSobre() },
];

function abrirPainel(args = {}) {
  if (args.secao) {
    const it = ITENS.find((i) => i.chave === args.secao);
    if (it) return it.abrir();
  }
  const aberta = janelas.find((j) => j.id === 'painel');
  if (aberta) return aberta.focar();
  const contagem = () => ({ texto: tr('{n} objeto(s)', { n: ITENS.length }), largura: 120, fixo: true });
  const j = new Janela({
    id: 'painel', titulo: tr('Painel de controle'), icone: 'painel', largura: 440, altura: 300,
    status: [contagem(), ''],
    menus: [
      { rotulo: tr('&Arquivo'), itens: () => [{ rotulo: tr('&Fechar'), acao: () => j.fechar() }] },
      { rotulo: tr('&Exibir'), itens: () => [{ rotulo: tr('Ícones &grandes'), radio: true, marcado: vista.modo === 'icones', acao: () => vista.definirModo('icones') }, { rotulo: tr('&Lista'), radio: true, marcado: vista.modo === 'lista', acao: () => vista.definirModo('lista') }] },
      { rotulo: tr('A&juda'), itens: () => [{ rotulo: tr('&Tópicos da Ajuda'), acao: () => abrir('ajuda', { topico: 'painel' }) }] },
    ],
  });
  const area = h('div.lista-arquivos', { style: { flex: '1' } });
  j.corpo.append(area);
  const vista = new VistaIcones(area, {
    modo: 'icones',
    aoAbrir: (it) => ITENS.find((i) => i.chave === it.chave).abrir(),
    aoMenu: (sel, e) => { if (sel.length) abrirMenu([{ rotulo: tr('&Abrir'), negrito: true, acao: () => ITENS.find((i) => i.chave === sel[0].chave).abrir() }], { x: e.clientX, y: e.clientY }); },
    aoSelecionar: (sel) => j.definirStatus([contagem(), sel.length === 1 ? tr(ITENS.find((i) => i.chave === sel[0].chave).descricao) : '']),
  });
  vista.desenhar(ITENS.map((i) => ({ chave: i.chave, rotulo: tr(i.rotulo), icone: i.icone, arrastavel: false })));
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
    h('button.padrao', { on: { click: async () => { await aplicar(); j.fechar(); } } }, tr('OK')),
    h('button', { on: { click: () => j.fechar() } }, tr('Cancelar')),
    aoAplicar ? h('button', { on: { click: aplicar } }, rotulo(tr('&Aplicar'))) : null,
  );
  j.corpo.style.padding = '8px';
  j.corpo.append(cab, painel, acoes);
  ajustarAoConteudo(j, { largura: larg });
  return j;
}

/* Aparência */

function dialogoAparencia() {
  const c = estado.config;
  const papel = { ...c.papel };
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

  const listaPadroes = h('select', { size: 6, style: { height: 'auto', width: '140px', background: '#fff' } }, Object.entries(PADROES).map(([k, p]) => h('option', { value: k }, tr(p.nome))));
  listaPadroes.value = papel.padrao || 'nenhum';
  listaPadroes.addEventListener('change', () => { papel.padrao = listaPadroes.value; atualizarPrevia(); });

  const abaFundo = h('div',
    monitor,
    h('div', { style: { display: 'flex', gap: '14px' } },
      h('fieldset', { style: { flex: '1', margin: '0' } }, h('legend', tr('Cor')), cores, h('div', { style: { marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' } }, tr('Outra:'), outra)),
      h('fieldset', { style: { margin: '0' } }, h('legend', tr('Padrão')), listaPadroes)),
  );

  const chkProt = h('input', { type: 'checkbox', checked: protecao.ligada });
  const minProt = h('input', { type: 'number', min: 1, max: 120, value: protecao.minutos, style: { width: '56px' } });
  const tipoProt = h('select', h('option', { value: 'estrelas' }, tr('Voando pelas estrelas')), h('option', { value: 'canos' }, tr('Linhas coloridas')), h('option', { value: 'relogio' }, tr('Relógio')));
  tipoProt.value = protecao.tipo || 'estrelas';
  const aplicarProt = () => { protecao = { ligada: chkProt.checked, minutos: Math.max(1, Number(minProt.value) || 10), tipo: tipoProt.value }; };
  const abaProtecao = h('div',
    h('div.monitor-previa', h('div.tela-previa', { style: { background: '#000' } })),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Proteção de tela')),
      h('div.linha', h('div.select-caixa', { style: { flex: '1' } }, tipoProt), h('button', { on: { click: () => { aplicarProt(); definirConfig({ protecaoTela: protecao }).then(() => abrir('protecao', { agora: true })); } } }, tr('Visualizar'))),
      h('div.linha', h('label', chkProt, h('span', tr('Ligar depois de'))), minProt, h('span', tr('minutos sem uso')))),
  );

  const radioCheia = h('input', { type: 'radio', name: 'modo-tela', checked: telaCheia });
  const radioJanela = h('input', { type: 'radio', name: 'modo-tela', checked: !telaCheia });
  const selEscala = h('select', h('option', { value: 'auto' }, tr('Automático')), h('option', { value: '1' }, tr('1 × (pequeno)')), h('option', { value: '2' }, tr('2 × (grande)')), h('option', { value: '3' }, tr('3 × (muito grande)')));
  selEscala.value = String(escala);
  const chkRapido = h('input', { type: 'checkbox', checked: !!c.inicioRapido });
  const abaConfig = h('div',
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Tela')),
      h('div', h('label', radioCheia, h('span', tr('Tela cheia (recomendado para o foco)')))),
      h('div', { style: { marginTop: '6px' } }, h('label', radioJanela, h('span', tr('Numa janela do computador principal')))),
      h('div', { style: { marginTop: '6px', color: '#808080' } }, tr('A tecla F11 alterna a qualquer momento.'))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Tamanho dos pixels')),
      h('div.linha', h('div.select-caixa', { style: { flex: '1' } }, selEscala)),
      h('div', { style: { color: '#808080', lineHeight: '13px' } }, tr('Cada pixel da interface usa um número inteiro de pixels da tela, para as letras e os ícones ficarem nítidos.'))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Inicialização')),
      h('label', chkRapido, h('span', tr('Pular a tela de abertura')))),
  );

  dialogoBase({
    titulo: tr('Propriedades de Aparência'),
    icone: 'aparencia',
    larg: 440,
    abas: [{ titulo: tr('Plano de fundo'), conteudo: abaFundo }, { titulo: tr('Proteção de tela'), conteudo: abaProtecao }, { titulo: tr('Configurações'), conteudo: abaConfig }],
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
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' } }, img('disco', 32), h('b', tr('Disco local (C:)'))),
    h('hr.sulco'),
    h('div', tr('Pasta no computador principal:')),
    caminho,
    h('div', { style: { display: 'flex', gap: '6px', marginBottom: '10px' } },
      h('button', { on: { click: () => retro.disco.mostrar('') } }, tr('Mostrar a pasta')),
      h('button', { on: { click: trocar } }, tr('Trocar a pasta…'))),
    h('hr.sulco'),
    h('div', { style: { display: 'grid', gridTemplateColumns: '14px 100px 1fr', gap: '4px 6px', alignItems: 'center' } },
      h('div', { style: { width: '12px', height: '12px', background: '#0000ff', boxShadow: 'inset 0 0 0 1px #000' } }), tr('Espaço usado:'), tamanho(usado),
      h('div', { style: { width: '12px', height: '12px', background: '#ff00ff', boxShadow: 'inset 0 0 0 1px #000' } }), tr('Espaço livre:'), tamanho(esp.livre),
      h('div'), tr('Capacidade:'), tamanho(esp.total)),
    pizza,
    h('hr.sulco'),
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, img(lixo.length ? 'lixeira-cheia' : 'lixeira', 32),
      h('div', { style: { flex: '1' } }, tr('A Lixeira tem {n} item(ns). Os itens só são apagados de verdade quando você a esvazia.', { n: lixo.length })),
      h('button', { disabled: !lixo.length, on: { click: () => esvaziarLixeira() } }, tr('Esvaziar'))),
  );
  async function trocar() {
    const ok = await confirmar(tr('O Retro Computer vai passar a usar outra pasta como disco C:.\n\nOs arquivos da pasta atual continuam onde estão; nada é apagado.\n\nDeseja escolher a nova pasta?'), { titulo: tr('Trocar a pasta do disco') });
    if (!ok) return;
    const nova = await retro.disco.trocar().catch((e) => { erro(e.message); return null; });
    if (nova) {
      caminho.textContent = nova;
      await carregarConfig();
      avisar(tr('Disco C: trocado'), nova, { som: null });
      document.dispatchEvent(new CustomEvent('retro-disco-trocado'));
    }
  }
  dialogoBase({ titulo: tr('Propriedades de Disco local (C:)'), icone: 'disco', larg: 360, abas: [{ titulo: tr('Geral'), conteudo }] });
}

/* Claude */

async function dialogoClaude() {
  const c = await carregarConfig();
  const estadoEl = h('div', tr('Procurando o Claude Code…'));
  const btInstalar = h('button', { hidden: true, on: { click: () => abrir('claude') } }, tr('Instalar…'));
  retro.terminal.acharClaude().then((p) => {
    estadoEl.textContent = p ? tr('Instalado: {caminho}', { caminho: p }) : tr('O Claude Code não está instalado.');
    btInstalar.hidden = !!p;
  });
  const campo = h('input', { type: 'password', placeholder: c.temChave ? tr('•••••••• (guardada)') : 'sk-ant-…', spellcheck: false, style: { width: '100%' } });
  const situacao = h('div', { style: { color: '#808080', marginTop: '4px', lineHeight: '13px' } },
    c.cofre
      ? (c.temChave ? tr('Há uma chave guardada (cifrada pelo cofre de senhas do sistema).') : tr('Nenhuma chave guardada.'))
      : tr('O cofre de senhas do sistema não está disponível: a chave não pode ser guardada aqui.'));
  const conteudo = h('div.texto-ajuda',
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' } }, img('claude', 32), h('div', h('b', 'Claude Code'), h('div', tr('O assistente de programação e de trabalho da Anthropic, no Prompt de comando.')))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Programa')),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, h('div', { style: { flex: '1', overflowWrap: 'anywhere' } }, estadoEl), btInstalar)),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Chave de API (opcional)')),
      h('p', { style: { marginTop: '0' } }, tr('Com uma chave, o Claude Code a usa direto; sem ela, ele pede para entrar com a conta da sua assinatura do Claude.')),
      campo, situacao,
      h('div', { style: { display: 'flex', gap: '6px', marginTop: '8px' } },
        h('button', { disabled: !c.cofre, on: { click: guardar } }, tr('Guardar')),
        h('button', { disabled: !c.temChave, on: { click: apagar } }, tr('Apagar a chave')),
        h('button', { on: { click: () => retro.sistema.abrirLink('https://console.anthropic.com/settings/keys') } }, tr('Obter uma chave…')))),
    h('p', { style: { color: '#808080' } }, tr('A chave só é entregue ao Prompt de comando (variável ANTHROPIC_API_KEY); ela não aparece na tela nem vai para o disco C:.')),
  );
  async function guardar() {
    const v = campo.value.trim();
    if (!v) return;
    try {
      await retro.config.gravarChave(v);
      campo.value = '';
      campo.placeholder = tr('•••••••• (guardada)');
      situacao.textContent = tr('Chave guardada (cifrada pelo cofre de senhas do sistema). Vale para os próximos Prompts abertos.');
      await carregarConfig();
    } catch (e) {
      erro(e.message, 'Claude');
    }
  }
  async function apagar() {
    if (!(await confirmar(tr('Apagar a chave de API guardada?'), { titulo: 'Claude' }))) return;
    await retro.config.gravarChave('');
    campo.placeholder = 'sk-ant-…';
    situacao.textContent = tr('Nenhuma chave guardada.');
    await carregarConfig();
  }
  dialogoBase({ titulo: tr('Propriedades do Claude'), icone: 'claude', larg: 400, abas: [{ titulo: tr('Geral'), conteudo }] });
}

/* Idioma */

function dialogoIdioma() {
  const c = estado.config;
  const atual = c.idioma || 'auto';
  const opcoes = [{ cod: 'auto', nome: tr('Automático (o idioma do sistema)') }, ...IDIOMAS];
  const radios = opcoes.map((o) => {
    const r = h('input', { type: 'radio', name: 'idioma', value: o.cod, checked: o.cod === atual });
    return { o, r };
  });
  const conteudo = h('div',
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' } }, img('internet', 32), h('div', { style: { lineHeight: '14px' } }, tr('O idioma vale para o Retro Computer e para os programas que têm a interface traduzida (o WordCraft, por exemplo).'))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Idioma')),
      radios.map(({ o, r }) => h('div', { style: { margin: '4px 0' } }, h('label', r, h('span', o.nome))))),
    h('p', { style: { color: '#808080', lineHeight: '13px' } }, tr('As pastas do disco C: continuam com os nomes de quando foram criadas.')),
  );
  dialogoBase({
    titulo: tr('Propriedades de Idioma'),
    icone: 'internet',
    larg: 380,
    abas: [{ titulo: tr('Idioma'), conteudo }],
    aoAplicar: async () => {
      const escolhido = (radios.find((x) => x.r.checked) || radios[0]).o.cod;
      if (escolhido === (estado.config.idioma || 'auto')) return;
      await definirConfig({ idioma: escolhido });
      const ok = await confirmar(tr('O Retro Computer precisa reiniciar para trocar o idioma.\n\nDeseja reiniciar agora? (Os programas abertos serão fechados.)'), { titulo: tr('Idioma') });
      if (!ok) return;
      for (const j of janelas.slice().reverse()) {
        if (!(await j.fechar())) return;
      }
      retro.sistema.reabrir();
    },
  });
}

/* Sons */

function dialogoSons() {
  const c = estado.config;
  const chk = h('input', { type: 'checkbox', checked: !!c.sons });
  const vol = h('input', { type: 'range', min: 0, max: 100, value: Math.round((c.volume || 0) * 100), style: { flex: '1' } });
  const teste = (nome, rot) => h('button', { on: { click: async () => { await definirConfig({ sons: chk.checked, volume: vol.value / 100 }); tocar(nome); } } }, rot);
  const conteudo = h('div',
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' } }, img('sons', 32), h('label', chk, h('span', tr('Tocar os sons do sistema')))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Volume')), h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, tr('Baixo'), vol, tr('Alto'))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Ouvir')),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' } },
        teste('inicio', tr('Abertura')), teste('desligar', tr('Desligar')), teste('erro', tr('Erro')), teste('aviso', tr('Aviso')),
        teste('pergunta', tr('Pergunta')), teste('lixeira', tr('Lixeira')), teste('foco', tr('Fim do foco')), teste('info', tr('Informação')))),
  );
  dialogoBase({
    titulo: tr('Propriedades de Sons'), icone: 'sons', larg: 340,
    abas: [{ titulo: tr('Sons'), conteudo }],
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
    texto.textContent = d.toLocaleDateString(localidade(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' — ' + d.toLocaleTimeString(localidade());
  };
  desenhar();
  const t = setInterval(desenhar, 1000);
  const conteudo = h('div', relogio, texto,
    h('p', { style: { color: '#808080', textAlign: 'center', marginTop: '10px' } }, tr('A data e a hora vêm do computador principal.')),
    h('p', { style: { color: '#808080', textAlign: 'center' } }, tr('Fuso horário: {fuso}', { fuso: Intl.DateTimeFormat().resolvedOptions().timeZone })));
  const j = dialogoBase({ titulo: tr('Propriedades de Data e hora'), icone: 'relogio', larg: 320, abas: [{ titulo: tr('Data e hora'), conteudo }] });
  if (j) j.ev.on('fechada', () => clearInterval(t));
  else clearInterval(t);
}

/* Sobre */

function dialogoSobre() {
  const c = estado.config;
  const sistema = ({ win32: 'Windows', darwin: 'macOS', linux: 'Linux' })[c.plataforma] || c.plataforma;
  const versaoEl = h('div', tr('Versão {versao} · {sistema}', { versao: c.versaoApp, sistema }));
  const novidade = h('div', { style: { color: '#808080' } }, tr('Procurando versões novas…'));
  retro.sistema.novaVersao(true).then((v) => {
    if (v && v.temAtualizacao) {
      novidade.replaceChildren(tr('Há uma versão nova: {versao}.', { versao: v.nova }) + ' ', h('a', { href: '#', on: { click: (e) => { e.preventDefault(); retro.sistema.abrirLink(v.pagina); } } }, tr('Baixar')));
      novidade.style.color = '#008000';
    } else novidade.textContent = tr('Esta é a versão mais recente.');
  }).catch(() => { novidade.textContent = tr('Não foi possível procurar versões novas.'); });
  const conteudo = h('div.texto-ajuda',
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' } }, img('logo', 32), h('div', h('b', 'Retro Computer'), versaoEl, novidade)),
    h('p', tr('Um computador retrô para produtividade, de código aberto (licença MIT).')),
    h('hr.sulco'),
    h('p', h('b', tr('Créditos'))),
    h('p', tr('Ícones e fontes de sistema: SerenityOS (BSD-2-Clause), com as pastas recoloridas; o computador, o disquete, a caixa, o tomate e a pena são desenhos próprios do projeto.')),
    h('p', tr('Terminal: xterm.js (MIT) e node-pty (MIT). Aplicativo: Electron (MIT).')),
    h('p', tr('Os programas Craft são do ArtCraft Team (MIT ou Apache-2.0), baixados dos lançamentos oficiais; os nomes e logotipos são marcas deles.')),
    h('p', tr('Claude e Claude Code são da Anthropic.')),
    h('p', { style: { color: '#808080' } }, tr('O visual homenageia os computadores pessoais dos anos 90; nenhum ícone, som ou fonte da Microsoft ou da Apple é usado.')),
  );
  dialogoBase({ titulo: tr('Sobre o Retro Computer'), icone: 'computador', larg: 400, abas: [{ titulo: tr('Geral'), conteudo }] });
}

registrarApp('painel', { nome: 'Painel de controle', icone: 'painel', abrir: abrirPainel });
export { info, caminhoTela };
