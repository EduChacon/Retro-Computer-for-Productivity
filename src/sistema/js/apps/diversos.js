/* Executar, Localizar e Desligar. */
import { h, img, caminhoTela, caminhoInterno, tipoDe, nomeDe, paiDe, tamanho, dataHora, rotulo } from '../util.js';
import { Janela, lista as janelas } from '../janelas.js';
import { VistaIcones } from '../vista.js';
import { abrirMenu } from '../menus.js';
import { registrarApp, estado, abrir, abrirArquivo, definirConfig, pastaDocs, abrirEndereco } from '../sistema.js';
import { ajustarAoConteudo, erro, confirmar } from '../dialogos.js';
import { menuDeItens } from '../arquivos.js';
import { tocar } from '../sons.js';
import { tr } from '../idioma.js';
import { variosPerfis } from '../perfis.js';
import { prepararParaSair, desistirDeSair } from '../reabrir.js';

/* ---------- Executar ---------- */

// Os nomes que o Executar entende (nos três idiomas).
const NOMES = {
  bloco: 'bloco', notepad: 'bloco', 'bloco de notas': 'bloco', notas: 'bloco', 'bloc de notas': 'bloco',
  cmd: 'prompt', prompt: 'prompt', terminal: 'prompt', command: 'prompt', shell: 'prompt',
  claude: 'claude',
  painel: 'painel', control: 'painel', 'painel de controle': 'painel', 'control panel': 'painel', 'panel de control': 'painel',
  explorer: 'explorador', explorador: 'explorador', 'meu computador': 'explorador', computer: 'explorador', 'mi computadora': 'explorador',
  programas: 'programas', programs: 'programas', foco: 'foco', focus: 'foco', pomodoro: 'foco', ajuda: 'ajuda', help: 'ajuda', ayuda: 'ajuda',
  lixeira: 'lixeira', trash: 'lixeira', papelera: 'lixeira', localizar: 'localizar', find: 'localizar', buscar: 'localizar',
  calc: 'calculadora', calculadora: 'calculadora', calculator: 'calculadora',
  paciencia: 'paciencia', 'paciência': 'paciencia', solitaire: 'paciencia', solitario: 'paciencia', 'solitário': 'paciencia',
  'campo minado': 'campo-minado', minesweeper: 'campo-minado', buscaminas: 'campo-minado', winmine: 'campo-minado', breakout: 'breakout',
  navegador: 'navegador', browser: 'navegador', internet: 'navegador', iexplore: 'navegador', 'e-mail': 'correio', email: 'correio', correo: 'correio',
};

function abrirExecutar() {
  const j = new Janela({ titulo: tr('Executar'), dialogo: true, largura: 380, altura: 170 });
  const historico = (estado.config.executar || []).slice(0, 10);
  const campo = h('input', { type: 'text', value: historico[0] || '', spellcheck: false, list: 'executar-hist', style: { flex: '1' } });
  const lista = h('datalist#executar-hist', historico.map((x) => h('option', { value: x })));
  const ok = h('button.padrao', 'OK');
  const executar = async () => {
    const t = campo.value.trim();
    if (!t) return;
    const feito = await rodar(t);
    if (feito) {
      definirConfig({ executar: [t, ...historico.filter((x) => x !== t)].slice(0, 10) }).catch(() => { });
      j.fechar(true);
    }
  };
  ok.addEventListener('click', executar);
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); executar(); } });
  j.corpo.append(
    h('div.mensagem', img('executar', 32), h('div.texto', tr('Digite o nome de um programa, pasta, documento ou endereço da internet, e o Retro Computer o abrirá para você.'))),
    h('div.linha', h('span', rotulo(tr('&Abrir:'))), campo, lista),
    h('div.acoes.direita', ok, h('button', { on: { click: () => j.fechar() } }, tr('Cancelar')), h('button', { on: { click: () => j.fechar() } }, rotulo(tr('&Procurar...')))),
  );
  // "Procurar" abre a caixa Abrir do disco.
  j.corpo.querySelector('.acoes').lastChild.onclick = async () => {
    const { caixaArquivo } = await import('../dialogos.js');
    const rel = await caixaArquivo({ modo: 'abrir', titulo: tr('Procurar'), pasta: pastaDocs() });
    if (rel) { campo.value = caminhoTela(rel); campo.focus(); }
  };
  ajustarAoConteudo(j, { minLarg: 380 });
  campo.focus();
  campo.select();
}

async function rodar(texto) {
  const t = texto.trim();
  const baixo = t.toLowerCase().replace(/\.exe$/, '');
  if (/^https?:\/\//i.test(t) || /^www\./i.test(t)) {
    await abrirEndereco(/^www\./i.test(t) ? 'https://' + t : t);
    return true;
  }
  if (NOMES[baixo]) { abrir(NOMES[baixo]); return true; }
  const prog = estado.instalados.find((p) => p.id === baixo || p.nome.toLowerCase() === baixo);
  if (prog) { abrir('craft:' + prog.id); return true; }
  const rel = caminhoInterno(t);
  try {
    const info = await retro.disco.info(rel);
    if (info.pasta) abrir('explorador', { pasta: rel });
    else abrirArquivo(rel);
    return true;
  } catch {
    await erro(tr('Não foi possível encontrar "{nome}". Verifique se o nome foi digitado corretamente e tente novamente.', { nome: t }), t);
    return false;
  }
}

/* ---------- Localizar ---------- */

function abrirLocalizar(args = {}) {
  const aberta = janelas.find((j) => j.id === 'localizar');
  if (aberta) return aberta.focar();
  const j = new Janela({ id: 'localizar', titulo: tr('Localizar: Todos os arquivos'), icone: 'localizar', largura: 560, altura: 400, status: [tr('Digite parte do nome ou do texto e clique em Localizar agora.')] });
  const nome = h('input', { type: 'text', spellcheck: false, style: { flex: '1' }, value: args.termo || '' });
  const onde = h('input', { type: 'text', value: caminhoTela(args.pasta || ''), style: { flex: '1' } });
  // Contendo o texto: a busca pelo conteúdo (o índice do processo principal).
  const texto = h('input', { type: 'text', spellcheck: false, style: { flex: '1' }, value: args.texto || '' });
  const btLocalizar = h('button.padrao', tr('Localizar agora'));
  const btNova = h('button', tr('Nova pesquisa'));
  const area = h('div.lista-arquivos', { style: { flex: '1', marginTop: '8px' } });
  j.corpo.style.padding = '8px';
  j.corpo.append(
    h('div', { style: { display: 'flex', gap: '10px' } },
      h('fieldset', { style: { flex: '1', margin: '0' } }, h('legend', tr('Nome e local')),
        h('div.linha', h('span', { style: { width: '70px', flex: 'none' } }, rotulo(tr('&Nome:'))), nome),
        h('div.linha', h('span', { style: { width: '70px', flex: 'none' } }, rotulo(tr('&Examinar:'))), onde),
        h('div.linha', h('span', { style: { width: '70px', flex: 'none' } }, rotulo(tr('&Contendo:'))), texto)),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px' } }, btLocalizar, btNova, img('localizar', 32, { style: { margin: '6px auto 0' } }))),
    area,
  );
  const vista = new VistaIcones(area, {
    modo: 'detalhes',
    colunas: [tr('Nome'), tr('Pasta'), tr('Tamanho'), tr('Modificado')],
    aoAbrir: (it) => (it.pasta ? abrir('explorador', { pasta: it.rel }) : abrirArquivo(it.rel)),
    aoMenu: (sel, e) => { if (sel.length) abrirMenu([{ rotulo: tr('Abrir a &pasta'), acao: () => abrir('explorador', { pasta: paiDe(sel[0].rel), selecionar: sel[0].rel }) }, { separador: true }, ...menuDeItens(sel)], { x: e.clientX, y: e.clientY }); },
  });
  const localizar = async () => {
    btLocalizar.disabled = true;
    j.definirStatus([tr('Procurando…')]);
    try {
      const pasta = caminhoInterno(onde.value);
      const conteudo = texto.value.trim();
      if (conteudo) {
        // Pelo conteúdo (e, com um nome, só os que também têm o nome).
        const parte = nome.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const achados = (await retro.indice.buscar(conteudo, { pasta, max: 200 }))
          .filter((f) => !parte || f.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(parte));
        vista.o.colunas = [tr('Nome'), tr('Pasta'), tr('Trecho'), tr('Modificado')];
        vista.desenhar(achados.map((f) => ({
          chave: f.rel, rotulo: f.nome, icone: tipoDe(f.nome, false).icone, rel: f.rel, nome: f.nome, pasta: false,
          colunas: [caminhoTela(paiDe(f.rel)), f.trecho.length > 90 ? f.trecho.slice(0, 89) + '…' : f.trecho, dataHora(f.modificado)],
        })));
        const est = await retro.indice.estado().catch(() => null);
        j.definirStatus([est && !est.ligado ? tr('A busca pelo conteúdo está desligada (Painel de controle › Disco C:).')
          : est && est.faltam ? tr('{n} arquivo(s) encontrado(s). O índice ainda está lendo {f} arquivo(s).', { n: achados.length, f: est.faltam })
            : tr('{n} arquivo(s) encontrado(s)', { n: achados.length })]);
        return;
      }
      const achados = await retro.disco.buscar(nome.value.trim(), { pasta });
      vista.o.colunas = [tr('Nome'), tr('Pasta'), tr('Tamanho'), tr('Modificado')];
      vista.desenhar(achados.map((f) => {
        const t = tipoDe(f.nome, f.pasta);
        return { chave: f.rel, rotulo: f.nome, icone: t.icone, rel: f.rel, nome: f.nome, pasta: f.pasta, colunas: [caminhoTela(paiDe(f.rel)), f.pasta ? '' : tamanho(f.tamanho), dataHora(f.modificado)] };
      }));
      j.definirStatus([tr('{n} arquivo(s) encontrado(s)', { n: achados.length })]);
    } catch (e) {
      erro(e.message, tr('Localizar'));
    } finally {
      btLocalizar.disabled = false;
    }
  };
  btLocalizar.addEventListener('click', localizar);
  nome.addEventListener('keydown', (e) => { if (e.key === 'Enter') localizar(); });
  texto.addEventListener('keydown', (e) => { if (e.key === 'Enter') localizar(); });
  btNova.addEventListener('click', () => { nome.value = ''; texto.value = ''; vista.desenhar([]); nome.focus(); j.definirStatus([tr('Digite parte do nome ou do texto e clique em Localizar agora.')]); });
  nome.focus();
  if (args.termo || args.texto) localizar();
}

/* ---------- Desligar ---------- */

async function abrirDesligar(args = {}) {
  if (document.querySelector('.escurecer')) return;
  const escuro = h('div.escurecer');
  document.getElementById('camada-modal').append(escuro);
  const j = new Janela({ titulo: tr('Desligar o computador'), dialogo: true, largura: 380, altura: 200, aoFechar: () => escuro.remove() });
  // No modo sistema (a sessão "Retro Computer" do Linux), as opções valem para o computador inteiro.
  const sistema = !!(estado.config && estado.config.modoSistema);
  const opcoes = sistema
    ? [['desligar', tr('&Desligar o computador?')], ['reiniciar', tr('&Reiniciar o computador?')], ['suspender', tr('&Suspender o computador?')], ['sair', tr('Sair da s&essão (voltar à tela de entrada)?')]]
    : [['desligar', tr('&Desligar o computador?')], ['reiniciar', tr('&Reiniciar o computador?')], ['janela', tr('Sair da &tela cheia?')]];
  // Com mais de um usuário, a troca de usuário (como na época: fechar tudo e entrar como outro).
  if (variosPerfis() && !args.entrada) opcoes.splice(2, 0, ['logoff', tr('Fechar todos os programas e entrar como &outro usuário?')]);
  const radios = opcoes.map(([v], i) => h('input', { type: 'radio', name: 'desligar', checked: i === 0, value: v }));
  const sim = h('button.padrao', rotulo(tr('&Sim')));
  j.corpo.append(
    h('div.mensagem', img('desligar', 32), h('div', { style: { paddingTop: '4px' } },
      h('div', { style: { marginBottom: '10px' } }, tr('Deseja:')),
      ...opcoes.map(([, texto], i) => h('div', { style: { marginBottom: i < opcoes.length - 1 ? '6px' : '0' } }, h('label', radios[i], h('span', rotulo(texto))))),
    )),
    h('div.acoes', sim, h('button', { on: { click: () => j.fechar() } }, rotulo(tr('&Não'))), h('button', { on: { click: () => { j.fechar(); abrir('ajuda', { topico: 'desligar' }); } } }, rotulo(tr('&Ajuda')))),
  );
  sim.addEventListener('click', async () => {
    const escolha = (radios.find((r) => r.checked) || radios[0]).value;
    j.fechar(true);
    escuro.remove();
    if (escolha === 'janela') return retro.sistema.telaCheia(false);
    if (escolha === 'suspender') return suspender();
    // As janelas abertas voltam na próxima vez (reabrir.js): guardadas antes de cada uma fechar.
    await prepararParaSair();
    if (!(await fecharTudo())) { desistirDeSair(); return; }
    if (escolha === 'logoff') return sairDoUsuario();
    if (sistema) return energia(escolha);
    if (escolha === 'reiniciar') return reiniciar();
    desligar();
  });
  ajustarAoConteudo(j, { minLarg: 360 });
  sim.focus();
}

/** Pede a cada janela para fechar (os programas perguntam se há algo por salvar). */
async function fecharTudo() {
  for (const j of janelas.slice().reverse()) {
    if (j.dialogo) continue;
    j.focar();
    const ok = await j.fechar();
    if (!ok) return false;
  }
  return true;
}

/** O logoff: pergunta, fecha os programas (eles perguntam o que há por salvar) e volta à tela de entrada. */
async function fazerLogoff() {
  if (document.querySelector('.escurecer')) return;
  if (!(await confirmar(tr('Deseja realmente fazer logoff?'), { titulo: tr('Fazer logoff') }))) return;
  await prepararParaSair();
  if (!(await fecharTudo())) { desistirDeSair(); return; }
  sairDoUsuario();
}

async function sairDoUsuario() {
  const boot = document.getElementById('boot');
  boot.replaceChildren(h('div.aguarde', h('div', tr('Fazendo logoff…'))));
  boot.classList.add('visivel');
  tocar('desligar');
  await new Promise((r) => setTimeout(r, 1200));
  retro.perfis.logoff();
}

async function desligar() {
  const boot = document.getElementById('boot');
  boot.replaceChildren(h('div.aguarde', h('div', tr('Aguarde enquanto o computador é desligado…'))));
  boot.classList.add('visivel');
  tocar('desligar');
  await new Promise((r) => setTimeout(r, 1800));
  boot.replaceChildren(h('div.desligado', h('div', tr('Agora você pode desligar'), h('br'), tr('o computador com segurança.'))));
  await new Promise((r) => setTimeout(r, 1400));
  retro.sistema.desligar();
}

/** Suspende o computador (modo sistema): nada se fecha; a tela de bloqueio aparece na volta. */
async function suspender() {
  const r = await retro.sistema.energia('suspender').catch((e) => ({ ok: false, erro: e.message }));
  if (!r.ok) erro(tr('Não foi possível suspender o computador: {erro}', { erro: r.erro || '?' }));
}

/** Desliga, reinicia ou sai da sessão do Linux (modo sistema), com as telas da época no meio. */
async function energia(acao) {
  const boot = document.getElementById('boot');
  const texto = acao === 'reiniciar' ? tr('Reiniciando…') : acao === 'sair' ? tr('Saindo da sessão…') : tr('Aguarde enquanto o computador é desligado…');
  boot.replaceChildren(h('div.aguarde', h('div', texto)));
  boot.classList.add('visivel');
  if (acao === 'desligar') tocar('desligar');
  await new Promise((r) => setTimeout(r, acao === 'desligar' ? 1800 : 900));
  const r = await retro.sistema.energia(acao).catch((e) => ({ ok: false, erro: e.message }));
  if (r.ok) return;
  boot.classList.remove('visivel');
  boot.replaceChildren();
  erro(tr('O computador não respondeu ao pedido: {erro}', { erro: r.erro || '?' }));
}

async function reiniciar() {
  const boot = document.getElementById('boot');
  boot.replaceChildren(h('div.aguarde', h('div', tr('Reiniciando…'))));
  boot.classList.add('visivel');
  await new Promise((r) => setTimeout(r, 900));
  retro.sistema.reiniciar();
}

registrarApp('executar', { nome: 'Executar', icone: 'executar', abrir: abrirExecutar });
registrarApp('localizar', { nome: 'Localizar', icone: 'localizar', abrir: abrirLocalizar });
registrarApp('desligar', { nome: 'Desligar', icone: 'desligar', abrir: abrirDesligar });
registrarApp('logoff', { nome: 'Fazer logoff', icone: 'usuario', abrir: fazerLogoff });

export { nomeDe };
