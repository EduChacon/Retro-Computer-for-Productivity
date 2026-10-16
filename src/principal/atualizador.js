'use strict';
/*
 * A atualização do próprio Retro Computer, pelos lançamentos do GitHub
 * (electron-updater, com os arquivos latest*.yml que o fluxo "Publicar" sobe).
 *
 *   Windows (instalador):   baixa e instala sozinho, ao reiniciar;
 *   Linux AppImage:         troca o arquivo sozinho, ao reiniciar;
 *   Linux .deb:             instala o pacote pedindo a senha de administrador;
 *   macOS, Windows .zip:    não dá para trocar sozinho (sem assinatura da Apple, ou sem
 *                           instalador): a área de trabalho abre a página de download.
 */
const fs = require('node:fs');
const path = require('node:path');

/** Como esta cópia foi instalada, e se ela pode se atualizar sozinha. */
function tipoDeInstalacao(app, plataforma = process.platform, env = process.env) {
  if (!app.isPackaged) return { tipo: 'desenvolvimento', sozinho: false };
  if (plataforma === 'win32') {
    const desinstalador = fs.readdirSync(path.dirname(process.execPath)).some((n) => /^Uninstall .*\.exe$/i.test(n));
    return desinstalador ? { tipo: 'instalador', sozinho: true } : { tipo: 'zip', sozinho: false };
  }
  if (plataforma === 'linux') {
    if (env.APPIMAGE) return { tipo: 'appimage', sozinho: true };
    let pacote = '';
    try { pacote = fs.readFileSync(path.join(process.resourcesPath, 'package-type'), 'utf8').trim(); } catch { }
    return pacote === 'deb' ? { tipo: 'deb', sozinho: true, senha: true } : { tipo: pacote || 'outro', sozinho: false };
  }
  return { tipo: 'mac', sozinho: false };
}

class Atualizador {
  constructor({ app, enviar, antesDeSair }) {
    this.app = app;
    this.enviar = enviar;
    this.antesDeSair = antesDeSair;
    this.instalacao = tipoDeInstalacao(app);
    this.estado = { etapa: 'parado' };
    this.au = null;
  }

  atualizador() {
    if (this.au || !this.instalacao.sozinho) return this.au;
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = false;
    // Baixada e não instalada na hora: entra quando o Retro Computer for desligado.
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
    // Para os testes: um servidor local no lugar dos lançamentos do GitHub (só neste computador,
    // nunca um endereço da internet: senão uma variável trocada levaria a atualização para outro lugar).
    const local = String(process.env.RETRO_ATUALIZACAO_URL || '');
    if (/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\//.test(local)) autoUpdater.setFeedURL({ provider: 'generic', url: local });
    autoUpdater.on('update-available', (i) => this.mudar({ etapa: 'disponivel', versao: i.version }));
    autoUpdater.on('update-not-available', (i) => this.mudar({ etapa: 'atual', versao: i.version }));
    autoUpdater.on('download-progress', (p) => this.mudar({ etapa: 'baixando', versao: this.estado.versao, progresso: Math.round(p.percent || 0) }));
    autoUpdater.on('update-downloaded', (i) => this.mudar({ etapa: 'baixada', versao: i.version }));
    autoUpdater.on('error', (e) => this.mudar({ etapa: 'erro', versao: this.estado.versao, erro: String((e && e.message) || e).split('\n')[0].slice(0, 300) }));
    this.au = autoUpdater;
    return autoUpdater;
  }

  mudar(estado) {
    this.estado = estado;
    this.enviar('sistema:atualizacao', estado);
  }

  info() {
    return { ...this.instalacao, ...this.estado, atual: this.app.getVersion() };
  }

  async verificar() {
    const au = this.atualizador();
    if (!au) return this.info();
    this.mudar({ etapa: 'procurando' });
    try {
      await au.checkForUpdates();
    } catch (e) {
      this.mudar({ etapa: 'erro', erro: String((e && e.message) || e).split('\n')[0].slice(0, 300) });
    }
    return this.info();
  }

  async baixar() {
    const au = this.atualizador();
    if (!au) return this.info();
    if (this.estado.etapa !== 'baixada') await au.downloadUpdate();
    return this.info();
  }

  /** Reinicia instalando a versão baixada (o fechamento normal passa pelo Desligar da área de trabalho). */
  instalar() {
    const au = this.atualizador();
    if (!au || this.estado.etapa !== 'baixada') return false;
    this.antesDeSair();
    setImmediate(() => au.quitAndInstall(false, true));
    return true;
  }
}

module.exports = { Atualizador, tipoDeInstalacao };
