/*
 * O lado da área de trabalho do servidor MCP (src/principal/mcp.js): o Claude do Prompt pede pelo
 * processo principal, e o que só a área de trabalho sabe fazer é resolvido aqui (os programas,
 * os atalhos, os avisos e o estado das janelas). As configurações mudadas pelo Claude também
 * chegam aqui, para valer na hora.
 */
import { estado, abrir, avisar, eventos, carregarConfig, atualizarProgramas } from './sistema.js';
import { lista as janelas } from './janelas.js';
import { aplicarFundo, aplicarEscala } from './aparencia.js';
import { programaDe, programasFixaveis, fixar, desafixar, estaFixado, fixarNoIniciar, desafixarDoIniciar } from './barra.js';
import { naMesa, adicionarAtalho, removerAtalho, atualizar as atualizarMesa } from './mesa.js';
import { tr, localidade } from './idioma.js';
import { carregarAgenda, alterarAgenda, ocorrenciasEntre, arquivoAgenda } from './agenda.js';
import { paraData, dataTexto, dataHoraTexto, novoUid } from './ics.js';

/** O programa pelo identificador (embutido, Craft, site ou do computador principal), ou um erro claro. */
function programa(chave) {
  const p = programaDe(String(chave || ''));
  if (!p) throw new Error(tr('Programa desconhecido: {programa}. Veja listar_programas.', { programa: chave }));
  return p;
}

const FERRAMENTAS = {
  estado: () => ({
    janelasAbertas: janelas.filter((j) => !j.fechada).map((j) => j.titulo),
    areaDeTrabalho: (estado.config.mesa && estado.config.mesa.atalhos) || [],
    barra: (estado.config.barra && estado.config.barra.fixados) || [],
    iniciar: (estado.config.iniciar && estado.config.iniciar.fixados) || [],
  }),

  listar_programas: () => ({
    embutidos: [...programasFixaveis(), ...['explorador', 'localizar', 'executar', 'ajuda', 'antivirus'].map((k) => programaDe(k)).filter(Boolean)]
      .filter((p, i, l) => l.findIndex((x) => x.chave === p.chave) === i)
      .map((p) => ({ id: p.chave, nome: p.nome, naAreaDeTrabalho: naMesa(p.chave), naBarra: estaFixado(p.chave) })),
    catalogo: (estado.catalogo || []).map((p) => ({ id: p.id, nome: p.nome, instalado: !!p.instalado, descricao: p.descricao && (p.descricao['pt-BR'] || p.descricao.en) })),
  }),

  abrir_programa: async ({ programa: chave, arquivo }) => {
    const p = programa(chave);
    if (arquivo) await abrir(p.chave, { arquivo: String(arquivo).replace(/^[a-z]:[\\/]?/i, '').replace(/\\/g, '/') });
    else await p.abrir();
    return { aberto: p.nome };
  },

  atalho: async ({ programa: chave, onde, acao }) => {
    const p = programa(chave);
    const por = acao !== 'tirar';
    if (onde === 'area_de_trabalho') await (por ? adicionarAtalho(p.chave) : removerAtalho(p.chave));
    else if (onde === 'barra') await (por ? fixar(p.chave) : desafixar(p.chave));
    else if (onde === 'iniciar') await (por ? fixarNoIniciar(p.chave) : desafixarDoIniciar(p.chave));
    else throw new Error(tr('Onde: "area_de_trabalho", "barra" ou "iniciar".'));
    return { programa: p.nome, onde, acao: por ? 'por' : 'tirar' };
  },

  avisar: ({ titulo, texto }) => {
    avisar(String(titulo || 'Retro Computer'), String(texto || ''), { icone: 'logo' });
    return { avisado: true };
  },

  agenda_ver: async ({ de, dias }) => {
    await carregarAgenda();
    const ini = paraData(de) || new Date();
    const inicio = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate());
    const n = Math.max(1, Math.min(90, Math.round(Number(dias) || 7)));
    const lista = ocorrenciasEntre(inicio, new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + n)).slice(0, 500);
    return {
      arquivo: 'C:\\' + arquivoAgenda().replace(/\//g, '\\'),
      eventos: lista.map((o) => ({
        titulo: o.evento.titulo, inicio: o.evento.diaTodo ? dataTexto(o.inicio) : dataHoraTexto(o.inicio), fim: o.evento.diaTodo ? dataTexto(o.fim) : dataHoraTexto(o.fim),
        diaTodo: o.evento.diaTodo, local: o.evento.local || undefined, repete: o.evento.repetir ? o.evento.repetir.freq : undefined, lembrete: o.evento.lembrete ?? undefined,
      })),
    };
  },

  agenda_marcar: async ({ titulo, inicio, fim, local, descricao, lembrete, repetir }) => {
    const ini = paraData(inicio);
    if (!ini) throw new Error(tr('O começo precisa ser "AAAA-MM-DDTHH:MM" ou "AAAA-MM-DD".'));
    const diaTodo = String(inicio).length === 10;
    let f = fim ? paraData(fim) : null;
    if (fim && !f) throw new Error(tr('O fim precisa estar no mesmo formato do começo.'));
    if (!f) f = diaTodo ? new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 1) : new Date(ini.getTime() + 3600000);
    else if (diaTodo) f = new Date(f.getFullYear(), f.getMonth(), f.getDate() + 1); // o fim do dia todo é o dia seguinte, no .ics
    if (f < ini) throw new Error(tr('O fim vem antes do começo.'));
    const min = lembrete == null || lembrete === '' ? null : Math.round(Number(lembrete));
    if (min != null && !(min >= 0 && min <= 40320)) throw new Error(tr('O lembrete vai de 0 a 40320 minutos (28 dias) antes.'));
    if (repetir && !['diaria', 'semanal', 'mensal', 'anual'].includes(repetir)) throw new Error(tr('A repetição é "diaria", "semanal", "mensal" ou "anual".'));
    const ev = {
      uid: novoUid(), titulo: String(titulo || '').trim().slice(0, 500) || tr('(Sem título)'), local: String(local || '').slice(0, 500), descricao: String(descricao || '').slice(0, 10000),
      inicio: diaTodo ? dataTexto(ini) : dataHoraTexto(ini), fim: diaTodo ? dataTexto(f) : dataHoraTexto(f), diaTodo, lembrete: min,
      repetir: repetir ? { freq: repetir, intervalo: 1 } : null, excecoes: [], recorrencia: null, extra: [],
    };
    await alterarAgenda((lista) => [...lista, ev]);
    const quando = diaTodo ? ini.toLocaleDateString(localidade(), { weekday: 'long', day: 'numeric', month: 'long' }) : ini.toLocaleString(localidade(), { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    avisar(tr('Evento marcado na Agenda'), `${ev.titulo} · ${quando}`, { icone: 'calendario', aoClicar: () => abrir('agenda', { dia: dataTexto(ini), evento: ev.uid }) });
    return { marcado: { titulo: ev.titulo, inicio: ev.inicio, fim: ev.fim, lembrete: min } };
  },

  programasMudaram: () => atualizarProgramas().then(() => true),
};

export function iniciarMcp() {
  retro.mcp.aoPedido(async ({ id, nome, args }) => {
    let r;
    try {
      if (!FERRAMENTAS[nome]) throw new Error('?');
      r = { valor: await FERRAMENTAS[nome](args || {}) };
    } catch (e) {
      r = { erro: e.message || String(e) };
    }
    retro.mcp.responder(id, r).catch(() => { });
  });
  // As configurações que o Claude mudou valem na hora (o fundo, a escala, a barra, os sons…).
  retro.mcp.aoMudarConfig(async (parte) => {
    await carregarConfig();
    if (parte.papel) aplicarFundo(estado.config.papel);
    if (parte.escala) await aplicarEscala(estado.config.escala);
    if (parte.mesa) atualizarMesa();
    eventos.emit('config', estado.config, parte);
  });
}
