/*
 * O estado do sistema: as configurações, os programas (embutidos e instalados),
 * qual programa abre cada tipo de arquivo, os documentos recentes e os avisos.
 */
import { h, img, extensao, nomeDe, paiDe, ehTexto, Eventos, caminhoTela, EXECUTAVEIS } from './util.js';
import { configurar as configurarSons, tocar } from './sons.js';
import { tr, localidade } from './idioma.js';
import { comPrograma } from './janelas.js';

export const eventos = new Eventos();
export const estado = {
  config: null,
  instalados: [],
  catalogo: [],
  raizDisco: '',
  // O modo foco completo (foco.js): durante um bloco de foco, { silencio, semJogos, fim } ou null.
  emFoco: null,
};

/** O "Não perturbe" agora: o escolhido no sino ou o do bloco de foco. */
export const naoPerturbeAgora = () => !!(estado.config && estado.config.naoPerturbe) || !!(estado.emFoco && estado.emFoco.silencio);

// Os jogos, que o modo foco completo deixa para as pausas.
const JOGOS = new Set(['paciencia', 'campo-minado', 'breakout', 'damas', 'xadrez']);

const apps = new Map();

/**
 * Registra um programa embutido.
 * @param {string} id
 * @param {{nome:string, icone:string, abrir:(args?:object)=>any, unico?:boolean}} def
 */
export function registrarApp(id, def) {
  apps.set(id, { id, ...def });
}

export function app(id) {
  return apps.get(id) || null;
}

const carregadores = [];

/**
 * Programas que só carregam quando abrem pela primeira vez (ou quando o computador fica parado,
 * depois da abertura): o Retro Computer abre mais depressa, o que conta num computador antigo.
 * O nome e o ícone já valem para a barra e os fixados; ao carregar, o módulo se registra de verdade.
 * @param {Object<string, {nome:string, icone:string}>} defs  os programas do módulo
 * @param {() => Promise<any>} carregar  o import() do módulo
 */
export function registrarPreguicoso(defs, carregar) {
  let promessa = null;
  const carregarUmaVez = () => (promessa = promessa || carregar());
  carregadores.push(carregarUmaVez);
  for (const [id, def] of Object.entries(defs)) {
    apps.set(id, {
      id, ...def, preguicoso: true,
      abrir: async (args) => {
        await carregarUmaVez();
        const real = apps.get(id);
        if (!real || real.preguicoso) return null;
        // De novo com o programa marcado: a janela que ele abrir sabe de quem é (os fixados da barra).
        return comPrograma(id, () => real.abrir(args));
      },
    });
  }
}

/** Carrega, um por vez e sem pressa, os programas que ficaram para depois. */
export function carregarOsQueFaltam() {
  const fila = carregadores.slice();
  const proximo = () => {
    const f = fila.shift();
    if (!f) return;
    const quando = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
    quando(() => f().catch(() => { }).finally(proximo), { timeout: 3000 });
  };
  proximo();
}

export async function carregarConfig() {
  estado.config = await retro.config.obter();
  configurarSons(estado.config);
  return estado.config;
}

export async function definirConfig(parte) {
  const nova = await retro.config.definir(parte);
  estado.config = { ...estado.config, ...nova };
  // A mesa guarda as posições no estado local antes de gravar; o que voltou do disco é a verdade.
  configurarSons(estado.config);
  eventos.emit('config', estado.config, parte);
  return estado.config;
}

/**
 * Uma imagem do disco C: na lista dos papéis de parede do usuário (papel.js guarda uma cópia na
 * pasta dele). Devolve { arquivo, nome }; a mesma imagem duas vezes fica uma só na lista.
 */
export async function adicionarPapel(rel) {
  const p = await retro.papel.adicionar(rel);
  const lista = (estado.config.papeis || []).filter((x) => x.arquivo !== p.arquivo);
  await definirConfig({ papeis: [...lista, p] });
  return p;
}

/** Tira uma imagem da lista (e a cópia dela); o arquivo do disco C: fica. Em uso, o fundo volta à cor. */
export async function removerPapel(arquivo) {
  await retro.papel.remover(arquivo);
  const parte = { papeis: (estado.config.papeis || []).filter((x) => x.arquivo !== arquivo) };
  if (estado.config.papel && estado.config.papel.imagem === arquivo) parte.papel = { imagem: null };
  await definirConfig(parte);
}

export async function atualizarProgramas() {
  estado.instalados = await retro.programas.instalados();
  estado.catalogo = await retro.programas.catalogo();
  eventos.emit('programas', estado.instalados);
  return estado.instalados;
}

/** Os nomes das pastas do disco (no idioma em que o disco foi criado). */
export const pastaDocs = () => (estado.config && estado.config.pastas && estado.config.pastas.documentos) || 'Meus documentos';
export const pastaMesa = () => (estado.config && estado.config.pastas && estado.config.pastas.mesa) || 'Área de trabalho';

// As pastas de imagens, músicas, vídeos e downloads pelo nome (nos três idiomas), como as do Windows.
const NOMES_ESPECIAIS = {
  'pasta-imagens': ['imagens', 'minhas imagens', 'fotos', 'images', 'my images', 'pictures', 'my pictures', 'photos', 'imágenes', 'mis imágenes', 'fotografías'],
  'pasta-musicas': ['músicas', 'minhas músicas', 'música', 'music', 'my music', 'mi música', 'mis músicas'],
  'pasta-videos': ['vídeos', 'meus vídeos', 'videos', 'my videos', 'mis videos', 'mis vídeos', 'filmes', 'movies'],
  'pasta-recebidos': ['downloads', 'baixados', 'descargas'],
};

/**
 * O ícone de uma pasta do disco C:. As pastas especiais têm o próprio, como no Windows: Meus
 * documentos, a Área de trabalho, o DOS e, dentro de Meus documentos, Recebidos, o Diário e as
 * Capturas de tela; e as de imagens, músicas, vídeos e downloads, em Meus documentos ou no C:.
 */
export function iconeDaPasta(rel) {
  const n = String(rel || '');
  const docs = pastaDocs();
  if (n === docs) return 'documentos';
  if (n === pastaMesa()) return 'pasta-mesa';
  if (n.toUpperCase() === 'DOS') return 'pasta-dos';
  const p = (estado.config && estado.config.pastas) || {};
  const pai = paiDe(n);
  const nome = nomeDe(n).toLocaleLowerCase();
  const igual = (x) => !!x && nome === String(x).toLocaleLowerCase();
  if (pai === docs) {
    if (igual(p.recebidos)) return 'pasta-recebidos';
    if (igual(p.diario || tr('Diário de trabalho'))) return 'pasta-diario';
    if (igual(p.capturas || tr('Capturas de tela'))) return 'pasta-capturas';
  }
  if (pai === docs || pai === '') {
    for (const [icone, nomes] of Object.entries(NOMES_ESPECIAIS)) if (nomes.includes(nome)) return icone;
  }
  return 'pasta';
}

/**
 * Abre um endereço da internet: no Navegador do Retro Computer (numa janela já
 * aberta, se houver) ou, se o usuário preferir, no navegador do computador principal.
 */
export async function abrirEndereco(url) {
  const n = (estado.config && estado.config.navegador) || {};
  if (n.links === 'principal' && !estado.config.modoSistema) return retro.sistema.abrirLink(url);
  return abrir('navegador', { url, reaproveitar: true });
}

export function instalado(id) {
  return estado.instalados.find((p) => p.id === id) || null;
}

/** Abre um programa embutido ("bloco", "explorador"…) ou instalado ("craft:wordcraft"). */
export function abrir(id, args = {}) {
  // Compatibilidade com arquivos .atalho de antes da retirada do Dot.
  if (id === 'dot') { id = 'assistente'; args = {}; }
  // Um site instalado como programa (webapps.js).
  if (id.startsWith('webapp:')) return import('./webapps.js').then((m) => m.abrirWebapp(id.slice(7)));
  if (id.startsWith('craft:')) {
    const a = apps.get('craft');
    return a && comPrograma(id, () => a.abrir({ ...args, programa: id.slice(6) }));
  }
  if (estado.emFoco && estado.emFoco.semJogos && JOGOS.has(id)) {
    const hora = new Date(estado.emFoco.fim).toLocaleTimeString(localidade(), { hour: '2-digit', minute: '2-digit' });
    avisar(tr('Foco'), tr('Os jogos ficam para a pausa, que começa às {hora}.', { hora }), { icone: 'foco', guardar: false, sempre: true });
    return null;
  }
  const a = apps.get(id);
  if (!a) {
    console.warn('programa desconhecido', id);
    return null;
  }
  return comPrograma(id, () => a.abrir(args));
}

/* ---------- Abrir arquivos ---------- */

/** Os programas que abrem este arquivo, do preferido ao último. */
export function programasPara(nome) {
  const ext = extensao(nome);
  const r = [];
  if (['txt', 'log', 'ini'].includes(ext)) r.push({ id: 'bloco', nome: tr('Bloco de notas'), icone: 'bloco' });
  // As ferramentas que só mostram (o Visualizador de imagens, o Reprodutor de mídia) vêm antes dos
  // Craft, que editam: abrem mais depressa. Os Craft ficam em "Abrir com".
  for (const a of apps.values()) {
    if ((a.tipos || []).includes(ext)) r.push({ id: a.id, nome: tr(a.nome), icone: a.icone || 'programa' });
  }
  for (const p of estado.instalados) {
    if ((p.tipos || []).includes(ext)) r.push({ id: 'craft:' + p.id, nome: p.nome, icone: p.icone || 'programa' });
  }
  if (ehTexto(nome) && !r.some((x) => x.id === 'bloco')) r.push({ id: 'bloco', nome: tr('Bloco de notas'), icone: 'bloco' });
  // O programa padrão escolhido pelo usuário para o tipo vem primeiro.
  const i = r.findIndex((x) => x.id === padraoPara(nome));
  if (i > 0) r.unshift(...r.splice(i, 1));
  return r;
}

/**
 * O programa padrão escolhido para o tipo do arquivo (Abrir com › Escolher o programa…): o
 * identificador de um programa, 'fora' (o do computador principal) ou null (o de sempre).
 */
export function padraoPara(nome) {
  const ext = extensao(nome);
  return (ext && ((estado.config && estado.config.abrirCom) || {})[ext]) || null;
}

/** Programas do catálogo (não instalados) que abririam o arquivo. */
export function sugestoesPara(nome) {
  const ext = extensao(nome);
  return estado.catalogo.filter((p) => !p.instalado && (p.tipos || []).includes(ext));
}

export async function abrirArquivo(rel, { com } = {}) {
  const nome = nomeDe(rel);
  // O programa padrão do tipo, se o usuário escolheu um (e ele ainda está instalado).
  if (!com) {
    const pad = padraoPara(nome);
    if (pad === 'fora') { adicionarRecente(rel); return abrirNoComputador(rel); }
    if (pad && programasPara(nome).some((p) => p.id === pad)) com = pad;
  }
  // O atalho de um programa abre o programa (só os que o Retro Computer conhece, pela chave).
  if (!com && /\.atalho$/i.test(nome)) {
    const chave = await retro.disco.lerAtalho(rel).catch(() => null);
    const { programaDe } = await import('./barra.js');
    const p = chave && programaDe(chave);
    if (p) return p.abrir();
    const { erro } = await import('./dialogos.js');
    return erro(tr('O programa do atalho "{nome}" não está mais neste computador.', { nome: nome.replace(/\.atalho$/i, '') }));
  }
  // As pastas compactadas: o .zip abre como pasta no Explorador; o .tar só se extrai.
  if (!com && /\.(zip|tar|tgz|txz|tbz2?|tar\.(gz|xz|bz2))$/i.test(nome)) {
    const c = await import('./compactados.js');
    adicionarRecente(rel);
    return c.ehZip(nome) ? abrir('explorador', { pasta: c.pastaDoZip(rel) }) : c.abrirTar(rel);
  }
  // Os programas do DOS (o .com, o .bat e o .exe do DOS, pelo cabeçalho) abrem no DOS.
  if (!com && (/\.(com|bat)$/i.test(nome) || (/\.exe$/i.test(nome) && await retro.dos.tipo(rel).catch(() => null) === 'dos'))) {
    adicionarRecente(rel);
    return abrir('dos', { arquivo: rel });
  }
  // As imagens de disco do Mac (o .img fica de fora: é de muitos outros sistemas) abrem no Mac Plus.
  if (!com && /\.(dsk|image|dc42|diskcopy42|hfv)$/i.test(nome)) {
    adicionarRecente(rel);
    return abrir('mac', { arquivo: rel });
  }
  // No Linux, os programas e os instaladores do Windows abrem pelo WINE.
  if (!com && estado.config.plataforma === 'linux' && /\.(exe|msi)$/i.test(nome)) {
    adicionarRecente(rel);
    return import('./wine.js').then((m) => m.abrirComWine(rel));
  }
  const opcoes = programasPara(nome);
  const escolha = com || (opcoes[0] && opcoes[0].id);
  adicionarRecente(rel);
  if (escolha) return abrir(escolha, { arquivo: rel });
  const { mensagem } = await import('./dialogos.js');
  const sug = sugestoesPara(nome);
  const botoes = [];
  if (sug.length) botoes.push({ texto: tr('Instalar o {programa}', { programa: sug[0].nome }), valor: 'instalar', padrao: true });
  botoes.push({ texto: tr('Abrir no computador principal'), valor: 'fora', padrao: !sug.length });
  botoes.push({ texto: tr('Cancelar'), valor: null });
  const v = await mensagem({
    titulo: tr('Abrir com'),
    tipo: 'pergunta',
    texto: tr('Nenhum programa do Retro Computer abre o arquivo "{nome}".', { nome }) + '\n\n' + (sug.length ? tr('O {programa} abre esse tipo de arquivo e pode ser instalado agora.', { programa: sug[0].nome }) : tr('Você pode abri-lo com um programa do computador principal.')),
    botoes,
  });
  if (v === 'instalar') abrir('programas', { instalar: sug[0].id, depois: rel });
  else if (v === 'fora') abrirNoComputador(rel).catch(() => { });
}

/**
 * Abre o arquivo com o programa do computador principal. Um programa, um instalador ou um roteiro
 * roda direto lá, fora do Retro Computer: antes, a pergunta (com o Cancelar como padrão).
 */
export async function abrirNoComputador(rel) {
  const nome = nomeDe(rel);
  if (EXECUTAVEIS.test(nome)) {
    const { mensagem } = await import('./dialogos.js');
    const v = await mensagem({
      titulo: tr('Abrir no computador principal'),
      tipo: 'aviso',
      texto: tr('"{nome}" é um programa ou um roteiro: ele roda direto no computador principal, fora do Retro Computer, com acesso aos seus arquivos.\n\nAbra só se você confia em quem o fez. Os arquivos baixados da internet são os mais perigosos.', { nome }),
      botoes: [{ texto: tr('Abrir mesmo assim'), valor: true }, { texto: tr('Cancelar'), valor: false, padrao: true }],
    });
    if (v !== true) return false;
  }
  await retro.disco.abrirFora(rel);
  return true;
}

/* ---------- Documentos recentes ---------- */

export function adicionarRecente(rel) {
  // Painel › Barra de tarefas e menu Iniciar › Guardar os documentos abertos recentemente.
  if (estado.config.iniciar && estado.config.iniciar.recentes === false) return;
  const lista = [rel, ...(estado.config.recentes || []).filter((r) => r !== rel)].slice(0, 15);
  definirConfig({ recentes: lista }).catch(() => { });
}

/* ---------- Avisos (o balão perto do relógio) ---------- */

let balao = null;

// As notificações da sessão (o sino da bandeja): as mais novas primeiro, até 50.
export const avisos = { lista: [], naoLidos: 0 };
let numeroAviso = 0;

/** Tira uma notificação da lista (depois de clicada) ou todas (sem id). */
export function esquecerAviso(id) {
  avisos.lista = id == null ? [] : avisos.lista.filter((a) => a.id !== id);
  if (id == null) avisos.naoLidos = 0;
  eventos.emit('avisos', avisos);
}

export function avisosLidos() {
  if (!avisos.naoLidos) return;
  avisos.naoLidos = 0;
  eventos.emit('avisos', avisos);
}

/**
 * O balão perto do relógio, guardado também nas notificações do sino.
 * Com "Não perturbe", fica só no sino (sem balão nem som).
 */
export function avisar(titulo, texto, { icone = 'msg-info', ms = 6000, som = 'info', aoClicar, guardar = true, sempre = false } = {}) {
  const id = ++numeroAviso;
  if (guardar) {
    avisos.lista = [{ id, titulo: String(titulo), texto: String(texto ?? ''), icone, aoClicar, em: Date.now() }, ...avisos.lista].slice(0, 50);
    avisos.naoLidos++;
    eventos.emit('avisos', avisos);
  }
  const clicar = () => { esquecerAviso(id); if (aoClicar) aoClicar(); };
  // O que responde a um clique do usuário (sempre) aparece mesmo com o "Não perturbe".
  if (naoPerturbeAgora() && !sempre) return;
  if (balao) balao.remove();
  // Os ícones das caixas de mensagem só existem em 32 pontos; os outros vão no tamanho da bandeja.
  balao = h('div.aviso-balao', img(icone, icone.startsWith('msg-') ? 32 : 16), h('div', h('b', titulo), texto));
  if (aoClicar) {
    balao.style.cursor = 'pointer';
    balao.addEventListener('click', () => { balao.remove(); clicar(); });
  }
  document.getElementById('tela').append(balao);
  if (som) tocar(som);
  const este = balao;
  setTimeout(() => { if (balao === este) { este.remove(); balao = null; } }, ms);
}

export function avisarRecebido(rel) {
  avisar(tr('Arquivo recebido'), `${caminhoTela(rel)}`, { aoClicar: () => abrir('explorador', { pasta: rel.split('/').slice(0, -1).join('/'), selecionar: rel }) });
}
