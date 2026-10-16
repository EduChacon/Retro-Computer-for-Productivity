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
  tela: {
    modos: () => chamar('tela:modos'),
    definir: (saida, modo) => chamar('tela:definir', saida, modo),
    luzNoturna: (k) => chamar('tela:luzNoturna', k),
  },
  // O mouse e o touchpad (modo sistema, pelo xinput).
  mouse: {
    estado: () => chamar('mouse:estado'),
    aplicar: (escolhas) => chamar('mouse:aplicar', escolhas),
    configuracoesDoSistema: () => chamar('mouse:configuracoesDoSistema'),
  },
  // O histórico da área de transferência (só na memória do processo principal).
  transferencia: {
    listar: () => chamar('transferencia:listar'),
    usar: (id) => chamar('transferencia:usar', id),
    escrever: (texto) => chamar('transferencia:escrever', texto),
    colar: (id, nativa) => chamar('transferencia:colar', id, nativa || null),
    apagar: (id) => chamar('transferencia:apagar', id),
    fixar: (id, v) => chamar('transferencia:fixar', id, v),
    limpar: () => chamar('transferencia:limpar'),
    aoMudar: ouvir('transferencia:mudou'),
  },
  seguranca: {
    estado: () => chamar('seguranca:estado'),
  },
  firewall: {
    estado: () => chamar('firewall:estado'),
    definir: (ligar, senha) => chamar('firewall:definir', ligar, senha),
  },
  janelasLinux: {
    listar: () => chamar('janelasLinux:listar'),
    ativar: (id) => chamar('janelasLinux:ativar', id),
    minimizar: (id) => chamar('janelasLinux:minimizar', id),
    fechar: (id) => chamar('janelasLinux:fechar', id),
    encaixar: (id, seta) => chamar('janelasLinux:encaixar', id, seta),
    minimizarTodas: () => chamar('janelasLinux:minimizarTodas'),
    aoMudar: ouvir('janelasLinux:mudou'),
  },
  atualizacoesLinux: {
    listar: () => chamar('atualizacoesLinux:listar'),
    procurar: (senha) => chamar('atualizacoesLinux:procurar', senha),
    instalar: (senha) => chamar('atualizacoesLinux:instalar', senha),
    automaticas: (ligar, senha) => chamar('atualizacoesLinux:automaticas', ligar, senha),
    aoAndamento: ouvir('atualizacoesLinux:andamento'),
  },
  bluetooth: {
    estado: () => chamar('bluetooth:estado'),
    ligar: (v) => chamar('bluetooth:ligar', v),
    aparelhos: () => chamar('bluetooth:aparelhos'),
    procurar: () => chamar('bluetooth:procurar'),
    conectar: (mac) => chamar('bluetooth:conectar', mac),
    desconectar: (mac) => chamar('bluetooth:desconectar', mac),
    esquecer: (mac) => chamar('bluetooth:esquecer', mac),
    parear: (mac) => chamar('bluetooth:parear', mac),
    responder: (r) => chamar('bluetooth:responder', r),
    cancelar: () => chamar('bluetooth:cancelar'),
    configuracoesDoSistema: () => chamar('bluetooth:configuracoesDoSistema'),
    aoPergunta: ouvir('bluetooth:pergunta'),
  },
  impressoras: {
    listar: () => chamar('impressoras:listar'),
    padrao: (nome) => chamar('impressoras:padrao', nome),
    fila: (nome) => chamar('impressoras:fila', nome),
    cancelar: (id) => chamar('impressoras:cancelar', id),
    adicionar: () => chamar('impressoras:adicionar'),
    imprimir: (html, o) => chamar('impressoras:imprimir', html, o),
  },
  monitor: {
    amostra: () => chamar('monitor:amostra'),
    processos: () => chamar('monitor:processos'),
    finalizar: (pid, forcar) => chamar('monitor:finalizar', pid, forcar),
  },
  captura: {
    tirar: () => chamar('captura:tirar'),
    copiar: (png) => chamar('captura:copiar', png),
  },
  compactados: {
    listar: (rel) => chamar('compactados:listar', rel),
    extrair: (rel, o) => chamar('compactados:extrair', rel, o),
    compactar: (rels) => chamar('compactados:compactar', rels),
  },
  programas: {
    catalogo: () => chamar('programas:catalogo'),
    instalados: () => chamar('programas:instalados'),
    instalar: (id, opcoes) => chamar('programas:instalar', id, opcoes),
    instalarArquivo: () => chamar('programas:instalarArquivo'),
    remover: (id) => chamar('programas:remover', id),
    verificar: (id, o) => chamar('programas:verificar', id, o),
    verificarTodos: (o) => chamar('programas:verificarTodos', o),
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
    // O computador inteiro (modo sistema) e a abertura junto com ele.
    energia: (acao) => chamar('sistema:energia', acao),
    abrirAoEntrar: (ligar) => chamar('sistema:abrirAoEntrar', ligar),
    sessao: () => chamar('sistema:sessao'),
    entrarDireto: (ligar, senha) => chamar('sistema:entrarDireto', ligar, senha),
    aoTecla: ouvir('sistema:tecla'),
    teclado: (layout, variante) => chamar('sistema:teclado', layout, variante),
    reabrir: () => chamar('sistema:reabrir'),
    novaVersao: (forcar) => chamar('sistema:novaVersao', forcar),
    escalaTela: () => chamar('sistema:escalaTela'),
    zoom: (f) => chamar('sistema:zoom', f),
    aoTelaCheia: ouvir('sistema:telaCheia'),
    aoPedidoDesligar: ouvir('sistema:pedidoDesligar'),
    aoRecebido: ouvir('sistema:recebido'),
    aoLink: ouvir('sistema:link'),
    atualizacao: {
      info: () => chamar('atualizacao:info'),
      verificar: () => chamar('atualizacao:verificar'),
      baixar: () => chamar('atualizacao:baixar'),
      instalar: () => chamar('atualizacao:instalar'),
      aoMudar: ouvir('sistema:atualizacao'),
    },
  },
  nativos: {
    listar: (atualizar) => chamar('nativos:listar', atualizar),
    icone: (id) => chamar('nativos:icone', id),
    abrir: (id) => chamar('nativos:abrir', id),
  },
  // A loja dos programas do Linux (o Flathub).
  loja: {
    info: () => chamar('loja:info'),
    buscar: (o) => chamar('loja:buscar', o),
    detalhes: (id, idioma) => chamar('loja:detalhes', id, idioma),
    imagem: (url) => chamar('loja:imagem', url),
    instalados: () => chamar('loja:instalados'),
    atualizacoes: () => chamar('loja:atualizacoes'),
    instalar: (id) => chamar('loja:instalar', id),
    atualizar: (id) => chamar('loja:atualizar', id),
    remover: (id) => chamar('loja:remover', id),
    cancelar: () => chamar('loja:cancelar'),
    abrir: (id) => chamar('loja:abrir', id),
    aoAndamento: ouvir('loja:andamento'),
  },
  // Os pendrives e cartões de memória.
  unidades: {
    listar: () => chamar('unidades:listar'),
    pasta: (id, rel) => chamar('unidades:pasta', id, rel),
    montar: (id) => chamar('unidades:montar', id),
    ejetar: (id) => chamar('unidades:ejetar', id),
    trazer: (id, rels, destino) => chamar('unidades:trazer', id, rels, destino),
    levar: (id, rels, destino) => chamar('unidades:levar', id, rels, destino),
    aoMudar: ouvir('unidades:mudou'),
  },
  // A tela de bloqueio: a senha só é conferida aqui; o resumo dela nunca vem para a página.
  bloqueio: {
    conferir: (senha) => chamar('bloqueio:conferir', senha),
    definir: (atual, nova) => chamar('bloqueio:definir', atual, nova),
    aoBloquear: ouvir('bloqueio:bloquear'),
  },
  // A bandeja: o volume, o brilho e a rede do computador.
  bandeja: {
    bateria: () => chamar('bandeja:bateria'),
    aparelhos: () => chamar('bandeja:aparelhos'),
    volume: () => chamar('bandeja:volume'),
    definirVolume: (o) => chamar('bandeja:definirVolume', o),
    brilho: () => chamar('bandeja:brilho'),
    definirBrilho: (n) => chamar('bandeja:definirBrilho', n),
    perfil: () => chamar('bandeja:perfil'),
    definirPerfil: (p) => chamar('bandeja:definirPerfil', p),
    rede: () => chamar('bandeja:rede'),
    redes: (procurar) => chamar('bandeja:redes', !!procurar),
    conectar: (ssid, senha) => chamar('bandeja:conectar', ssid, senha),
    desconectar: () => chamar('bandeja:desconectar'),
    ligarWifi: (v) => chamar('bandeja:ligarWifi', !!v),
    configuracoesRede: () => chamar('bandeja:configuracoesRede'),
  },
  navegador: {
    aoJanela: ouvir('navegador:janela'),
    limparDados: () => chamar('navegador:limparDados'),
    semSeguranca: (url) => chamar('navegador:semSeguranca', url),
    abrirSemSeguranca: (url) => chamar('navegador:abrirSemSeguranca', url),
    aoSemSeguranca: ouvir('navegador:semSeguranca'),
    aoPermissao: ouvir('navegador:permissao'),
    aoTela: ouvir('navegador:tela'),
    responder: (id, resposta) => chamar('navegador:responder', id, resposta),
    esquecerPermissoes: () => chamar('navegador:esquecerPermissoes'),
    baixarIcone: (url) => chamar('navegador:baixarIcone', url),
    manifesto: (url) => chamar('navegador:manifesto', url),
  },
});
