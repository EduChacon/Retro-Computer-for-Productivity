'use strict';
/*
 * As configurações ficam em <dados do aplicativo>/config.json (fora do disco):
 * são deste computador, não dos documentos. A chave de API do Claude é
 * cifrada pelo cofre do sistema (safeStorage) e nunca vai para a área de trabalho.
 */
const fs = require('node:fs');
const path = require('node:path');

const PADRAO = {
  versao: 1,
  disco: null,
  telaCheia: true,
  escala: 'auto',
  papel: { cor: '#008080', padrao: 'nenhum' },
  sons: true,
  volume: 0.5,
  inicioRapido: false,
  protecaoTela: { ligada: true, minutos: 10, tipo: 'estrelas' },
  mesa: { posicoes: {}, atalhos: ['meu-computador', 'meus-documentos', 'lixeira', 'claude', 'prompt'] },
  recentes: [],
  foco: { minutos: 25, pausa: 5 },
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

class Config {
  constructor(pasta, cofre) {
    this.arquivo = path.join(pasta, 'config.json');
    this.arquivoChave = path.join(pasta, 'chave-claude.bin');
    this.cofre = cofre;
    this.dados = mesclar(PADRAO, {});
    try {
      this.dados = mesclar(PADRAO, JSON.parse(fs.readFileSync(this.arquivo, 'utf8')));
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
    if (!this.cofreDisponivel()) throw new Error('O cofre de senhas do sistema não está disponível; a chave não foi guardada.');
    fs.mkdirSync(path.dirname(this.arquivoChave), { recursive: true });
    fs.writeFileSync(this.arquivoChave, this.cofre.encryptString(limpa), { mode: 0o600 });
    return true;
  }

  lerChave() {
    if (!this.temChave()) return null;
    try { return this.cofre.decryptString(fs.readFileSync(this.arquivoChave)); } catch { return null; }
  }
}

module.exports = { Config, PADRAO, mesclar };
