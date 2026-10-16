/*
 * A bandeja da barra de tarefas: a rede, o volume, a bateria (com o brilho da tela) e o
 * sino das notificações. Cada um abre a sua caixinha acima da barra, no estilo da época.
 * O volume, o brilho e a rede são os do computador (src/principal/bandeja.js); sem eles,
 * o volume muda só os sons do Retro Computer e a rede mostra só se há internet.
 */
import { h, img, icone } from './util.js';
import { estado, abrir, eventos, definirConfig, avisar, avisos, esquecerAviso, avisosLidos } from './sistema.js';
import { alternarFlutuante, fecharFlutuante } from './barra-extras.js';
import { entrada } from './dialogos.js';
import { tocar } from './sons.js';
import { tr, localidade } from './idioma.js';
import { deslizante } from './controles.js';
import { iconeBluetooth } from './bluetooth.js';

/* ---------- Peças comuns ---------- */

/** Troca o desenho de um ícone de 16 pontos da bandeja. */
function trocarIcone(el, nome) {
  const src = icone(nome, 16);
  if (el.getAttribute('src') !== src) el.setAttribute('src', src);
}

/**
 * Manda os pedidos ao computador um de cada vez, sempre com o valor mais novo
 * (arrastar o controle não enfileira dezenas de comandos).
 */
function emFila(fn) {
  let andando = false;
  let proximo;
  let tem = false;
  return (v) => {
    proximo = v;
    tem = true;
    if (andando) return;
    andando = true;
    (async () => {
      while (tem) {
        const x = proximo;
        tem = false;
        try { await fn(x); } catch { }
      }
      andando = false;
    })();
  };
}

const caixa = (classe, ...filhos) => h('div.caixa-bandeja' + (classe ? '.' + classe : ''), ...filhos);
const cabecalho = (texto, ...extra) => h('div.cxb-titulo', h('b', texto), ...extra);
const link = (texto, acao) => h('a', { href: '#', on: { click: (e) => { e.preventDefault(); acao(); } } }, texto);

/** O indicador rápido acima da bandeja (as teclas de volume e de brilho). */
let indicador = null;
export function mostrarIndicador(nomeIcone, texto, pct) {
  if (!indicador) {
    indicador = h('div.indicador-bandeja', img(nomeIcone, 16), h('span'), h('div.ind-barra', h('div')));
    document.getElementById('tela').append(indicador);
  }
  trocarIcone(indicador.children[0], nomeIcone);
  indicador.children[1].textContent = texto;
  // Sem a porcentagem (um aviso curto, como o "Copiado" da busca), sem a barra.
  indicador.children[2].hidden = pct == null;
  if (pct != null) indicador.children[2].firstChild.style.width = Math.max(0, Math.min(100, pct)) + '%';
  indicador.hidden = false;
  clearTimeout(indicador.t);
  indicador.t = setTimeout(() => { indicador.hidden = true; }, 1500);
}

/* ---------- O volume ---------- */

let vol = { disponivel: false };
let somIco;

function iconeVolume() {
  if (!vol.disponivel) return estado.config.sons && estado.config.volume ? 'som-alto' : 'som-mudo';
  if (vol.mudo) return 'som-mudo';
  if (vol.nivel === 0) return 'som-zero';
  return vol.nivel < 34 ? 'som-baixo' : vol.nivel < 67 ? 'som-medio' : 'som-alto';
}

function atualizarSom() {
  if (!somIco) return;
  trocarIcone(somIco, iconeVolume());
  somIco.dataset.dica = vol.disponivel
    ? (vol.mudo ? tr('Volume: sem som') : tr('Volume: {n}%', { n: vol.nivel }))
    : (estado.config.sons ? tr('Sons do Retro Computer ligados') : tr('Sons do Retro Computer desligados'));
}

async function lerVolume() {
  try { vol = await retro.bandeja.volume(); } catch { vol = { disponivel: false }; }
  atualizarSom();
}

const pedirNivel = emFila(async (n) => { vol = await retro.bandeja.definirVolume({ nivel: n }); atualizarSom(); });
const pedirMudo = emFila(async (m) => { vol = await retro.bandeja.definirVolume({ mudo: m }); atualizarSom(); });
const gravarVolumeRetro = emFila((n) => definirConfig({ volume: n / 100 }));

/** Sobe ou desce o volume (as teclas do teclado e a roda do mouse sobre o ícone). */
export async function mudarVolume(passo) {
  if (vol.disponivel) {
    vol = await retro.bandeja.definirVolume(passo === 0 ? { mudo: !vol.mudo } : { nivel: (vol.nivel || 0) + passo, mudo: false });
    atualizarSom();
    mostrarIndicador(iconeVolume(), vol.mudo ? tr('Sem som') : tr('Volume: {n}%', { n: vol.nivel }), vol.mudo ? 0 : vol.nivel);
  } else {
    const n = Math.max(0, Math.min(100, Math.round((estado.config.volume ?? 0.6) * 100) + passo));
    await definirConfig(passo === 0 ? { sons: !estado.config.sons } : { volume: n / 100, sons: true });
    mostrarIndicador(iconeVolume(), estado.config.sons ? tr('Volume: {n}%', { n }) : tr('Sem som'), estado.config.sons ? n : 0);
  }
  if (passo) tocar('info');
}

function caixaVolume() {
  const doSistema = vol.disponivel;
  const valor = doSistema ? vol.nivel : Math.round((estado.config.volume ?? 0.6) * 100);
  const numero = h('div.vol-numero', valor + '%');
  const chkMudo = h('input', { type: 'checkbox', checked: doSistema ? !!vol.mudo : !estado.config.sons });
  const d = deslizante({
    valor, vertical: true, tamanho: 96, rotulo: tr('Volume'),
    aoMudar: (n) => {
      numero.textContent = n + '%';
      if (doSistema) pedirNivel(n); else gravarVolumeRetro(n);
    },
    // Como nos aparelhos da época: um bipe ao soltar, para ouvir o volume novo.
    aoSoltar: () => tocar('info'),
  });
  chkMudo.addEventListener('change', () => {
    if (doSistema) pedirMudo(chkMudo.checked);
    else definirConfig({ sons: !chkMudo.checked }).then(atualizarSom);
  });
  const chkSons = h('input', { type: 'checkbox', checked: !!estado.config.sons });
  chkSons.addEventListener('change', () => definirConfig({ sons: chkSons.checked }).then(() => { atualizarSom(); if (chkSons.checked) tocar('info'); }));
  return caixa('volume',
    cabecalho(doSistema ? tr('Volume') : tr('Volume do Retro Computer')),
    h('div.vol-meio', d.el, numero),
    h('label', chkMudo, h('span', tr('Sem som'))),
    doSistema ? [h('hr.sulco'), h('label', chkSons, h('span', tr('Sons do Retro Computer')))] : h('div.cxb-nota', tr('O volume do computador não respondeu; este controle muda só os sons do Retro Computer.')),
    h('div.cxb-links', link(tr('Ajustar os sons…'), () => { fecharFlutuante(); abrir('painel', { secao: 'sons' }); })),
  );
}

/* ---------- A bateria e o brilho da tela ---------- */

let bat = null; // { nivel (0 a 1), carregando, restante (s), cheiaEm (s) }
let batIco;
let aparelhos = []; // as baterias do mouse, do teclado e dos fones sem fio: { nome, nivel (0 a 100), carregando }
const avisadosAparelhos = new Set();
const iconeDoNivel = (pct, carregando) => (carregando ? 'bateria-carga-' : 'bateria-') + (pct <= 10 ? 0 : pct <= 35 ? 1 : pct <= 60 ? 2 : pct <= 85 ? 3 : 4);
const textoAparelho = (a) => (a.nivel == null ? a.nome : tr('{aparelho}: {pct}%', { aparelho: a.nome, pct: a.nivel }));
let avisouBateria = 1;

function tempoTexto(seg) {
  const m = Math.max(1, Math.round(seg / 60));
  const horas = Math.floor(m / 60);
  return horas ? tr('{h} h {m} min', { h: horas, m: m % 60 }) : tr('{m} min', { m });
}

function textoBateria() {
  const pct = Math.round(bat.nivel * 100);
  if (bat.carregando) {
    if (pct >= 100) return tr('Carregada ({pct}%) e ligada na tomada', { pct });
    if (Number.isFinite(bat.cheiaEm) && bat.cheiaEm > 0) return tr('{pct}%, carregando (cheia em {tempo})', { pct, tempo: tempoTexto(bat.cheiaEm) });
    return tr('{pct}%, carregando', { pct });
  }
  if (Number.isFinite(bat.restante) && bat.restante > 0) return tr('{pct}% (restam cerca de {tempo})', { pct, tempo: tempoTexto(bat.restante) });
  return tr('{pct}% restantes', { pct });
}

function iconeBateria() {
  const n = bat.nivel <= 0.1 ? 0 : bat.nivel <= 0.35 ? 1 : bat.nivel <= 0.6 ? 2 : bat.nivel <= 0.85 ? 3 : 4;
  return (bat.carregando ? 'bateria-carga-' : 'bateria-') + n;
}

function atualizarBateria() {
  if (!batIco) return;
  avisarAparelhos();
  if (!bat) {
    // Sem a bateria do computador (os de mesa), o ícone mostra a dos aparelhos sem fio, se houver.
    const comNivel = aparelhos.filter((a) => a.nivel != null);
    batIco.hidden = !aparelhos.length;
    if (!aparelhos.length) return;
    const menor = comNivel.length ? Math.min(...comNivel.map((a) => a.nivel)) : 100;
    trocarIcone(batIco, iconeDoNivel(menor, false));
    batIco.dataset.dica = aparelhos.map(textoAparelho).join(' · ');
    return;
  }
  batIco.hidden = false;
  trocarIcone(batIco, iconeBateria());
  batIco.dataset.dica = tr('Bateria: {texto}', { texto: textoBateria() });
  // Os avisos de bateria fraca: aos 10% e aos 5%, uma vez por descarga.
  if (bat.carregando) { avisouBateria = 1; return; }
  const limite = bat.nivel <= 0.05 ? 0.05 : bat.nivel <= 0.1 ? 0.1 : 1;
  if (limite < avisouBateria) {
    avisouBateria = limite;
    avisar(limite <= 0.05 ? tr('Bateria muito fraca') : tr('Bateria fraca'),
      tr('Restam {pct}%. Ligue o carregador para não perder o que está aberto.', { pct: Math.round(bat.nivel * 100) }),
      { icone: 'bateria-0', som: 'aviso', ms: 12000 });
  }
}

/** A bateria fraca de um aparelho sem fio: um aviso aos 10% (de novo só depois de carregar). */
function avisarAparelhos() {
  for (const a of aparelhos) {
    if (a.nivel == null) continue;
    if (a.carregando || a.nivel > 20) { avisadosAparelhos.delete(a.nome); continue; }
    if (a.nivel <= 10 && !avisadosAparelhos.has(a.nome)) {
      avisadosAparelhos.add(a.nome);
      avisar(tr('Bateria fraca: {aparelho}', { aparelho: a.nome }), tr('Restam {pct}%. Carregue o aparelho quando puder.', { pct: a.nivel }), { icone: 'bateria-0', som: 'aviso', ms: 10000 });
    }
  }
}

async function lerAparelhos() {
  aparelhos = await retro.bandeja.aparelhos().catch(() => []);
  atualizarBateria();
}

async function iniciarBateria() {
  const b = await retro.bandeja.bateria().catch(() => ({ existe: false }));
  if (!b || !b.existe) return;
  if (b.falsa) {
    bat = { nivel: b.falsa.nivel, carregando: b.falsa.carregando, restante: b.falsa.restante, cheiaEm: Infinity };
    return atualizarBateria();
  }
  if (!navigator.getBattery) return;
  const m = await navigator.getBattery();
  const ler = () => {
    bat = { nivel: m.level, carregando: m.charging, restante: m.dischargingTime, cheiaEm: m.chargingTime };
    atualizarBateria();
  };
  for (const ev of ['levelchange', 'chargingchange', 'dischargingtimechange', 'chargingtimechange']) m.addEventListener(ev, ler);
  ler();
}

const pedirBrilho = emFila((n) => retro.bandeja.definirBrilho(n));

/** Sobe ou desce o brilho (as teclas do teclado). */
export async function mudarBrilho(passo) {
  const b = await retro.bandeja.brilho().catch(() => ({ disponivel: false }));
  if (!b.disponivel) return;
  const r = await retro.bandeja.definirBrilho(b.nivel + passo);
  mostrarIndicador('brilho', tr('Brilho: {n}%', { n: r.nivel }), r.nivel);
}

function caixaBateria() {
  const corpo = caixa('bateria', cabecalho(tr('Bateria')));
  if (bat) {
    const pct = Math.round(bat.nivel * 100);
    corpo.append(
      h('div.bat-linha', img(iconeBateria(), 16), h('div.bat-medida', h('div', { class: bat.nivel <= 0.1 ? 'fraca' : null, style: { width: pct + '%' } })), h('span', pct + '%')),
      h('div.cxb-texto', textoBateria()));
  }
  // O mouse, o teclado e os fones sem fio.
  if (aparelhos.length) {
    if (bat) corpo.append(h('hr.sulco'));
    corpo.append(h('div.cxb-titulo', h('span', tr('Aparelhos sem fio'))),
      ...aparelhos.map((a) => h('div.cxb-linha', img(a.nivel == null ? 'bateria-4' : iconeDoNivel(a.nivel, a.carregando), 16), h('span', textoAparelho(a)))));
  }
  if (!bat) return corpo;
  const lugarBrilho = h('div');
  const lugarPerfil = h('div');
  corpo.append(lugarBrilho, lugarPerfil);
  // O modo de energia (o power-profiles-daemon do Linux, como no Zorin OS e no GNOME).
  retro.bandeja.perfil().then((p) => {
    if (!p || !p.disponivel || !p.perfis || p.perfis.length < 2) return;
    const NOMES = { 'power-saver': tr('Economia de energia'), balanced: tr('Equilibrado'), performance: tr('Desempenho') };
    const opcoes = p.perfis.map((nome) => {
      const r = h('input', { type: 'radio', name: 'perfil-energia', checked: nome === p.atual });
      r.addEventListener('change', async () => {
        if (!r.checked) return;
        const novo = await retro.bandeja.definirPerfil(nome).catch(() => null);
        // Se o computador não aceitou, a marca volta para o modo de verdade.
        if (novo && novo.atual) for (const [k, o] of opcoes) o.checked = k === novo.atual;
      });
      return [nome, r];
    });
    lugarPerfil.replaceChildren(h('hr.sulco'), h('div.cxb-titulo', h('span', tr('Modo de energia'))),
      ...opcoes.map(([nome, r]) => h('label.cxb-linha', r, h('span', NOMES[nome]))));
  }).catch(() => { });
  retro.bandeja.brilho().then((b) => {
    if (!b || !b.disponivel) return;
    const numero = h('span.vol-numero', b.nivel + '%');
    const d = deslizante({ valor: b.nivel, min: 5, max: 100, tamanho: 120, rotulo: tr('Brilho da tela'), aoMudar: (n) => { numero.textContent = n + '%'; pedirBrilho(n); } });
    lugarBrilho.replaceChildren(h('hr.sulco'), h('div.cxb-linha', img('brilho', 16), h('span', tr('Brilho da tela'))), h('div.cxb-linha', d.el, numero));
  }).catch(() => { });
  return corpo;
}

/* ---------- A rede ---------- */

let rede = null;
let redeIco;
const nivelSinal = (s) => (s >= 75 ? 4 : s >= 50 ? 3 : s >= 25 ? 2 : s > 0 ? 1 : 0);

function textoRede() {
  if (!navigator.onLine) return tr('Sem conexão com a internet');
  if (rede && rede.cabo) return tr('Conectado pelo cabo de rede');
  if (rede && rede.wifi && rede.wifi.ssid) {
    return rede.wifi.sinal != null ? tr('Conectado à rede {rede} (sinal de {n}%)', { rede: rede.wifi.ssid, n: rede.wifi.sinal }) : tr('Conectado à rede {rede}', { rede: rede.wifi.ssid });
  }
  return tr('Conectado à internet');
}

function atualizarRede() {
  if (!redeIco) return;
  let nome = navigator.onLine ? 'rede-ligada' : 'rede-desligada';
  if (navigator.onLine && rede && !rede.cabo && rede.wifi && rede.wifi.ssid && rede.wifi.sinal != null) nome = 'sinal-' + nivelSinal(rede.wifi.sinal);
  trocarIcone(redeIco, nome);
  redeIco.dataset.dica = textoRede();
}

async function lerRede() {
  try { rede = await retro.bandeja.rede(); } catch { rede = null; }
  atualizarRede();
  return rede;
}

/** Conecta a uma rede, pedindo a senha quando ela é protegida e ainda não está guardada. */
async function conectarRede(r) {
  fecharFlutuante();
  avisar(tr('Conectando…'), r.ssid, { icone: 'rede-ligada', som: null, ms: 4000, guardar: false });
  let res = await retro.bandeja.conectar(r.ssid, '');
  while (!res.ok && res.precisaSenha) {
    const senha = await entrada({
      titulo: tr('Conectar a {rede}', { rede: r.ssid }),
      texto: res.erro ? tr('A senha não foi aceita. Digite de novo a senha da rede {rede}:', { rede: r.ssid }) : tr('Digite a senha da rede {rede}:', { rede: r.ssid }),
      tipo: 'password', icone: 'rede',
    });
    if (!senha) return lerRede();
    avisar(tr('Conectando…'), r.ssid, { icone: 'rede-ligada', som: null, ms: 8000, guardar: false });
    res = await retro.bandeja.conectar(r.ssid, senha);
  }
  if (res.ok) avisar(tr('Conectado'), tr('Conectado à rede {rede}.', { rede: r.ssid }), { icone: 'rede-ligada', som: null });
  else avisar(tr('Não foi possível conectar'), res.erro ? tr('{rede}: {erro}', { rede: r.ssid, erro: res.erro }) : r.ssid, { icone: 'rede-desligada', som: 'aviso' });
  return lerRede();
}

function caixaRede() {
  const corpo = caixa('rede');
  const estadoEl = h('div.cxb-linha');
  const mensagem = h('div.cxb-nota');
  let escolhida = null;
  let redes = [];

  const desenharEstado = () => estadoEl.replaceChildren(img(navigator.onLine ? 'rede-ligada' : 'rede-desligada', 16), h('span', textoRede()));

  async function desenhar(procurar) {
    desenharEstado();
    if (!rede || rede.como !== 'nmcli' || !rede.wifi || !rede.wifi.existe) {
      // Sem o NetworkManager (Windows, macOS, outros Linux): quem escolhe a rede é o sistema.
      corpo.replaceChildren(cabecalho(tr('Rede')), estadoEl,
        h('div.cxb-nota', tr('As redes são escolhidas no computador principal.')),
        h('div.cxb-links', link(tr('Configurações de rede do computador…'), () => { fecharFlutuante(); retro.bandeja.configuracoesRede(); })));
      return;
    }
    const chkWifi = h('input', { type: 'checkbox', checked: !!rede.wifi.ligado });
    chkWifi.addEventListener('change', async () => {
      mensagem.textContent = chkWifi.checked ? tr('Ligando o Wi-Fi…') : '';
      await retro.bandeja.ligarWifi(chkWifi.checked);
      await lerRede();
      setTimeout(() => desenhar(chkWifi.checked), chkWifi.checked ? 1500 : 0);
    });
    const lista = h('div.lista-redes', { tabIndex: 0 });
    const btConectar = h('button', { type: 'button', disabled: true }, tr('Conectar'));
    const btProcurar = h('button', { type: 'button', disabled: !rede.wifi.ligado }, tr('Procurar redes'));
    const desenharLista = () => {
      lista.replaceChildren(...(redes.length ? redes.map((r) => {
        const linha = h('div.rede' + (r.emUso ? '.em-uso' : '') + (escolhida === r.ssid ? '.escolhida' : ''),
          { title: r.protegida ? tr('Protegida por senha ({tipo})', { tipo: r.seguranca || '?' }) : tr('Aberta, sem senha') },
          img('sinal-' + nivelSinal(r.sinal), 16), h('span.rede-nome', r.ssid), r.protegida ? img('cadeado', 16) : h('span.rede-vazio'),
          r.emUso ? h('span.rede-status', tr('Conectado')) : null);
        linha.addEventListener('click', () => { escolhida = r.ssid; desenharLista(); });
        linha.addEventListener('dblclick', () => (r.emUso ? null : conectarRede(r)));
        return linha;
      }) : [h('div.rede-vazia', rede.wifi.ligado ? tr('Nenhuma rede encontrada.') : tr('O Wi-Fi está desligado.'))]));
      const r = redes.find((x) => x.ssid === escolhida);
      btConectar.disabled = !r;
      btConectar.textContent = r && r.emUso ? tr('Desconectar') : tr('Conectar');
    };
    btConectar.addEventListener('click', async () => {
      const r = redes.find((x) => x.ssid === escolhida);
      if (!r) return;
      if (r.emUso) {
        mensagem.textContent = tr('Desconectando…');
        await retro.bandeja.desconectar();
        await lerRede();
        return desenhar(false);
      }
      conectarRede(r);
    });
    btProcurar.addEventListener('click', () => desenhar(true));
    lista.addEventListener('keydown', (e) => {
      const i = redes.findIndex((x) => x.ssid === escolhida);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = Math.max(0, Math.min(redes.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
        if (redes[n]) { escolhida = redes[n].ssid; desenharLista(); }
      } else if (e.key === 'Enter' && redes[i]) {
        btConectar.click();
      }
    });
    corpo.replaceChildren(cabecalho(tr('Rede')), estadoEl,
      h('label', chkWifi, h('span', tr('Wi-Fi ligado'))),
      lista, mensagem,
      h('div.cxb-botoes', btConectar, btProcurar),
      h('div.cxb-links', link(tr('Configurações de rede do computador…'), () => { fecharFlutuante(); retro.bandeja.configuracoesRede(); })));
    if (!rede.wifi.ligado) { redes = []; return desenharLista(); }
    mensagem.textContent = procurar ? tr('Procurando redes…') : '';
    lista.replaceChildren(h('div.rede-vazia', tr('Procurando redes…')));
    redes = await retro.bandeja.redes(!!procurar).catch(() => []);
    mensagem.textContent = '';
    desenharLista();
  }

  corpo.append(cabecalho(tr('Rede')), estadoEl);
  lerRede().then(() => desenhar(false));
  return corpo;
}

/* ---------- As notificações ---------- */

let sino;

function atualizarSino() {
  if (!sino) return;
  const n = avisos.naoLidos;
  const num = sino.querySelector('.sino-num');
  num.textContent = n > 9 ? '9+' : String(n);
  num.hidden = !n;
  sino.classList.toggle('nao-perturbe', !!estado.config.naoPerturbe);
  sino.dataset.dica = estado.config.naoPerturbe ? tr('Não perturbe: os avisos ficam só aqui') : (n ? tr('{n} notificação(ões) nova(s)', { n }) : tr('Notificações'));
}

function horaAviso(em) {
  const s = (Date.now() - em) / 1000;
  if (s < 60) return tr('agora');
  if (s < 3600) return tr('há {n} min', { n: Math.floor(s / 60) });
  return new Date(em).toLocaleTimeString(localidade(), { hour: '2-digit', minute: '2-digit' });
}

function caixaNotificacoes() {
  const corpo = caixa('notificacoes');
  const desenhar = () => {
    const chk = h('input', { type: 'checkbox', checked: !!estado.config.naoPerturbe });
    chk.addEventListener('change', () => definirConfig({ naoPerturbe: chk.checked }).then(atualizarSino));
    const lista = avisos.lista.length ? avisos.lista.map((a) => {
      const item = h('div.aviso-item',
        img(a.icone && !a.icone.startsWith('msg-') ? a.icone : 'logo', 16),
        h('div', h('div.aviso-topo', h('b', a.titulo), h('span.aviso-hora', horaAviso(a.em))), a.texto ? h('div.aviso-texto', a.texto) : null));
      item.addEventListener('click', () => {
        esquecerAviso(a.id);
        if (a.aoClicar) { fecharFlutuante(); a.aoClicar(); } else desenhar();
      });
      return item;
    }) : [h('div.rede-vazia', tr('Nenhuma notificação.'))];
    corpo.replaceChildren(
      cabecalho(tr('Notificações'), avisos.lista.length ? link(tr('Limpar tudo'), () => { esquecerAviso(); desenhar(); }) : null),
      h('div.lista-avisos', ...lista),
      h('label', { title: tr('Os avisos ficam aqui, sem o balão e sem o som.') }, chk, h('span', tr('Não perturbe'))));
  };
  desenhar();
  avisosLidos();
  return corpo;
}

/* ---------- A montagem ---------- */

/** Os ícones da bandeja: [rede, volume, bateria] antes do relógio e o sino depois dele. */
export function montarBandeja() {
  redeIco = img('rede-ligada', 16, { class: 'bandeja-ico' });
  somIco = img('som-alto', 16, { class: 'bandeja-ico' });
  batIco = img('bateria-4', 16, { class: 'bandeja-ico' });
  batIco.hidden = true;
  sino = h('span.sino.bandeja-ico', img('sino', 16), h('span.sino-num', { hidden: true }));

  const ao = (el, montar) => el.addEventListener('mousedown', (e) => { if (e.button === 0) { e.preventDefault(); alternarFlutuante(el, montar); } });
  ao(redeIco, caixaRede);
  ao(somIco, caixaVolume);
  ao(batIco, () => (bat || aparelhos.length ? caixaBateria() : caixa('')));
  ao(sino, caixaNotificacoes);
  somIco.addEventListener('wheel', (e) => { e.preventDefault(); mudarVolume(e.deltaY < 0 ? 5 : -5); }, { passive: false });

  eventos.on('config', () => { atualizarSom(); atualizarSino(); });
  eventos.on('avisos', atualizarSino);
  window.addEventListener('online', () => lerRede());
  window.addEventListener('offline', () => lerRede());
  lerVolume();
  lerRede();
  iniciarBateria().catch(() => { });
  // As baterias do mouse e do teclado mudam devagar: uma olhada a cada 5 minutos.
  lerAparelhos();
  setInterval(lerAparelhos, 5 * 60 * 1000);
  atualizarSino();
  // O volume e a rede mudam também por fora (as teclas do computador, o cabo tirado).
  setInterval(() => { if (!document.hidden) { lerVolume(); lerRede(); } }, 20000);
  // As teclas do computador no modo sistema (main.js, teclasDoSistema).
  retro.sistema.aoTecla((acao) => {
    if (acao === 'volume+') mudarVolume(5);
    else if (acao === 'volume-') mudarVolume(-5);
    else if (acao === 'mudo') mudarVolume(0);
    else if (acao === 'brilho+') mudarBrilho(10);
    else if (acao === 'brilho-') mudarBrilho(-10);
    else if (acao === 'iniciar') import('./barra.js').then((m) => m.alternarIniciar());
    else if (acao === 'calculadora') abrir('calculadora');
    else if (acao === 'bloquear') import('./bloqueio.js').then((m) => m.bloquear());
    else if (acao === 'monitor') abrir('monitor');
    else if (acao.startsWith('captura')) import('./apps/captura.js').then((m) => m.capturaRapida(acao === 'captura-janela' ? 'janela' : acao === 'captura-regiao' ? 'regiao' : 'tela'));
  });
  return { antes: [iconeBluetooth(), redeIco, somIco, batIco], depois: [sino] };
}
