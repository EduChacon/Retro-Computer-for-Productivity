'use strict';
/*
 * As configurações ficam em <dados do aplicativo>/config.json (fora do disco):
 * são deste computador, não dos documentos. A chave de API do Claude é
 * cifrada pelo cofre do sistema (safeStorage) e nunca vai para a área de trabalho.
 */
const fs = require('node:fs');
const path = require('node:path');
const { tr } = require('./idioma');

const PADRAO = {
  versao: 4,
  disco: null,
  idioma: 'auto',
  atualizacoes: 'automatico',
  telaCheia: true,
  escala: 'auto',
  papel: { cor: '#008080', padrao: 'nenhum' },
  // O tema da interface: 'pc' (o PC clássico) ou 'mac' (o Mac clássico, inspirado no Mac OS 9.2).
  tema: 'pc',
  // O esquema de cores do PC clássico (esquemas.js): 'padrao', os claros ('areia', 'oceano'…) e os escuros ('noite'…).
  esquema: 'padrao',
  // A troca à noite para outro esquema: do pôr ao nascer do sol do fuso horário ('sol') ou das de às ate horas ('horas').
  esquemaNoite: { ligado: false, esquema: 'noite', quando: 'sol', de: 19, ate: 7 },
  // A Agenda: os lembretes já descartados e os calendários da internet ({ id, url, nome, lembretes,
  // ligado, ultima, erro }; a lista só muda por calendarios.js, e a área de trabalho não vê o url).
  agenda: { vistos: [], calendarios: [] },
  // O corretor ortográfico (ortografia.js): ligado, com os idiomas escolhidos (vazio: o da interface).
  ortografia: { ligada: true, idiomas: [] },
  sons: true,
  volume: 0.5,
  inicioRapido: true, // a área de trabalho direto; o BIOS e a marca, em Painel › Aparência › Configurações
  protecaoTela: { ligada: true, minutos: 10, tipo: 'estrelas' },
  // Os ícones da área de trabalho (Painel › Aparência › Área de trabalho); o Prompt fica no Iniciar.
  mesa: { posicoes: {}, atalhos: ['meu-computador', 'meus-documentos', 'lixeira', 'navegador', 'correio', 'claude'] },
  // A tela de bloqueio (a senha fica em bloqueio.senha, só o resumo; ver bloqueio.js). Com uma senha,
  // ela é pedida ao abrir, como no Windows (desliga em Painel › Senhas).
  bloqueio: { aoVoltar: true, aoAbrir: true, naProtecao: false },
  // A barra de tarefas: os programas fixados (ao lado da busca) e os botões das janelas ('nomes' ou 'icones').
  barra: { fixados: ['explorador', 'navegador', 'correio', 'bloco'], botoes: 'nomes' },
  // Os sites instalados como programas: [{ id, nome, url, icone (PNG em data:) }].
  webapps: [],
  // As janelas: encaixar ao arrastar até as bordas e os cantos (os cantos magnéticos).
  janelas: { encaixe: true },
  // A luz noturna: as cores mais quentes à noite (das 20h às 7h, ou do pôr ao nascer do sol com quando
  // 'sol') ou sempre; a intensidade vai de 0 a 100.
  luzNoturna: { ligada: false, quando: 'noite', de: 20, ate: 7, intensidade: 50 },
  // O histórico da área de transferência (logotipo + V), só na memória.
  transferencia: { historico: true },
  // O Navegador: só conexões seguras (http:// vira https://) e apagar os dados ao fechar.
  navegador: { soHttps: true, limparAoFechar: false },
  // A busca pelo conteúdo dos arquivos (o índice, na pasta de dados do usuário; desligada, ele é apagado).
  busca: { conteudo: true },
  // O Diário de trabalho: anotar sozinho os focos concluídos e os arquivos alterados.
  diario: { ligado: false },
  // A cópia de segurança do disco C: (todo dia ou toda semana), para uma pasta fora dele.
  copia: { ligada: false, destino: '', quando: 'diaria', ultima: 0, resultado: null },
  // A acessibilidade: o alto contraste, o cursor grande, o aviso visual dos sons ('nada', 'titulo',
  // 'janela' ou 'tela') e, no modo sistema, as teclas de aderência e as do mouse.
  acessibilidade: { altoContraste: false, cursorGrande: false, avisoVisual: 'nada', aderencia: false, teclasMouse: false },
  // As opções de energia do modo sistema (minutos; 0 = nunca): a tela e a suspensão, na tomada e na bateria.
  energia: { telaTomada: 15, telaBateria: 5, suspenderTomada: 0, suspenderBateria: 30 },
  recentes: [],
  // Reabrir ao ligar: as janelas abertas (o programa, o que ele mostrava e o lugar), guardadas pela área de trabalho.
  reabrir: { ligado: true, janelas: [] },
  foco: { minutos: 25, pausa: 5 },
  // O Claude do Prompt ajusta o Retro Computer pelo servidor MCP (mcp.js).
  claude: { ajustes: true },
  primeiraVez: true,
};

function mesclar(base, extra) {
  const r = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    if (v === null && base && typeof base === 'object' && !Array.isArray(base) && k in base && base[k] !== null && typeof base[k] !== 'object') {
      r[k] = null;
    } else if (v === null) {
      // null apaga a chave (ex.: a posição de um ícone que mudou de nome).
      delete r[k];
    } else if (v && typeof v === 'object' && !Array.isArray(v) && base && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      r[k] = mesclar(base[k], v);
    } else {
      r[k] = v;
    }
  }
  return r;
}

/**
 * Leva as configurações de uma versão anterior para a atual, sem perder as escolhas do usuário.
 * 1 → 2 (0.3.0): os ícones do Navegador e do E-mail na área de trabalho, depois da Lixeira.
 * 2 → 3 (1.0.0): sem o Prompt de comando na área de trabalho padrão (só para quem ainda tem a
 * lista padrão de antes; quem a mudou fica como está).
 * 3 → 4 (1.1.0): com uma senha, ela passa a ser pedida ao abrir (antes, só marcando a opção).
 */
function migrar(dados) {
  const d = JSON.parse(JSON.stringify(dados));
  if ((d.versao || 1) < 2) {
    const at = (d.mesa && Array.isArray(d.mesa.atalhos)) ? d.mesa.atalhos : [];
    const novos = ['navegador', 'correio'].filter((k) => !at.includes(k));
    const i = at.indexOf('lixeira');
    at.splice(i >= 0 ? i + 1 : at.length, 0, ...novos);
    d.mesa = { ...(d.mesa || {}), atalhos: at };
    d.versao = 2;
  }
  if (d.versao < 3) {
    const antes = ['meu-computador', 'meus-documentos', 'lixeira', 'navegador', 'correio', 'claude', 'prompt'];
    const at = d.mesa && Array.isArray(d.mesa.atalhos) ? d.mesa.atalhos : null;
    if (at && at.length === antes.length && at.every((k, i) => k === antes[i])) d.mesa.atalhos = at.filter((k) => k !== 'prompt');
    d.versao = 3;
  }
  if (d.versao < 4) {
    if (d.bloqueio) d.bloqueio.aoAbrir = true;
    d.versao = 4;
  }
  return d;
}

class Config {
  constructor(pasta, cofre) {
    this.arquivo = path.join(pasta, 'config.json');
    this.arquivoChave = path.join(pasta, 'chave-claude.bin');
    this.cofre = cofre;
    this.dados = mesclar(PADRAO, {});
    try {
      this.dados = migrar(mesclar(PADRAO, { versao: 1, ...JSON.parse(fs.readFileSync(this.arquivo, 'utf8')) }));
    } catch { }
  }

  obter() {
    return JSON.parse(JSON.stringify(this.dados));
  }

  /** Grava uma parte das configurações (mesclada com o que já existe). */
  definir(parte) {
    this.dados = mesclar(this.dados, parte);
    this.salvar();
    return this.obter();
  }

  salvar() {
    fs.mkdirSync(path.dirname(this.arquivo), { recursive: true });
    const tmp = this.arquivo + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.dados, null, 1));
    fs.renameSync(tmp, this.arquivo);
  }

  /* ---------- A chave de API do Claude ---------- */

  cofreDisponivel() {
    try { return this.cofre.isEncryptionAvailable(); } catch { return false; }
  }

  temChave() {
    return fs.existsSync(this.arquivoChave);
  }

  gravarChave(chave) {
    const limpa = String(chave || '').trim();
    if (!limpa) {
      try { fs.rmSync(this.arquivoChave, { force: true }); } catch { }
      return false;
    }
    if (!this.cofreDisponivel()) throw new Error(tr('O cofre de senhas do sistema não está disponível; a chave não foi guardada.'));
    fs.mkdirSync(path.dirname(this.arquivoChave), { recursive: true });
    fs.writeFileSync(this.arquivoChave, this.cofre.encryptString(limpa), { mode: 0o600 });
    return true;
  }

  lerChave() {
    if (!this.temChave()) return null;
    try { return this.cofre.decryptString(fs.readFileSync(this.arquivoChave)); } catch { return null; }
  }
}

module.exports = { Config, PADRAO, mesclar, migrar };
