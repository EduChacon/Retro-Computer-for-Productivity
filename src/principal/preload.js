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
    // A ponte copia o retorno da função da página, que aqui não serve para nada: um retorno que não
    // pode ser copiado (uma janela, por exemplo) não é erro, porque a função já rodou.
    const f = (_e, ...args) => {
      try { fn(...args); } catch (e) { if (!/could not be cloned/i.test(String(e && e.message))) throw e; }
    };
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
    guardarVersao: (rel) => chamar('disco:guardarVersao', rel),
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
    /** Começa o arrastar do sistema com estes arquivos do disco (para soltar fora do Retro Computer). */
    arrastar: (rels, icone) => chamar('disco:arrastar', rels, icone),
    /** O caminho no disco C: de cada caminho completo (null para o que fica fora dele). */
    relDe: (caminhos) => chamar('disco:relDe', caminhos),
    /** O caminho real de um arquivo arrastado do computador principal. */
    caminhoDe: (arquivo) => {
      try { return webUtils.getPathForFile(arquivo) || null; } catch { return null; }
    },
  },
  tela: {
    modos: () => chamar('tela:modos'),
    definir: (saida, modo) => chamar('tela:definir', saida, modo),
    luzNoturna: (k) => chamar('tela:luzNoturna', k),
    telas: () => chamar('tela:telas'),
    arranjo: (modo) => chamar('tela:arranjo', modo),
    monitores: () => chamar('tela:monitores'),
    usarMonitor: (id) => chamar('tela:usarMonitor', id),
  },
  // O Firefox com o visual do Retro Computer.
  firefox: {
    estado: () => chamar('firefox:estado'),
    abrir: (url, o) => chamar('firefox:abrir', url, o),
  },
  // A cópia de segurança do disco C:.
  copia: {
    escolher: () => chamar('copia:escolher'),
    fazer: (destino) => chamar('copia:fazer', destino),
    estado: () => chamar('copia:estado'),
    abrir: () => chamar('copia:abrir'),
    aoProgresso: ouvir('copia:progresso'),
    aoFim: ouvir('copia:fim'),
  },
  // O painel de visualização do Explorador.
  visualizar: {
    docx: (rel) => chamar('visualizar:docx', rel),
    planilha: (rel) => chamar('visualizar:planilha', rel),
    odt: (rel) => chamar('visualizar:odt', rel),
  },
  // O Diário de trabalho (Acessórios).
  diario: {
    anotar: (texto, o) => chamar('diario:anotar', texto, o),
    pasta: () => chamar('diario:pasta'),
    hoje: () => chamar('diario:hoje'),
  },
  // A acessibilidade do teclado e do mouse (modo sistema).
  acessibilidade: {
    estado: () => chamar('acessibilidade:estado'),
    aplicar: (escolhas) => chamar('acessibilidade:aplicar', escolhas),
    configuracoesDoSistema: () => chamar('acessibilidade:configuracoesDoSistema'),
  },
  // As opções de energia e a data e a hora (modo sistema).
  energia: {
    estado: () => chamar('energia:estado'),
    definir: (opcoes) => chamar('energia:definir', opcoes),
    tampa: (acao, senha) => chamar('energia:tampa', acao, senha),
    configuracoesDoSistema: () => chamar('energia:configuracoesDoSistema'),
  },
  dataHora: {
    estado: () => chamar('datahora:estado'),
    definir: (o, senha) => chamar('datahora:definir', o, senha),
    configuracoesDoSistema: () => chamar('datahora:configuracoesDoSistema'),
  },
  // As saídas de som e os microfones (Painel › Sons).
  som: {
    estado: () => chamar('som:estado'),
    saida: (id) => chamar('som:saida', id),
    entrada: (id) => chamar('som:entrada', id),
    microfone: (o) => chamar('som:microfone', o),
    configuracoesDoSistema: () => chamar('som:configuracoesDoSistema'),
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
    telaFisica: () => chamar('sistema:telaFisica'),
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
  // As pastas do computador principal no Meu computador e o que ele manda (ids 'pc:…' nas rotas das unidades).
  computador: {
    pastas: () => chamar('computador:pastas'),
    icones: (id, rels) => chamar('computador:icones', id, rels),
    estado: () => chamar('computador:estado'),
    mostrar: (id, rel) => chamar('computador:mostrar', id, rel),
    pronto: () => chamar('computador:pronto'),
    atalhoMesa: () => chamar('computador:atalhoMesa'),
    enviarPara: (ligar) => chamar('computador:enviarPara', !!ligar),
    aoReceber: ouvir('computador:recebidos'),
  },
  unidades: {
    listar: () => chamar('unidades:listar'),
    pasta: (id, rel) => chamar('unidades:pasta', id, rel),
    montar: (id) => chamar('unidades:montar', id),
    ejetar: (id) => chamar('unidades:ejetar', id),
    trazer: (id, rels, destino) => chamar('unidades:trazer', id, rels, destino),
    levar: (id, rels, destino) => chamar('unidades:levar', id, rels, destino),
    formatar: (id, opcoes, senha) => chamar('unidades:formatar', id, opcoes, senha),
    formatarNoSistema: () => chamar('unidades:formatarNoSistema'),
    aoMudar: ouvir('unidades:mudou'),
  },
  // Os programas do Windows no Linux, pelo WINE.
  // O Claude ajusta o Retro Computer (o servidor MCP): os pedidos que a área de trabalho resolve.
  mcp: {
    aoPedido: ouvir('mcp:pedido'),
    responder: (id, r) => chamar('mcp:resposta', id, r),
    aoMudarConfig: ouvir('config:mudou'),
  },
  dos: {
    abrir: (rel) => chamar('dos:abrir', rel),
    guardar: (pasta, foto, arquivos, pastas) => chamar('dos:guardar', pasta, foto, arquivos, pastas),
    tipo: (rel) => chamar('dos:tipo', rel),
  },
  wine: {
    estado: () => chamar('wine:estado'),
    abrir: (rel) => chamar('wine:abrir', rel),
    programas: () => chamar('wine:programas'),
    abrirPrograma: (id) => chamar('wine:abrirPrograma', id),
  },
  // O antivírus sob demanda.
  antivirus: {
    estado: () => chamar('antivirus:estado'),
    verificar: (alvo) => chamar('antivirus:verificar', alvo),
    parar: () => chamar('antivirus:parar'),
    instalar: (senha) => chamar('antivirus:instalar', senha),
    atualizar: (senha) => chamar('antivirus:atualizar', senha),
    aoAndar: ouvir('antivirus:andamento'),
    aoAchar: ouvir('antivirus:achou'),
    aoInstalar: ouvir('antivirus:instalando'),
  },
  // Os vários perfis (usuários): a tela de entrada, o logoff e a lista do Painel › Usuários.
  perfis: {
    estado: () => chamar('perfis:estado'),
    entrar: (id, senha) => chamar('perfis:entrar', id, senha),
    logoff: () => chamar('perfis:logoff'),
    criar: (nome) => chamar('perfis:criar', nome),
    renomear: (id, nome) => chamar('perfis:renomear', id, nome),
    remover: (id) => chamar('perfis:remover', id),
    perguntar: (sim) => chamar('perfis:perguntar', sim),
    disco: (id) => chamar('perfis:disco', id),
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
