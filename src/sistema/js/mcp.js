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
import { tr } from './idioma.js';

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
    avisar(String(titulo || tr('Claude')), String(texto || ''), { icone: 'claude' });
    return { avisado: true };
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
