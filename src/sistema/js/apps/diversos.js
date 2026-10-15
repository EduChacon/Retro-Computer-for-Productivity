/* Executar, Localizar e Desligar. */
import { h, img, caminhoTela, caminhoInterno, tipoDe, nomeDe, paiDe, tamanho, dataHora, rotulo } from '../util.js';
import { Janela, lista as janelas } from '../janelas.js';
import { VistaIcones } from '../vista.js';
import { abrirMenu } from '../menus.js';
import { registrarApp, estado, abrir, abrirArquivo, definirConfig } from '../sistema.js';
import { ajustarAoConteudo, erro } from '../dialogos.js';
import { menuDeItens } from '../arquivos.js';
import { tocar } from '../sons.js';

/* ---------- Executar ---------- */

const NOMES = {
  bloco: 'bloco', notepad: 'bloco', 'bloco de notas': 'bloco', notas: 'bloco',
  cmd: 'prompt', prompt: 'prompt', terminal: 'prompt', command: 'prompt', shell: 'prompt',
  claude: 'claude',
  painel: 'painel', control: 'painel', 'painel de controle': 'painel',
  explorer: 'explorador', explorador: 'explorador', 'meu computador': 'explorador',
  programas: 'programas', foco: 'foco', pomodoro: 'foco', ajuda: 'ajuda', help: 'ajuda',
  lixeira: 'lixeira', localizar: 'localizar',
};

function abrirExecutar() {
  const j = new Janela({ titulo: 'Executar', dialogo: true, largura: 380, altura: 170 });
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
    h('div.mensagem', img('executar', 32), h('div.texto', 'Digite o nome de um programa, pasta, documento ou endereço da internet, e o Retro Computer o abrirá para você.')),
    h('div.linha', h('span', rotulo('&Abrir:')), campo, lista),
    h('div.acoes.direita', ok, h('button', { on: { click: () => j.fechar() } }, 'Cancelar'), h('button', { on: { click: () => j.fechar() } }, rotulo('&Procurar...'))),
  );
  // "Procurar" abre a caixa Abrir do disco.
  j.corpo.querySelector('.acoes').lastChild.onclick = async () => {
    const { caixaArquivo } = await import('../dialogos.js');
    const rel = await caixaArquivo({ modo: 'abrir', titulo: 'Procurar', pasta: 'Meus documentos' });
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
    await retro.sistema.abrirLink(/^www\./i.test(t) ? 'https://' + t : t);
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
    await erro(`Não foi possível encontrar "${t}". Verifique se o nome foi digitado corretamente e tente novamente.`, t);
    return false;
  }
}

/* ---------- Localizar ---------- */

function abrirLocalizar(args = {}) {
  const aberta = janelas.find((j) => j.id === 'localizar');
  if (aberta) return aberta.focar();
  const j = new Janela({ id: 'localizar', titulo: 'Localizar: Todos os arquivos', icone: 'localizar', largura: 520, altura: 380, status: ['Digite parte do nome e clique em Localizar agora.'] });
  const nome = h('input', { type: 'text', spellcheck: false, style: { flex: '1' }, value: args.termo || '' });
  const onde = h('input', { type: 'text', value: caminhoTela(args.pasta || ''), style: { flex: '1' } });
  const btLocalizar = h('button.padrao', 'Localizar agora');
  const btNova = h('button', 'Nova pesquisa');
  const area = h('div.lista-arquivos', { style: { flex: '1', marginTop: '8px' } });
  j.corpo.style.padding = '8px';
  j.corpo.append(
    h('div', { style: { display: 'flex', gap: '10px' } },
      h('fieldset', { style: { flex: '1', margin: '0' } }, h('legend', 'Nome e local'),
        h('div.linha', h('span', { style: { width: '50px' } }, rotulo('&Nome:')), nome),
        h('div.linha', h('span', { style: { width: '50px' } }, rotulo('&Examinar:')), onde)),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px' } }, btLocalizar, btNova, img('localizar', 32, { style: { margin: '6px auto 0' } }))),
    area,
  );
  const vista = new VistaIcones(area, {
    modo: 'detalhes',
    colunas: ['Nome', 'Pasta', 'Tamanho', 'Modificado'],
    aoAbrir: (it) => (it.pasta ? abrir('explorador', { pasta: it.rel }) : abrirArquivo(it.rel)),
    aoMenu: (sel, e) => { if (sel.length) abrirMenu([{ rotulo: 'Abrir a &pasta', acao: () => abrir('explorador', { pasta: paiDe(sel[0].rel), selecionar: sel[0].rel }) }, { separador: true }, ...menuDeItens(sel)], { x: e.clientX, y: e.clientY }); },
  });
  const localizar = async () => {
    btLocalizar.disabled = true;
    j.definirStatus(['Procurando…']);
    try {
      const achados = await retro.disco.buscar(nome.value.trim(), { pasta: caminhoInterno(onde.value) });
      vista.desenhar(achados.map((f) => {
        const t = tipoDe(f.nome, f.pasta);
        return { chave: f.rel, rotulo: f.nome, icone: t.icone, rel: f.rel, nome: f.nome, pasta: f.pasta, colunas: [caminhoTela(paiDe(f.rel)), f.pasta ? '' : tamanho(f.tamanho), dataHora(f.modificado)] };
      }));
      j.definirStatus([`${achados.length} arquivo(s) encontrado(s)`]);
    } catch (e) {
      erro(e.message, 'Localizar');
    } finally {
      btLocalizar.disabled = false;
    }
  };
  btLocalizar.addEventListener('click', localizar);
  nome.addEventListener('keydown', (e) => { if (e.key === 'Enter') localizar(); });
  btNova.addEventListener('click', () => { nome.value = ''; vista.desenhar([]); nome.focus(); j.definirStatus(['Digite parte do nome e clique em Localizar agora.']); });
  nome.focus();
  if (args.termo) localizar();
}

/* ---------- Desligar ---------- */

async function abrirDesligar() {
  if (document.querySelector('.escurecer')) return;
  const escuro = h('div.escurecer');
  document.getElementById('camada-modal').append(escuro);
  const j = new Janela({ titulo: 'Desligar o computador', dialogo: true, largura: 380, altura: 200, aoFechar: () => escuro.remove() });
  const r1 = h('input', { type: 'radio', name: 'desligar', checked: true });
  const r2 = h('input', { type: 'radio', name: 'desligar' });
  const r3 = h('input', { type: 'radio', name: 'desligar' });
  const sim = h('button.padrao', rotulo('&Sim'));
  j.corpo.append(
    h('div.mensagem', img('desligar', 32), h('div', { style: { paddingTop: '4px' } },
      h('div', { style: { marginBottom: '10px' } }, 'Deseja:'),
      h('div', { style: { marginBottom: '6px' } }, h('label', r1, h('span', rotulo('&Desligar o computador?')))),
      h('div', { style: { marginBottom: '6px' } }, h('label', r2, h('span', rotulo('&Reiniciar o computador?')))),
      h('div', h('label', r3, h('span', rotulo('Sair da &tela cheia?')))),
    )),
    h('div.acoes', sim, h('button', { on: { click: () => j.fechar() } }, rotulo('&Não')), h('button', { on: { click: () => { j.fechar(); abrir('ajuda', { topico: 'desligar' }); } } }, rotulo('&Ajuda'))),
  );
  sim.addEventListener('click', async () => {
    j.fechar(true);
    escuro.remove();
    if (r3.checked) return retro.sistema.telaCheia(false);
    if (!(await fecharTudo())) return;
    if (r2.checked) return reiniciar();
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

async function desligar() {
  const boot = document.getElementById('boot');
  boot.replaceChildren(h('div.aguarde', h('div', 'Aguarde enquanto o computador é desligado…')));
  boot.classList.add('visivel');
  tocar('desligar');
  await new Promise((r) => setTimeout(r, 1800));
  boot.replaceChildren(h('div.desligado', h('div', 'Agora você pode desligar', h('br'), 'o computador com segurança.')));
  await new Promise((r) => setTimeout(r, 1400));
  retro.sistema.desligar();
}

async function reiniciar() {
  const boot = document.getElementById('boot');
  boot.replaceChildren(h('div.aguarde', h('div', 'Reiniciando…')));
  boot.classList.add('visivel');
  await new Promise((r) => setTimeout(r, 900));
  retro.sistema.reiniciar();
}

registrarApp('executar', { nome: 'Executar', icone: 'executar', abrir: abrirExecutar });
registrarApp('localizar', { nome: 'Localizar', icone: 'localizar', abrir: abrirLocalizar });
registrarApp('desligar', { nome: 'Desligar', icone: 'desligar', abrir: abrirDesligar });

export { nomeDe };
