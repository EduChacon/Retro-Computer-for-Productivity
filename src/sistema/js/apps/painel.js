/*
 * O Painel de controle: Aparência, Disco C:, Claude, Idioma, Sons, Data e hora,
 * Adicionar ou remover programas, Foco e Sobre.
 */
import { h, img, tamanho, caminhoTela, rotulo } from '../util.js';
import { Janela, lista as janelas } from '../janelas.js';
import { VistaIcones } from '../vista.js';
import { abrirMenu } from '../menus.js';
import { registrarApp, estado, definirConfig, abrir, carregarConfig, avisar, abrirEndereco } from '../sistema.js';
import { ajustarAoConteudo, confirmar, confirmarComPrazo, erro, info } from '../dialogos.js';
import { deslizante } from '../controles.js';
import { CORES, PADROES, fundoCss, aplicarFundo, aplicarEscala } from '../aparencia.js';
import { tocar } from '../sons.js';
import { esvaziarLixeira } from '../mesa.js';
import { tr, marcar, IDIOMAS, localidade } from '../idioma.js';
import { BUSCAS, CORREIOS, paraEndereco } from './navegador.js';
import { aoMudar as aoMudarAtualizacao, reiniciarParaAtualizar } from '../atualizacao.js';
import { comSenhaAdmin } from '../admin.js';

const ITENS = [
  { chave: 'aparencia', rotulo: marcar('Aparência'), icone: 'aparencia', descricao: marcar('Muda a cor e o padrão do fundo, a tela cheia e o tamanho dos pixels.'), abrir: () => dialogoAparencia() },
  { chave: 'disco', rotulo: marcar('Disco C:'), icone: 'disco', descricao: marcar('Mostra a pasta do disco C: no computador principal e permite trocá-la.'), abrir: () => dialogoDisco() },
  { chave: 'claude', rotulo: marcar('Claude'), icone: 'claude', descricao: marcar('Instala o Claude Code e guarda a chave de API.'), abrir: () => dialogoClaude() },
  { chave: 'internet', rotulo: marcar('Internet'), icone: 'navegador', descricao: marcar('O e-mail, a pesquisa e onde abrir os links.'), abrir: () => dialogoInternet() },
  { chave: 'idioma', rotulo: marcar('Idioma'), icone: 'internet', descricao: marcar('Escolhe o idioma do Retro Computer.'), abrir: () => dialogoIdioma() },
  { chave: 'senhas', rotulo: marcar('Senhas'), icone: 'chave', descricao: marcar('A senha da tela de bloqueio e quando pedi-la.'), abrir: () => dialogoSenhas() },
  { chave: 'bluetooth', rotulo: marcar('Bluetooth'), icone: 'bluetooth', descricao: marcar('Os mouses, os teclados e os fones sem fio: parear, conectar e esquecer.'), abrir: () => import('../bluetooth.js').then((m) => m.abrirBluetooth()) },
  { chave: 'atualizacoes', rotulo: marcar('Atualizações do Linux'), icone: 'atualizacoes', descricao: marcar('As atualizações de segurança do Linux e dos programas da Loja.'), abrir: () => abrir('atualizacoes'), mostrar: () => estado.config.plataforma === 'linux' },
  { chave: 'impressoras', rotulo: marcar('Impressoras'), icone: 'impressora', descricao: marcar('As impressoras, a padrão, a fila de impressão e a página de teste.'), abrir: () => dialogoImpressoras() },
  { chave: 'teclado', rotulo: marcar('Teclado'), icone: 'teclado', descricao: marcar('O layout do teclado e um lugar para testar as teclas.'), abrir: () => dialogoTeclado() },
  { chave: 'sons', rotulo: marcar('Sons'), icone: 'sons', descricao: marcar('Liga, desliga e ajusta os sons do sistema.'), abrir: () => dialogoSons() },
  { chave: 'data', rotulo: marcar('Data e hora'), icone: 'relogio', descricao: marcar('Mostra a data e a hora do computador.'), abrir: () => dialogoData() },
  { chave: 'programas', rotulo: marcar('Adicionar ou remover programas'), icone: 'programas-caixa', descricao: marcar('Instala, atualiza e remove programas.'), abrir: () => abrir('programas') },
  { chave: 'foco', rotulo: marcar('Foco'), icone: 'foco', descricao: marcar('Abre o relógio de foco (Pomodoro).'), abrir: () => abrir('foco') },
  { chave: 'sobre', rotulo: marcar('Sobre o Retro Computer'), icone: 'computador', descricao: marcar('Versão, licenças e créditos.'), abrir: () => dialogoSobre() },
];

// Alguns itens só existem em um sistema (as atualizações do Linux).
const visiveis = () => ITENS.filter((i) => !i.mostrar || i.mostrar());

function abrirPainel(args = {}) {
  if (args.secao) {
    const it = ITENS.find((i) => i.chave === args.secao);
    if (it) return it.abrir();
  }
  const aberta = janelas.find((j) => j.id === 'painel');
  if (aberta) return aberta.focar();
  const contagem = () => ({ texto: tr('{n} objeto(s)', { n: visiveis().length }), largura: 120, fixo: true });
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
  vista.desenhar(visiveis().map((i) => ({ chave: i.chave, rotulo: tr(i.rotulo), icone: i.icone, arrastavel: false })));
  return j;
}

/* ---------- Diálogos de propriedades ---------- */

function dialogoBase({ titulo, icone, abas, larg = 380, altMin = 0, aoAplicar }) {
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
  // As abas mais altas (que crescem depois de abrir) cabem sem rolar.
  if (altMin && j.ret.h < altMin) {
    const area = document.getElementById('janelas').getBoundingClientRect();
    j.ret.h = Math.min(altMin, Math.floor(area.height) - 8);
    j.ret.y = Math.max(0, Math.round((area.height - j.ret.h) / 2.4));
    j.aplicarRet();
  }
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
  // A área da tela (a resolução), como no Windows 95: só no Retro Computer como sistema do Linux.
  const res = { saida: null, antes: null, modos: [], escolhido: null };
  const areaTela = h('div', { hidden: true, style: { marginTop: '8px' } });
  retro.tela.modos().then((t) => {
    if (!t || !t.disponivel) return;
    Object.assign(res, { saida: t.saida, antes: t.atual, modos: t.modos.slice().reverse(), escolhido: t.atual });
    const texto = h('div', { style: { textAlign: 'center', marginTop: '2px' } });
    const mostrar = (m) => { const [l, a] = m.replace('i', '').split('x'); texto.textContent = tr('{l} por {a} pixels', { l, a }); };
    const desl = deslizante({
      valor: Math.max(0, res.modos.indexOf(t.atual)), min: 0, max: res.modos.length - 1, tamanho: 160, passo: 1, passoGrande: 1, rotulo: tr('Área da tela'),
      aoMudar: (i) => { res.escolhido = res.modos[i]; mostrar(res.escolhido); },
    });
    mostrar(t.atual);
    areaTela.replaceChildren(h('div', tr('Área da tela')),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' } }, h('span', tr('Menos')), desl.el, h('span', tr('Mais'))), texto);
    areaTela.hidden = false;
  }).catch(() => { });
  const abaConfig = h('div',
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Tela')),
      h('div', h('label', radioCheia, h('span', tr('Tela cheia (recomendado para o foco)')))),
      h('div', { style: { marginTop: '6px' } }, h('label', radioJanela, h('span', tr('Numa janela do computador principal')))),
      c.modoSistema ? null : h('div', { style: { marginTop: '6px', color: '#808080' } }, tr('A tecla F11 alterna a qualquer momento.')),
      areaTela),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Tamanho dos pixels')),
      h('div.linha', h('div.select-caixa', { style: { flex: '1' } }, selEscala)),
      h('div', { style: { color: '#808080', lineHeight: '13px' } }, tr('Cada pixel da interface usa um número inteiro de pixels da tela, para as letras e os ícones ficarem nítidos.'))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Inicialização')),
      h('label', chkRapido, h('span', tr('Pular a tela de abertura'))),
      inicioComComputador()),
  );
  // No modo sistema, o Retro Computer é a tela inteira.
  if (c.modoSistema) { radioCheia.disabled = true; radioJanela.disabled = true; }

  // Os efeitos (como a aba do Windows 98): os cantos magnéticos das janelas.
  const chkEncaixe = h('input', { type: 'checkbox', checked: !c.janelas || c.janelas.encaixe !== false });
  const abaEfeitos = h('div',
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Janelas')),
      h('label', chkEncaixe, h('span', tr('Encaixar as janelas ao arrastá-las até as bordas e os cantos da tela'))),
      h('div', { style: { color: '#808080', marginTop: '6px', lineHeight: '13px' } },
        tr('À esquerda ou à direita, a janela ocupa metade da tela; num canto, um quarto; no alto, a tela toda. A tecla do logotipo com as setas faz o mesmo.'))),
  );

  dialogoBase({
    titulo: tr('Propriedades de Aparência'),
    icone: 'aparencia',
    larg: 440,
    altMin: 540,
    abas: [{ titulo: tr('Plano de fundo'), conteudo: abaFundo }, { titulo: tr('Proteção de tela'), conteudo: abaProtecao }, { titulo: tr('Efeitos'), conteudo: abaEfeitos }, { titulo: tr('Configurações'), conteudo: abaConfig }],
    aoAplicar: async () => {
      aplicarProt();
      escala = selEscala.value;
      await definirConfig({ papel, escala, protecaoTela: protecao, inicioRapido: chkRapido.checked, janelas: { encaixe: chkEncaixe.checked } });
      if (chkAbrirAoEntrar && !chkAbrirAoEntrar.disabled) await retro.sistema.abrirAoEntrar(chkAbrirAoEntrar.checked).catch(() => { });
      aplicarFundo(papel);
      await aplicarEscala(escala);
      if (radioCheia.checked !== telaCheia) {
        telaCheia = radioCheia.checked;
        await retro.sistema.telaCheia(telaCheia);
      }
      if (res.escolhido && res.escolhido !== res.antes) await trocarResolucao(res);
    },
  });
}

/** Troca a resolução e pergunta se fica; sem resposta em 15 segundos, volta à anterior. */
async function trocarResolucao(res) {
  const r = await retro.tela.definir(res.saida, res.escolhido);
  if (!r || !r.ok) {
    erro(tr('Não foi possível mudar a resolução: {erro}', { erro: (r && r.erro) || '?' }));
    return;
  }
  // A janela acompanha a tela nova antes da pergunta.
  await new Promise((ok) => setTimeout(ok, 600));
  if (await confirmarComPrazo(tr('A tela foi reconfigurada. Manter esta configuração?'), 15, { titulo: tr('Configurações da tela') })) {
    await definirConfig({ tela: { saida: res.saida, modo: res.escolhido } });
    res.antes = res.escolhido;
  } else {
    await retro.tela.definir(res.saida, res.antes);
    res.escolhido = res.antes;
  }
}

/* Abrir junto com o computador e, no Linux, ser o sistema dele */

let chkAbrirAoEntrar = null;

function inicioComComputador() {
  const c = estado.config;
  const caixa = h('div', { style: { marginTop: '6px' } });
  chkAbrirAoEntrar = null;
  if (!c.modoSistema) {
    chkAbrirAoEntrar = h('input', { type: 'checkbox', disabled: true });
    retro.sistema.abrirAoEntrar().then((v) => { chkAbrirAoEntrar.checked = !!v; chkAbrirAoEntrar.disabled = false; }).catch(() => { });
    caixa.append(h('div', h('label', chkAbrirAoEntrar, h('span', tr('Abrir o Retro Computer ao entrar no computador')))));
  }
  if (c.plataforma !== 'linux') return caixa;
  // No Linux: a sessão "Retro Computer", escolhida na tela de entrada (instalada pelo pacote .deb).
  const lugar = h('div', { style: { marginTop: '8px', lineHeight: '13px' } });
  caixa.append(lugar);
  retro.sistema.sessao().then((s) => {
    if (!s.instalada) {
      lugar.replaceChildren(h('div', { style: { color: '#808080' } }, tr('Para usar o Retro Computer como o sistema do computador, instale o pacote .deb: ele acrescenta a sessão "Retro Computer" à tela de entrada do Linux.')));
      return;
    }
    const partes = [h('div', { style: { color: '#808080', marginBottom: '6px' } }, c.modoSistema
      ? tr('O Retro Computer está como o sistema do computador (a sessão "Retro Computer"). Para voltar à área de trabalho do Linux, use Desligar › Sair da sessão.')
      : tr('Para usar o Retro Computer como o sistema do computador, escolha a sessão "Retro Computer" na tela de entrada do Linux.'))];
    if (s.lightdm) {
      const chk = h('input', { type: 'checkbox', checked: s.entrarDireto });
      chk.addEventListener('change', async () => {
        const querer = chk.checked;
        chk.disabled = true;
        const r = await comSenhaAdmin(querer
          ? tr('Para o computador entrar direto no Retro Computer ao ligar, digite a senha de administrador do Linux (a mesma da entrada no computador):')
          : tr('Para o computador voltar a mostrar a tela de entrada, digite a senha de administrador do Linux:'), (senha) => retro.sistema.entrarDireto(querer, senha));
        chk.disabled = false;
        if (!r || !r.ok) {
          chk.checked = !querer;
          if (r && !r.senhaErrada && !r.naoPode) erro(tr('Não foi possível mudar a entrada do computador: {erro}', { erro: r.erro || '?' }));
        }
      });
      partes.push(h('label', chk, h('span', tr('Entrar direto no Retro Computer ao ligar (sem a tela de entrada)'))));
    }
    lugar.replaceChildren(...partes);
  }).catch(() => { });
  return caixa;
}

/* Senhas (a tela de bloqueio) */

/** Criar, trocar ou tirar a senha: com uma senha já criada, a atual é pedida antes. */
function mudarSenha(tirar) {
  return new Promise((resolve) => {
    const tem = !!(estado.config.bloqueio || {}).temSenha;
    let feito = false;
    const fim = (v) => { if (!feito) { feito = true; j.fechar(true); resolve(v); } };
    const j = new Janela({ titulo: tirar ? tr('Tirar a senha') : tem ? tr('Trocar a senha') : tr('Criar a senha'), icone: 'chave', dialogo: true, largura: 360, altura: 200, aoFechar: () => { if (!feito) { feito = true; resolve(false); } } });
    const campo = () => h('input', { type: 'password', autocomplete: 'off', spellcheck: false });
    const atual = campo();
    const nova = campo();
    const repetir = campo();
    const aviso = h('div', { style: { color: '#800000', minHeight: '13px', marginTop: '4px' } });
    const linha = (rot, c) => h('div', { style: { display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '6px', marginBottom: '6px' } }, h('span', rot), c);
    const ok = h('button.padrao', { type: 'button' }, tr('OK'));
    const confirmar = async () => {
      if (!tirar) {
        if (nova.value.length < 4) { aviso.textContent = tr('A senha precisa de pelo menos 4 letras ou números.'); return nova.focus(); }
        if (nova.value !== repetir.value) { aviso.textContent = tr('As duas senhas novas não são iguais.'); return repetir.focus(); }
      }
      ok.disabled = true;
      aviso.textContent = tr('Conferindo…');
      const r = await retro.bloqueio.definir(atual.value, tirar ? '' : nova.value).catch((e) => ({ ok: false, erro: e.message }));
      ok.disabled = false;
      if (r.ok) { await definirConfig({}); return fim(true); }
      aviso.textContent = r.senhaErrada ? tr('A senha atual não está certa.') : (r.erro || '?');
      (r.senhaErrada ? atual : nova).focus();
    };
    ok.addEventListener('click', confirmar);
    j.corpo.append(
      h('div.mensagem', img('chave', 32), h('div', { style: { flex: '1' } },
        tem ? linha(tr('Senha atual:'), atual) : null,
        tirar ? null : linha(tr('Senha nova:'), nova),
        tirar ? null : linha(tr('Repita a senha nova:'), repetir),
        aviso)),
      h('div.acoes.direita', ok, h('button', { type: 'button', on: { click: () => fim(false) } }, tr('Cancelar'))));
    j.corpo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmar(); } });
    ajustarAoConteudo(j, { minLarg: 360 });
    (tem ? atual : nova).focus();
  });
}

function dialogoSenhas() {
  const b = () => estado.config.bloqueio || {};
  const estadoEl = h('div', { style: { flex: '1', lineHeight: '13px' } });
  const btCriar = h('button', { type: 'button' });
  const btTirar = h('button', { type: 'button' }, tr('Tirar a senha…'));
  const chkVoltar = h('input', { type: 'checkbox', checked: b().aoVoltar !== false });
  const chkAbrir = h('input', { type: 'checkbox', checked: !!b().aoAbrir });
  const chkProtecao = h('input', { type: 'checkbox', checked: !!b().naProtecao });
  const desenhar = () => {
    const tem = !!b().temSenha;
    estadoEl.textContent = tem ? tr('Há uma senha para desbloquear o computador.') : tr('Ainda não há senha: a tela de bloqueio fica desligada.');
    btCriar.textContent = tem ? tr('Trocar a senha…') : tr('Criar a senha…');
    btTirar.disabled = !tem;
    for (const c of [chkVoltar, chkAbrir, chkProtecao]) c.disabled = !tem;
  };
  btCriar.addEventListener('click', () => mudarSenha(false).then(desenhar));
  btTirar.addEventListener('click', () => mudarSenha(true).then(desenhar));
  desenhar();
  const conteudo = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('chave', 32),
      h('div', { style: { lineHeight: '13px' } }, tr('Com uma senha, o Retro Computer pode ficar bloqueado quando você sai de perto: Iniciar › Bloquear o computador.'))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Senha do Retro Computer')),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, estadoEl),
      h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '8px' } }, btCriar, btTirar)),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Pedir a senha')),
      h('div', { style: { marginBottom: '5px' } }, h('label', chkVoltar, h('span', tr('Ao voltar da suspensão (ou ao fechar a tampa)')))),
      h('div', { style: { marginBottom: '5px' } }, h('label', chkProtecao, h('span', tr('Ao sair da proteção de tela')))),
      h('div', h('label', chkAbrir, h('span', tr('Ao abrir o Retro Computer')))),
      estado.config.plataforma === 'linux' ? h('div', { style: { color: '#808080', marginTop: '8px', lineHeight: '13px' } }, tr('No Linux, a senha de entrada do Linux também desbloqueia (para o caso de esquecer a do Retro Computer).')) : null));
  dialogoBase({
    titulo: tr('Propriedades de Senhas'), icone: 'chave', larg: 400,
    abas: [{ titulo: tr('Tela de bloqueio'), conteudo }],
    aoAplicar: () => definirConfig({ bloqueio: { aoVoltar: chkVoltar.checked, aoAbrir: chkAbrir.checked, naProtecao: chkProtecao.checked } }),
  });
}

/* Teclado */

// Os layouts mais comuns (o do Linux: layout e variante do setxkbmap).
const LAYOUTS = [
  ['br', 'abnt2', marcar('Português (Brasil, ABNT2)')],
  ['us', 'intl', marcar('Inglês (EUA, internacional com teclas mortas)')],
  ['us', '', marcar('Inglês (EUA)')],
  ['pt', '', marcar('Português (Portugal)')],
  ['es', '', marcar('Espanhol (Espanha)')],
  ['latam', '', marcar('Espanhol (América Latina)')],
  ['gb', '', marcar('Inglês (Reino Unido)')],
];

function dialogoTeclado() {
  const c = estado.config;
  const sistema = !!c.modoSistema;
  const sel = h('select', { style: { width: '100%' }, disabled: !sistema }, ...LAYOUTS.map(([l, v, rot]) => h('option', { value: l + ':' + v }, tr(rot))));
  const teste = h('input', { type: 'text', spellcheck: false, placeholder: tr('Digite aqui para testar: ação, você, ñ…'), style: { width: '100%' } });
  retro.sistema.teclado().then((q) => {
    if (!q || !q.layout) return;
    const valor = q.layout + ':' + (q.variante || '');
    // Um layout fora da lista aparece também, com o nome do Linux.
    if (![...sel.options].some((o) => o.value === valor)) sel.append(h('option', { value: valor }, q.variante ? `${q.layout} (${q.variante})` : q.layout));
    sel.value = valor;
  }).catch(() => { });
  const conteudo = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('teclado', 32),
      h('div', { style: { lineHeight: '13px' } }, sistema
        ? tr('O layout diz o que cada tecla escreve. Para os teclados americanos com acentos por teclas mortas (´ + a = á), escolha "Inglês (EUA, internacional com teclas mortas)".')
        : tr('O layout do teclado é o do computador principal: troque-o nas configurações do sistema dele.'))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Layout do teclado')), h('div.select-caixa', { style: { width: '100%' } }, sel)),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Testar')), teste));
  dialogoBase({
    titulo: tr('Propriedades de Teclado'), icone: 'teclado', larg: 400,
    abas: [{ titulo: tr('Idioma do teclado'), conteudo }],
    aoAplicar: sistema ? async () => {
      const [l, v] = sel.value.split(':');
      const r = await retro.sistema.teclado(l, v).catch((e) => ({ ok: false, erro: e.message }));
      if (!r.ok) erro(tr('Não foi possível trocar o layout do teclado: {erro}', { erro: r.erro || '?' }));
      teste.focus();
    } : null,
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
        h('button', { on: { click: () => abrirEndereco('https://console.anthropic.com/settings/keys') } }, tr('Obter uma chave…')))),
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

/* Internet */

function dialogoInternet() {
  const n = estado.config.navegador || {};
  const selCorreio = h('select', { style: { width: '100%' } },
    h('option', { value: '' }, tr('(Perguntar na primeira vez)')),
    ...CORREIOS.map((c) => h('option', { value: c.url }, c.nome)));
  const outro = h('input', { type: 'text', spellcheck: false, placeholder: 'https://', value: n.correio && !CORREIOS.some((c) => c.url === n.correio) ? n.correio : '' });
  selCorreio.value = n.correio && CORREIOS.some((c) => c.url === n.correio) ? n.correio : '';
  const selBusca = h('select', { style: { width: '100%' } }, ...Object.entries(BUSCAS).map(([k, b]) => h('option', { value: k }, b.nome)));
  selBusca.value = BUSCAS[n.busca] ? n.busca : 'duckduckgo';
  const rRetro = h('input', { type: 'radio', name: 'links', checked: n.links !== 'principal' });
  const rPrincipal = h('input', { type: 'radio', name: 'links', checked: n.links === 'principal', disabled: !!estado.config.modoSistema });
  const linha = (rot, campo) => h('div', { style: { display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center', gap: '6px', marginBottom: '6px' } }, h('span', rot), campo);
  const conteudo = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('navegador', 32), h('div', tr('O Navegador abre páginas da internet em janelas do Retro Computer. O E-mail é o Navegador aberto no seu e-mail da web.'))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('E-mail')),
      linha(tr('Serviço:'), h('div.select-caixa', { style: { width: '100%' } }, selCorreio)),
      linha(tr('Ou o endereço:'), outro)),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Pesquisa')),
      linha(tr('Pesquisar com:'), h('div.select-caixa', { style: { width: '100%' } }, selBusca))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Links dos programas')),
      h('div', { style: { marginBottom: '4px' } }, h('label', rRetro, h('span', tr('Abrir no Navegador do Retro Computer')))),
      h('div', h('label', rPrincipal, h('span', tr('Abrir no navegador do computador principal'))))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Dados de navegação')),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
        h('span', { style: { flex: '1' } }, tr('Os cookies, as senhas lembradas pelos sites e os arquivos temporários do Navegador.')),
        h('button', { on: { click: async () => {
          if (!(await confirmar(tr('Apagar os dados de navegação? Você vai sair das contas abertas nos sites (o e-mail, por exemplo).'), { titulo: tr('Internet') }))) return;
          await retro.navegador.limparDados().catch(() => { });
          avisar(tr('Internet'), tr('Dados de navegação apagados.'), { icone: 'navegador', som: null });
        } } }, tr('Apagar…'))),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' } },
        h('span', { style: { flex: '1' } }, tr('As permissões dadas aos sites: a câmera, o microfone, as notificações e a localização.')),
        h('button', { on: { click: async () => {
          if (!(await confirmar(tr('Esquecer as permissões dadas aos sites? Eles vão perguntar de novo.'), { titulo: tr('Internet') }))) return;
          await retro.navegador.esquecerPermissoes().catch(() => { });
          avisar(tr('Internet'), tr('Os sites vão pedir as permissões de novo.'), { icone: 'navegador', som: null });
        } } }, tr('Esquecer…')))),
  );
  // Os sites instalados como programas (Navegador › Arquivo › Instalar como programa).
  const listaApps = h('div.webapps-lista');
  const desenharApps = () => {
    const apps = estado.config.webapps || [];
    listaApps.replaceChildren(...(apps.length ? apps.map((w) => h('div.webapp-linha',
      w.icone ? h('img', { src: w.icone, width: 32, height: 32, alt: '' }) : img('internet', 32),
      h('div', h('b', w.nome), h('div.webapp-endereco', w.url)),
      h('button', { on: { click: () => abrir('webapp:' + w.id) } }, tr('Abrir')),
      h('button', { on: { click: async () => { const m = await import('../webapps.js'); if (await m.removerWebapp(w.id)) desenharApps(); } } }, tr('Desinstalar…'))))
      : [h('div', { style: { padding: '8px' } }, tr('Nenhum site instalado. Para instalar, abra o site no Navegador e use Arquivo › Instalar como programa.'))]));
  };
  desenharApps();
  const conteudoApps = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('programas-caixa', 32), h('div', tr('Os sites instalados como programas abrem numa janela própria e ficam no menu Iniciar › Programas.'))),
    listaApps);
  dialogoBase({
    titulo: tr('Propriedades de Internet'), icone: 'navegador', larg: 420,
    abas: [{ titulo: tr('Geral'), conteudo }, { titulo: tr('Programas da internet'), conteudo: conteudoApps }],
    aoAplicar: () => {
      const correio = outro.value.trim() ? paraEndereco(outro.value) : (selCorreio.value || null);
      return definirConfig({ navegador: { correio, busca: selBusca.value, links: rPrincipal.checked ? 'principal' : 'retro' } });
    },
  });
}

/* Impressoras */

function dialogoImpressoras() {
  const lista = h('div.imp-lista', { tabIndex: 0 });
  let impressoras = [];
  let escolhida = null;
  const btPadrao = h('button', { on: { click: async () => {
    if (!escolhida) return;
    const r = await retro.impressoras.padrao(escolhida.nome);
    if (!r.ok) erro(tr('Não foi possível mudar a impressora padrão: {erro}', { erro: r.erro || '?' }));
    carregar();
  } } }, tr('Definir como padrão'));
  const btFila = h('button', { on: { click: () => escolhida && dialogoFila(escolhida) } }, tr('Fila de impressão…'));
  const btTeste = h('button', { on: { click: async () => {
    if (!escolhida) return;
    const { paginaDeTeste } = await import('../impressao.js');
    const r = await paginaDeTeste(escolhida.nome, escolhida.rotulo);
    if (r.ok) avisar(tr('Impressoras'), tr('A página de teste foi enviada para {nome}.', { nome: escolhida.rotulo }), { icone: 'impressora', som: null });
  } } }, tr('Imprimir página de teste'));
  const btAdicionar = h('button', { on: { click: async () => {
    const r = await retro.impressoras.adicionar().catch(() => null);
    if (r && r.como === 'pagina') abrirEndereco(r.url);
  } } }, tr('Adicionar impressora…'));
  const SITUACAO = { pronta: marcar('Pronta'), imprimindo: marcar('Imprimindo'), parada: marcar('Parada') };
  const desenhar = () => {
    lista.replaceChildren(...(impressoras.length ? impressoras.map((p) => {
      const el = h('div.imp-item' + (escolhida && escolhida.nome === p.nome ? '.sel' : ''),
        img('impressora', 32),
        h('div', h('b', p.rotulo + (p.padrao ? ' ' + tr('(padrão)') : '')), h('div', [tr(SITUACAO[p.situacao]), p.descricao, p.local].filter(Boolean).join(' · '))));
      el.addEventListener('mousedown', () => { escolhida = p; desenhar(); });
      el.addEventListener('dblclick', () => dialogoFila(p));
      return el;
    }) : [h('div.imp-vazia', tr('Nenhuma impressora encontrada. As impressoras da rede (Wi-Fi) costumam aparecer sozinhas; se a sua não aparecer, use Adicionar impressora.'))]));
    for (const b of [btPadrao, btFila, btTeste]) b.disabled = !escolhida;
    btPadrao.disabled = !escolhida || escolhida.padrao;
  };
  const carregar = async () => {
    impressoras = await retro.impressoras.listar().catch(() => []);
    escolhida = escolhida ? impressoras.find((p) => p.nome === escolhida.nome) || null : impressoras.find((p) => p.padrao) || impressoras[0] || null;
    desenhar();
  };
  const conteudo = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('impressora', 32), h('div', tr('As impressoras do computador. Os programas do Retro Computer imprimem pela caixa de impressão do sistema (Arquivo › Imprimir).'))),
    lista,
    h('div.imp-botoes', btPadrao, btFila, btTeste, btAdicionar));
  dialogoBase({ titulo: tr('Impressoras'), icone: 'impressora', larg: 440, abas: [{ titulo: tr('Impressoras'), conteudo }] });
  carregar();
}

/** A fila de impressão de uma impressora (cancelar o que ainda não saiu). */
async function dialogoFila(p) {
  const j = new Janela({ titulo: tr('Fila de {nome}', { nome: p.rotulo }), icone: 'impressora', largura: 380, altura: 240, minimizavel: false });
  const corpo = h('div.imp-fila');
  const desenhar = async () => {
    const f = await retro.impressoras.fila(p.nome).catch(() => ({ disponivel: false, trabalhos: [] }));
    if (!f.disponivel) {
      corpo.replaceChildren(h('div.imp-vazia', tr('A fila de impressão deste sistema fica no programa de impressoras dele.')));
      return;
    }
    corpo.replaceChildren(...(f.trabalhos.length ? f.trabalhos.map((t) => h('div.imp-trabalho',
      h('span', t.id), h('span', tamanho(t.tamanho)), h('span', t.quando),
      h('button', { on: { click: async () => { const r = await retro.impressoras.cancelar(t.id); if (!r.ok) erro(tr('Não foi possível cancelar: {erro}', { erro: r.erro || '?' })); desenhar(); } } }, tr('Cancelar'))))
      : [h('div.imp-vazia', tr('Nada esperando para imprimir.'))]));
  };
  j.corpo.style.padding = '8px';
  j.corpo.append(corpo, h('div.acoes.direita', h('button', { on: { click: desenhar } }, tr('Atualizar')), h('button.padrao', { on: { click: () => j.fechar() } }, tr('Fechar'))));
  desenhar();
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
  const chkData = h('input', { type: 'checkbox', checked: !!(estado.config.barra && estado.config.barra.data) });
  const conteudo = h('div', relogio, texto,
    h('p', { style: { color: '#808080', textAlign: 'center', marginTop: '10px' } }, tr('A data e a hora vêm do computador principal.')),
    h('p', { style: { color: '#808080', textAlign: 'center' } }, tr('Fuso horário: {fuso}', { fuso: Intl.DateTimeFormat().resolvedOptions().timeZone })),
    h('fieldset', { style: { margin: '8px 0 0' } }, h('legend', tr('Barra de tarefas')),
      h('label', chkData, h('span', tr('Mostrar a data embaixo da hora')))));
  const j = dialogoBase({
    titulo: tr('Propriedades de Data e hora'), icone: 'relogio', larg: 320, abas: [{ titulo: tr('Data e hora'), conteudo }],
    aoAplicar: () => definirConfig({ barra: { data: chkData.checked } }),
  });
  if (j) j.ev.on('fechada', () => clearInterval(t));
  else clearInterval(t);
}

/* Sobre */

function dialogoSobre() {
  const c = estado.config;
  const sistema = ({ win32: 'Windows', darwin: 'macOS', linux: 'Linux' })[c.plataforma] || c.plataforma;
  const versaoEl = h('div', tr('Versão {versao} · {sistema}', { versao: c.versaoApp, sistema }));
  const novidade = h('div', { style: { color: '#808080' } }, tr('Procurando versões novas…'));
  const link = (texto, acao) => h('a', { href: '#', on: { click: (e) => { e.preventDefault(); acao(); } } }, texto);
  // Onde a cópia se atualiza sozinha: baixar, acompanhar e reiniciar; nas outras, a página de download.
  const mostrar = (e) => {
    novidade.style.color = '#008000';
    if (e.etapa === 'disponivel') novidade.replaceChildren(tr('Há uma versão nova: {versao}.', { versao: e.versao }) + ' ', link(tr('Atualizar agora'), () => retro.sistema.atualizacao.baixar().catch(() => { })));
    else if (e.etapa === 'baixando') novidade.textContent = tr('Baixando a versão {versao}… {n}%', { versao: e.versao || '', n: e.progresso || 0 });
    else if (e.etapa === 'baixada') novidade.replaceChildren(tr('A versão {versao} está pronta.', { versao: e.versao }) + ' ', link(tr('Reiniciar e instalar'), () => reiniciarParaAtualizar()));
    else if (e.etapa === 'atual') { novidade.style.color = '#808080'; novidade.textContent = tr('Esta é a versão mais recente.'); }
    else if (e.etapa === 'erro') { novidade.style.color = '#800000'; novidade.textContent = tr('Não foi possível atualizar: {erro}', { erro: e.erro || '?' }); }
  };
  retro.sistema.atualizacao.info().then(async (inf) => {
    if (inf.sozinho) {
      // O aviso acompanha a atualização enquanto a janela do Sobre estiver aberta.
      const parar = aoMudarAtualizacao((e) => (novidade.isConnected ? mostrar(e) : parar()));
      mostrar(['disponivel', 'baixando', 'baixada'].includes(inf.etapa) ? inf : await retro.sistema.atualizacao.verificar());
      return;
    }
    const v = await retro.sistema.novaVersao(true);
    if (v && v.temAtualizacao) {
      novidade.replaceChildren(tr('Há uma versão nova: {versao}.', { versao: v.nova }) + ' ', link(tr('Baixar'), () => abrirEndereco(v.pagina)));
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
export { info, caminhoTela, ITENS };
