'use strict';
/*
 * A ponte entre a área de trabalho e o processo principal: window.retro.
 * Cada função devolve o valor ou lança o erro com a mensagem em português.
 */
const { contextBridge, ipcRenderer, webUtils } = require('electron');

async function chamar(canal, ...args) {
  const r = await ipcRenderer.invoke(canal, ...args);
  if (r && r.ok) return r.valor;
  const e = new Error((r && r.erro) || 'Erro desconhecido.');
  if (r && r.codigo) e.codigo = r.codigo;
  throw e;
}

function ouvir(canal) {
  return (fn) => {
    const f = (_e, ...args) => fn(...args);
    ipcRenderer.on(canal, f);
    return () => ipcRenderer.removeListener(canal, f);
  };
}

contextBridge.exposeInMainWorld('retro', {
  config: {
    obter: () => chamar('config:obter'),
    definir: (parte) => chamar('config:definir', parte),
    gravarChave: (chave) => chamar('config:chave', chave),
  },
  disco: {
    raiz: () => chamar('disco:raiz'),
    listar: (rel, o) => chamar('disco:listar', rel, o),
    info: (rel) => chamar('disco:info', rel),
    existe: (rel) => chamar('disco:existe', rel),
    ler: (rel) => chamar('disco:ler', rel),
    lerTexto: (rel) => chamar('disco:lerTexto', rel),
    gravar: (rel, dados, o) => chamar('disco:gravar', rel, dados, o),
    criarPasta: (pai, nome) => chamar('disco:criarPasta', pai, nome),
    nomeLivre: (pai, nome) => chamar('disco:nomeLivre', pai, nome),
    renomear: (rel, nome) => chamar('disco:renomear', rel, nome),
    mover: (rel, destino) => chamar('disco:mover', rel, destino),
    copiar: (rel, destino) => chamar('disco:copiar', rel, destino),
    importar: (caminhos, destino) => chamar('disco:importar', caminhos, destino),
    paraLixeira: (rel) => chamar('disco:paraLixeira', rel),
    lixeira: () => chamar('disco:lixeira'),
    restaurar: (id) => chamar('disco:restaurar', id),
    apagarDaLixeira: (id) => chamar('disco:apagarDaLixeira', id),
    esvaziarLixeira: () => chamar('disco:esvaziarLixeira'),
    versoes: (rel) => chamar('disco:versoes', rel),
    restaurarVersao: (rel, id) => chamar('disco:restaurarVersao', rel, id),
    espaco: () => chamar('disco:espaco'),
    mostrar: (rel) => chamar('disco:mostrar', rel),
    abrirFora: (rel) => chamar('disco:abrirFora', rel),
    trocar: () => chamar('disco:trocar'),
    buscar: (termo, o) => chamar('disco:buscar', termo, o),
    exportar: (rels, onde) => chamar('disco:exportar', rels, onde),
    importarEscolhendo: (destino) => chamar('disco:importarEscolhendo', destino),
    aoMudar: ouvir('disco:mudou'),
    /** O caminho real de um arquivo arrastado do computador principal. */
    caminhoDe: (arquivo) => {
      try { return webUtils.getPathForFile(arquivo) || null; } catch { return null; }
    },
  },
  programas: {
    catalogo: () => chamar('programas:catalogo'),
    instalados: () => chamar('programas:instalados'),
    instalar: (id) => chamar('programas:instalar', id),
    instalarArquivo: () => chamar('programas:instalarArquivo'),
    remover: (id) => chamar('programas:remover', id),
    aoProgresso: ouvir('programas:progresso'),
  },
  terminal: {
    disponivel: () => chamar('terminal:disponivel'),
    criar: (o) => chamar('terminal:criar', o),
    escrever: (id, dados) => chamar('terminal:escrever', id, dados),
    redimensionar: (id, c, l) => chamar('terminal:redimensionar', id, c, l),
    fechar: (id) => chamar('terminal:fechar', id),
    acharClaude: () => chamar('terminal:acharClaude'),
    comandoInstalarClaude: () => chamar('terminal:instalarClaude'),
    aoDados: ouvir('terminal:dados'),
    aoSair: ouvir('terminal:saiu'),
  },
  sistema: {
    telaCheia: (v) => chamar('sistema:telaCheia', v),
    abrirLink: (url) => chamar('sistema:abrirLink', url),
    desligar: () => chamar('sistema:desligar'),
    reiniciar: () => chamar('sistema:reiniciar'),
    escalaTela: () => chamar('sistema:escalaTela'),
    zoom: (f) => chamar('sistema:zoom', f),
    aoTelaCheia: ouvir('sistema:telaCheia'),
    aoPedidoDesligar: ouvir('sistema:pedidoDesligar'),
    aoRecebido: ouvir('sistema:recebido'),
    aoLink: ouvir('sistema:link'),
  },
});
