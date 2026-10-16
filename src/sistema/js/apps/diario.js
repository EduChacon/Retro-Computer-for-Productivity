/*
 * O Diário de trabalho: os dias registrados (um .txt por dia, em Meus documentos › Diário de
 * trabalho), a opção de anotar sozinho os focos concluídos e os arquivos alterados, e as notas
 * escritas na hora. Abrir um dia o mostra no Bloco de notas.
 */
import { h, img, rotulo } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, estado, definirConfig, abrir, abrirArquivo } from '../sistema.js';
import { ajustarAoConteudo, entrada, erro } from '../dialogos.js';
import { tr, localidade } from '../idioma.js';

let aberta = null;

/** "2026-10-16.txt" → "sexta-feira, 16 de outubro de 2026" (ou o nome, se não for um dia). */
function nomeDoDia(nome) {
  const m = /^(\d{4})-(\d{2})-(\d{2})\.txt$/.exec(nome);
  if (!m) return nome;
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(localidade(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

async function abrirDiario() {
  if (aberta) return aberta.focar();
  const { pasta } = await retro.diario.pasta();
  const ligado = h('input', { type: 'checkbox', checked: !!(estado.config.diario || {}).ligado });
  const lista = h('select.diario-lista', { size: 9 });
  const j = new Janela({ id: 'diario', titulo: tr('Diário de trabalho'), icone: 'diario', largura: 440, altura: 360, redimensionavel: false, maximizavel: false });
  aberta = j;
  j.ev.on('fechada', () => { aberta = null; });

  const ler = async () => {
    const itens = await retro.disco.listar(pasta).catch(() => []);
    const dias = itens.filter((i) => !i.pasta && /\.txt$/i.test(i.nome)).sort((a, b) => b.nome.localeCompare(a.nome));
    lista.replaceChildren(...dias.map((d) => h('option', { value: d.rel }, nomeDoDia(d.nome))));
    if (!dias.length) lista.append(h('option', { disabled: true }, tr('Nenhum dia registrado ainda.')));
    else lista.selectedIndex = 0;
  };
  const abrirDia = (rel) => { if (rel) abrirArquivo(rel); };
  const nota = async () => {
    const texto = await entrada({ titulo: tr('Diário de trabalho'), icone: 'diario', larg: 400, texto: tr('A nota, com a hora de agora, vai para o diário de hoje:') });
    if (!texto || !texto.trim()) return;
    const ok = await retro.diario.anotar(texto.trim(), { sempre: true }).catch(() => false);
    if (!ok) erro(tr('Não foi possível escrever no diário.'));
    await ler();
  };
  ligado.addEventListener('change', () => definirConfig({ diario: { ligado: ligado.checked } }));
  lista.addEventListener('dblclick', () => abrirDia(lista.value));
  lista.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); abrirDia(lista.value); } });

  j.corpo.style.padding = '8px';
  j.corpo.append(
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' } }, img('diario', 32),
      h('div', { style: { lineHeight: '13px' } }, tr('Um arquivo de texto por dia, com a hora de cada foco concluído, de cada arquivo alterado e das suas notas. O diário só acrescenta linhas: o que você escrever nele fica.'))),
    h('fieldset', { style: { margin: '0 0 8px' } }, h('legend', tr('Anotar sozinho')),
      h('label', ligado, h('span', tr('Os focos concluídos e os arquivos alterados (a primeira vez no dia)')))),
    h('div', rotulo(tr('&Dias registrados:'))),
    lista,
    h('div.acoes', { style: { marginTop: '8px' } },
      h('button.padrao', { type: 'button', on: { click: () => abrirDia(lista.value || null) } }, rotulo(tr('&Abrir'))),
      h('button', { type: 'button', on: { click: async () => { abrirDia(await retro.diario.hoje()); await ler(); } } }, rotulo(tr('&Hoje'))),
      h('button', { type: 'button', on: { click: nota } }, rotulo(tr('&Escrever uma nota…'))),
      h('button', { type: 'button', on: { click: () => abrir('explorador', { pasta }) } }, rotulo(tr('Abrir a &pasta')))));
  await ler();
  ajustarAoConteudo(j, { largura: 440 });
  lista.focus();
  return j;
}

registrarApp('diario', { nome: 'Diário de trabalho', icone: 'diario', abrir: abrirDiario });
