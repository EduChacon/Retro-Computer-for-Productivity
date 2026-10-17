'use strict';
/*
 * O Claude ajusta o Retro Computer: o Claude Code do Prompt abre com um servidor MCP próprio
 * (mcp-retro.js, rodado pelo Electron como Node) e com um texto que explica onde ele está. O
 * servidor fala com o Retro Computer aberto por um soquete local (um arquivo no Linux e no Mac,
 * um "pipe" no Windows), com um código novo a cada abertura: só quem recebeu o código (o Claude
 * aberto pelo Prompt) consegue pedir. As ferramentas mudam só o que é seguro (a aparência, a
 * barra, o menu Iniciar, os sons, os atalhos, os programas) e nunca a senha, a chave de API, o
 * disco ou as atualizações; apagar um arquivo é sempre mandá-lo para a Lixeira.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');

/** O que o Claude pode mudar nas configurações (o resto fica só com o usuário, no Painel). */
const PERMITIDAS = ['idioma', 'telaCheia', 'escala', 'papel', 'tema', 'sons', 'volume', 'protecaoTela', 'mesa', 'barra', 'iniciar',
  'janelas', 'luzNoturna', 'transferencia', 'diario', 'acessibilidade', 'foco', 'jogos', 'naoPerturbe'];

/** Só as chaves permitidas; as outras voltam na lista das recusadas. */
function filtrarConfig(parte) {
  const aceitas = {};
  const recusadas = [];
  if (!parte || typeof parte !== 'object' || Array.isArray(parte)) return { aceitas, recusadas };
  for (const [k, v] of Object.entries(parte)) {
    if (PERMITIDAS.includes(k)) aceitas[k] = v;
    else recusadas.push(k);
  }
  return { aceitas, recusadas };
}

const texto = (descricao, extra = {}) => ({ type: 'string', description: descricao, ...extra });

/** As ferramentas, no formato do MCP (o nome, a descrição e o esquema dos argumentos). */
const FERRAMENTAS = [
  {
    name: 'estado',
    description: 'O estado do Retro Computer: a versão, o sistema, o idioma, a pasta do disco C:, os programas instalados e as janelas abertas.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'ler_configuracoes',
    description: 'As configurações do Retro Computer (sem a senha e sem a chave de API), para saber o que está ligado antes de mudar.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'mudar_configuracoes',
    description: `Muda as configurações do Retro Computer (mescladas com as atuais; as listas são trocadas inteiras). Só valem estas chaves: ${PERMITIDAS.join(', ')}. Exemplos: { "papel": { "cor": "#004080", "padrao": "nenhum" } } (o fundo da área de trabalho), { "barra": { "fixados": ["explorador", "bloco"] } }, { "iniciar": { "pequenos": true, "fixados": ["calculadora"] } }, { "sons": false }, { "luzNoturna": { "ligada": true } }, { "tema": "mac" } (o tema do Mac clássico; "pc" volta ao de sempre). A senha, a chave de API, o disco e as atualizações ficam só com o usuário, no Painel de controle.`,
    inputSchema: { type: 'object', properties: { configuracoes: { type: 'object', description: 'A parte das configurações a mudar.' } }, required: ['configuracoes'] },
  },
  {
    name: 'listar_programas',
    description: 'Os programas do Retro Computer: os embutidos (com o identificador para abrir, fixar e criar atalhos), os Craft instalados e os do catálogo que podem ser instalados.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'abrir_programa',
    description: 'Abre um programa do Retro Computer pelo identificador (veja listar_programas), com um arquivo do disco C: se quiser.',
    inputSchema: { type: 'object', properties: { programa: texto('O identificador, como "bloco", "calculadora" ou "craft:wordcraft".'), arquivo: texto('Opcional: um arquivo do disco C: (como "Meus documentos/carta.txt").') }, required: ['programa'] },
  },
  {
    name: 'instalar_programa',
    description: 'Instala um programa Craft do catálogo (baixado do lançamento oficial no GitHub). O usuário vê o andamento na área de trabalho.',
    inputSchema: { type: 'object', properties: { programa: texto('O identificador do catálogo, como "wordcraft".') }, required: ['programa'] },
  },
  {
    name: 'atalho',
    description: 'Põe ou tira o atalho de um programa na área de trabalho, na barra de tarefas ou no alto do menu Iniciar.',
    inputSchema: {
      type: 'object',
      properties: {
        programa: texto('O identificador do programa (veja listar_programas).'),
        onde: texto('Onde: "area_de_trabalho", "barra" ou "iniciar".', { enum: ['area_de_trabalho', 'barra', 'iniciar'] }),
        acao: texto('"por" ou "tirar".', { enum: ['por', 'tirar'] }),
      },
      required: ['programa', 'onde', 'acao'],
    },
  },
  {
    name: 'mover_para_lixeira',
    description: 'Manda um arquivo ou uma pasta do disco C: para a Lixeira do Retro Computer (de onde o usuário pode restaurar). Use sempre esta ferramenta para apagar algo do disco C:, nunca rm ou del.',
    inputSchema: { type: 'object', properties: { caminho: texto('O caminho no disco C:, como "Meus documentos/velho.txt" ou "C:\\\\Meus documentos\\\\velho.txt".') }, required: ['caminho'] },
  },
  {
    name: 'avisar',
    description: 'Mostra um aviso (o balão perto do relógio) na área de trabalho do Retro Computer.',
    inputSchema: { type: 'object', properties: { titulo: texto('O título do aviso.'), texto: texto('O texto do aviso.') }, required: ['texto'] },
  },
];

/** O texto que o Claude recebe ao abrir: onde ele está e as regras da casa. */
function textoSistema({ raiz }) {
  return [
    'Você está dentro do Retro Computer, um computador retrô para produtividade (uma área de trabalho no estilo dos anos 90, com janelas, barra de tarefas e menu Iniciar), aberto pelo Prompt de comando dele.',
    `O disco C: do Retro Computer é a pasta "${raiz}" do computador (a pasta em que este terminal começou). Os documentos do usuário ficam nela.`,
    'Para ajustar o Retro Computer às necessidades do usuário (o fundo, a barra de tarefas, o menu Iniciar, os sons, o idioma, os atalhos, os programas), use as ferramentas do servidor MCP "retro-computer"; não edite o config.json à mão.',
    'Regras da casa: nada se perde. Para apagar um arquivo ou uma pasta do disco C:, use a ferramenta mover_para_lixeira, nunca rm, del ou Remove-Item. Antes de regravar um documento do usuário, confira com ele.',
    'A senha, a chave de API, a pasta do disco e as atualizações ficam só com o usuário (Painel de controle): não tente mudá-las nem ler a chave.',
    'Fale com o usuário no idioma dele, de forma simples.',
  ].join('\n\n');
}

/** O endereço do soquete: um "pipe" no Windows; nos outros, um arquivo curto na pasta temporária. */
function enderecoNovo(plataforma = process.platform) {
  const id = crypto.randomBytes(8).toString('hex');
  return plataforma === 'win32' ? `\\\\.\\pipe\\retro-computer-${id}` : path.join(os.tmpdir(), `retro-mcp-${id}.sock`);
}

/** O config do --mcp-config: o Electron como Node rodando o mcp-retro.js, com o endereço e o código. */
function configMcp({ executavel, script, endereco, token }) {
  return {
    mcpServers: {
      'retro-computer': {
        command: executavel,
        args: [script],
        env: { ELECTRON_RUN_AS_NODE: '1', RETRO_MCP_ENDERECO: endereco, RETRO_MCP_TOKEN: token },
      },
    },
  };
}

const igual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

class ServidorMcp {
  /**
   * @param {object} o
   * @param {string} o.dados  a pasta dos dados do aplicativo (onde ficam os arquivos do Claude)
   * @param {(nome:string, args:object) => Promise<any>} o.executar
   */
  constructor({ dados, executar, plataforma = process.platform }) {
    this.dados = dados;
    this.executar = executar;
    this.plataforma = plataforma;
    this.token = crypto.randomBytes(24).toString('hex');
    this.endereco = enderecoNovo(plataforma);
  }

  /** Abre o soquete. Só o dono do arquivo (e quem tem o código) fala com ele. */
  iniciar() {
    return new Promise((resolve, reject) => {
      this.servidor = net.createServer((s) => this.conexao(s));
      this.servidor.on('error', reject);
      this.servidor.listen(this.endereco, () => {
        if (this.plataforma !== 'win32') { try { fs.chmodSync(this.endereco, 0o600); } catch { } }
        resolve();
      });
    });
  }

  conexao(s) {
    let resto = '';
    s.setEncoding('utf8');
    s.on('error', () => { });
    s.on('data', async (d) => {
      resto += d;
      if (resto.length > 8 * 1024 * 1024) { s.destroy(); return; }
      let i;
      while ((i = resto.indexOf('\n')) >= 0) {
        const linha = resto.slice(0, i);
        resto = resto.slice(i + 1);
        let pedido;
        try { pedido = JSON.parse(linha); } catch { s.write(JSON.stringify({ ok: false, erro: 'pedido inválido' }) + '\n'); continue; }
        s.write(JSON.stringify(await this.responder(pedido)) + '\n');
      }
    });
  }

  async responder(pedido) {
    if (!pedido || !igual(pedido.token, this.token)) return { id: pedido && pedido.id, ok: false, erro: 'código inválido' };
    const nome = String(pedido.nome || '');
    if (nome === 'listar') return { id: pedido.id, ok: true, valor: FERRAMENTAS };
    if (!FERRAMENTAS.some((f) => f.name === nome)) return { id: pedido.id, ok: false, erro: 'ferramenta desconhecida: ' + nome };
    try {
      return { id: pedido.id, ok: true, valor: await this.executar(nome, pedido.args || {}) };
    } catch (e) {
      return { id: pedido.id, ok: false, erro: e.message || String(e) };
    }
  }

  /**
   * Grava o config do MCP e o texto do sistema (só para o usuário ler) e devolve os caminhos,
   * que o Prompt passa ao Claude pelas variáveis RETRO_CLAUDE_MCP e RETRO_CLAUDE_SISTEMA.
   */
  arquivos({ executavel, script, raiz }) {
    const pasta = path.join(this.dados, 'claude');
    fs.mkdirSync(pasta, { recursive: true });
    const mcp = path.join(pasta, 'mcp.json');
    const sistema = path.join(pasta, 'sistema.txt');
    fs.writeFileSync(mcp, JSON.stringify(configMcp({ executavel, script, endereco: this.endereco, token: this.token }), null, 1), { mode: 0o600 });
    try { fs.chmodSync(mcp, 0o600); } catch { }
    fs.writeFileSync(sistema, textoSistema({ raiz }), { mode: 0o600 });
    return { mcp, sistema };
  }

  fechar() {
    try { this.servidor && this.servidor.close(); } catch { }
    if (this.plataforma !== 'win32') { try { fs.unlinkSync(this.endereco); } catch { } }
  }
}

module.exports = { ServidorMcp, FERRAMENTAS, PERMITIDAS, filtrarConfig, textoSistema, configMcp, enderecoNovo };
