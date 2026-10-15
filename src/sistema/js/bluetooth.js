/*
 * O Bluetooth na área de trabalho: o ícone e a caixa da bandeja (ligar, os aparelhos,
 * conectar e desconectar), o Painel de controle › Bluetooth (procurar, parear, esquecer) e
 * a conversa do pareamento (o código para digitar no teclado, o número para confirmar).
 * No Windows e no macOS, quem cuida do Bluetooth é o sistema: o Painel abre as configurações dele.
 */
import { h, img } from './util.js';
import { Janela } from './janelas.js';
import { avisar } from './sistema.js';
import { alternarFlutuante, fecharFlutuante } from './barra-extras.js';
import { ajustarAoConteudo, erro } from './dialogos.js';
import { tr } from './idioma.js';

let estado = { existe: false };
let aparelhos = [];
let icone = null;

const ICONE_DO_TIPO = { mouse: 'mouse', teclado: 'teclado', som: 'sons', controle: 'jogos', computador: 'computador' };
const iconeDe = (a) => ICONE_DO_TIPO[a.tipo] || 'bluetooth';

/** "Conectado · bateria 85%" */
function situacaoDe(a) {
  const partes = [a.conectado ? tr('Conectado') : a.pareado ? tr('Pareado') : tr('Disponível')];
  if (a.bateria != null) partes.push(tr('bateria {n}%', { n: a.bateria }));
  return partes.join(' · ');
}

export async function lerBluetooth() {
  estado = await retro.bluetooth.estado().catch(() => ({ existe: false }));
  aparelhos = estado.existe && estado.ligado ? await retro.bluetooth.aparelhos().catch(() => []) : [];
  atualizarIcone();
  return estado;
}

function atualizarIcone() {
  if (!icone) return;
  icone.hidden = !estado.existe;
  icone.classList.toggle('desligado', !estado.ligado);
  const conectados = aparelhos.filter((a) => a.conectado);
  icone.title = !estado.ligado ? tr('Bluetooth desligado')
    : conectados.length ? tr('Bluetooth: {lista}', { lista: conectados.map((a) => a.nome).join(', ') }) : tr('Bluetooth ligado');
}

const link = (texto, acao) => h('a', { href: '#', on: { click: (e) => { e.preventDefault(); acao(); } } }, texto);

/** A caixa da bandeja. */
function caixaBluetooth() {
  const corpo = h('div.caixa-bandeja.bluetooth');
  const desenhar = () => {
    const chk = h('input', { type: 'checkbox', checked: !!estado.ligado });
    chk.addEventListener('change', async () => {
      const r = await retro.bluetooth.ligar(chk.checked);
      if (!r.ok) erro(r.bloqueado ? tr('O Bluetooth está bloqueado (o modo avião ou a tecla do Wi-Fi e do Bluetooth do notebook).') : tr('Não foi possível mudar o Bluetooth: {erro}', { erro: r.erro || '?' }));
      await lerBluetooth();
      desenhar();
    });
    const pareados = aparelhos.filter((a) => a.pareado);
    corpo.replaceChildren(
      h('div.cxb-titulo', h('b', tr('Bluetooth')), h('label', chk, h('span', tr('Ligado')))),
      estado.ligado
        ? h('div.bt-lista', ...(pareados.length ? pareados.map((a) => h('div.bt-item',
          img(iconeDe(a), 16), h('div', h('div', a.nome), h('div.bt-sit', situacaoDe(a))),
          h('button', { type: 'button', on: { click: async (e) => { e.currentTarget.disabled = true; await (a.conectado ? retro.bluetooth.desconectar(a.mac) : retro.bluetooth.conectar(a.mac)); await lerBluetooth(); desenhar(); } } }, a.conectado ? tr('Desconectar') : tr('Conectar'))))
          : [h('div.cxb-nota', tr('Nenhum aparelho pareado.'))]))
        : h('div.cxb-nota', tr('O Bluetooth está desligado.')),
      h('div.cxb-links', link(tr('Adicionar aparelho…'), () => { fecharFlutuante(); abrirBluetooth({ procurar: true }); }), link(tr('Configurações de Bluetooth…'), () => { fecharFlutuante(); abrirBluetooth(); })));
  };
  desenhar();
  lerBluetooth().then(desenhar);
  return corpo;
}

/** O ícone da bandeja (só aparece com um Bluetooth no computador, no Linux). */
export function iconeBluetooth() {
  icone = img('bluetooth', 16, { class: 'bandeja-ico bt-ico', hidden: true });
  icone.addEventListener('mousedown', (e) => { if (e.button === 0) { e.preventDefault(); alternarFlutuante(icone, caixaBluetooth); } });
  lerBluetooth();
  // A bateria do mouse e do teclado e o que está conectado mudam devagar.
  setInterval(() => { if (!document.hidden) lerBluetooth(); }, 60000);
  return icone;
}

/* ---------- O Painel de controle › Bluetooth ---------- */

let janelaBt = null;

export async function abrirBluetooth({ procurar = false } = {}) {
  await lerBluetooth();
  if (!estado.existe && estado.sistema) return retro.bluetooth.configuracoesDoSistema();
  if (janelaBt && !janelaBt.fechada) { janelaBt.focar(); return janelaBt; }
  const j = new Janela({ titulo: tr('Bluetooth'), icone: 'bluetooth', largura: 420, altura: 400, minimizavel: false, maximizavel: false });
  janelaBt = j;
  const lista = h('div.bt-painel-lista', { tabIndex: 0 });
  const nota = h('div.bt-nota');
  let escolhido = null;
  const chk = h('input', { type: 'checkbox' });
  const btAcao = h('button', { type: 'button' });
  const btEsquecer = h('button', { type: 'button' }, tr('Esquecer'));
  const btProcurar = h('button', { type: 'button' }, tr('Procurar aparelhos'));
  const desenhar = () => {
    chk.checked = !!estado.ligado;
    if (!estado.existe) {
      lista.replaceChildren(h('div.bt-vazio', tr('Nenhum Bluetooth encontrado neste computador.')));
      for (const b of [btAcao, btEsquecer, btProcurar, chk]) b.disabled = true;
      return;
    }
    const ordem = aparelhos.slice().sort((a, b) => (b.pareado - a.pareado) || (b.conectado - a.conectado) || a.nome.localeCompare(b.nome));
    lista.replaceChildren(...(ordem.length ? ordem.map((a) => {
      const el = h('div.bt-item' + (escolhido === a.mac ? '.sel' : ''), img(iconeDe(a), 32), h('div', h('b', a.nome), h('div', situacaoDe(a))));
      el.addEventListener('mousedown', () => { escolhido = a.mac; desenhar(); });
      el.addEventListener('dblclick', () => agir(a));
      return el;
    }) : [h('div.bt-vazio', estado.ligado ? tr('Nenhum aparelho. Ponha o aparelho no modo de pareamento e clique em Procurar aparelhos.') : tr('O Bluetooth está desligado.'))]));
    const a = aparelhos.find((x) => x.mac === escolhido);
    btAcao.textContent = !a ? tr('Conectar') : !a.pareado ? tr('Parear') : a.conectado ? tr('Desconectar') : tr('Conectar');
    btAcao.disabled = !a || !estado.ligado;
    btEsquecer.disabled = !a || !a.pareado;
    btProcurar.disabled = !estado.ligado;
    chk.disabled = false;
  };
  const recarregar = async () => { await lerBluetooth(); desenhar(); };
  const agir = async (a) => {
    if (!a) return;
    if (!a.pareado) return parear(a).then(recarregar);
    btAcao.disabled = true;
    nota.textContent = a.conectado ? tr('Desconectando…') : tr('Conectando a {nome}…', { nome: a.nome });
    const r = await (a.conectado ? retro.bluetooth.desconectar(a.mac) : retro.bluetooth.conectar(a.mac));
    nota.textContent = r.ok ? '' : tr('Não foi possível: {erro}. O aparelho está ligado e por perto?', { erro: r.erro || '?' });
    recarregar();
  };
  chk.addEventListener('change', async () => {
    const r = await retro.bluetooth.ligar(chk.checked);
    if (!r.ok) nota.textContent = r.bloqueado ? tr('O Bluetooth está bloqueado (o modo avião ou a tecla do Wi-Fi e do Bluetooth do notebook).') : tr('Não foi possível mudar o Bluetooth: {erro}', { erro: r.erro || '?' });
    recarregar();
  });
  btAcao.addEventListener('click', () => agir(aparelhos.find((x) => x.mac === escolhido)));
  btEsquecer.addEventListener('click', async () => {
    const a = aparelhos.find((x) => x.mac === escolhido);
    if (!a) return;
    await retro.bluetooth.esquecer(a.mac);
    escolhido = null;
    recarregar();
  });
  const procurarAgora = async () => {
    btProcurar.disabled = true;
    nota.textContent = tr('Procurando… Deixe o aparelho no modo de pareamento (veja o manual dele).');
    aparelhos = await retro.bluetooth.procurar().catch(() => aparelhos);
    nota.textContent = '';
    desenhar();
  };
  btProcurar.addEventListener('click', procurarAgora);
  j.corpo.style.padding = '8px';
  j.corpo.append(
    h('div.bt-cabeca', img('bluetooth', 32), h('div', tr('Os mouses, os teclados, os fones e os controles sem fio. Para um aparelho novo, ponha-o no modo de pareamento e clique em Procurar aparelhos.'))),
    h('label.bt-ligar', chk, h('span', tr('Bluetooth ligado'))),
    lista, nota,
    h('div.acoes.direita', btProcurar, btAcao, btEsquecer, h('button.padrao', { type: 'button', on: { click: () => j.fechar() } }, tr('Fechar'))));
  j.ev.on('fechada', () => { janelaBt = null; });
  desenhar();
  if (procurar && estado.ligado) procurarAgora();
  return j;
}

/* ---------- O pareamento ---------- */

/** Pareia (e conecta), mostrando o que o aparelho pedir. */
function parear(a) {
  return new Promise((resolve) => {
    const j = new Janela({ titulo: tr('Parear {nome}', { nome: a.nome }), icone: 'bluetooth', dialogo: true, largura: 360, altura: 200, aoFechar: () => { retro.bluetooth.cancelar().catch(() => { }); } });
    const texto = h('div.texto', tr('Pareando com {nome}…', { nome: a.nome }));
    const codigo = h('div.bt-codigo', { hidden: true });
    const extra = h('div');
    const acoes = h('div.acoes', h('button', { type: 'button', on: { click: () => j.fechar() } }, tr('Cancelar')));
    j.corpo.append(h('div.mensagem', img(iconeDe(a), 32), h('div', texto, codigo, extra)), acoes);
    ajustarAoConteudo(j, { minLarg: 360 });
    const largar = retro.bluetooth.aoPergunta((p) => {
      if (p.mac !== a.mac) return;
      extra.replaceChildren();
      if (p.pergunta === 'digitar') {
        texto.textContent = tr('Digite este código em {nome} e aperte Enter:', { nome: a.nome });
        codigo.hidden = false;
        codigo.textContent = p.codigo;
      } else if (p.pergunta === 'confirmar') {
        texto.textContent = tr('{nome} mostra este número?', { nome: a.nome });
        codigo.hidden = false;
        codigo.textContent = p.codigo;
        extra.append(h('div.acoes', h('button.padrao', { type: 'button', on: { click: () => { retro.bluetooth.responder('yes'); extra.replaceChildren(); } } }, tr('Sim')), h('button', { type: 'button', on: { click: () => retro.bluetooth.responder('no') } }, tr('Não'))));
      } else if (p.pergunta === 'pin') {
        texto.textContent = tr('Digite o PIN de {nome} (muitos usam 0000 ou 1234):', { nome: a.nome });
        const campo = h('input', { type: 'text', value: '0000', style: { width: '80px' } });
        extra.append(h('div.linha', campo, h('button.padrao', { type: 'button', on: { click: () => { retro.bluetooth.responder(campo.value.trim() || '0000'); extra.replaceChildren(); } } }, tr('OK'))));
        campo.focus();
      } else if (p.pergunta === 'pronto') {
        codigo.hidden = true;
        texto.textContent = tr('Pareado. Conectando…');
      }
      // A caixa acompanha o que apareceu (o código, os botões).
      ajustarAoConteudo(j, { minLarg: 360 });
    });
    retro.bluetooth.parear(a.mac).then((r) => {
      largar();
      j.fechar(true);
      if (r.ok) avisar(tr('Bluetooth'), r.conectado ? tr('{nome} está conectado.', { nome: a.nome }) : tr('{nome} foi pareado.', { nome: a.nome }), { icone: iconeDe(a), som: null });
      else if (r.erro !== 'cancelado') erro(tr('Não foi possível parear {nome} ({erro}). Confira se ele está no modo de pareamento e tente de novo.', { nome: a.nome, erro: r.erro || '?' }));
      resolve(r);
    }).catch(() => { largar(); j.fechar(true); resolve({ ok: false }); });
  });
}

