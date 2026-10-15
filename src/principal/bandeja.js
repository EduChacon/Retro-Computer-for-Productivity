'use strict';
/*
 * A bandeja do lado do computador: o volume do som, o brilho da tela e a rede (o Wi-Fi).
 *
 *   Volume:  Linux pelo wpctl (PipeWire), pactl (PulseAudio) ou amixer (ALSA);
 *            Windows pela interface de áudio do sistema (um PowerShell que fica aberto);
 *            macOS pelo osascript.
 *   Brilho:  Linux pelo /sys/class/backlight (e o logind ou o brightnessctl para mudar);
 *            Windows pelo WMI (só a tela do próprio computador portátil).
 *   Rede:    Linux pelo NetworkManager (nmcli): as redes Wi-Fi, conectar, desconectar;
 *            Windows pelo netsh (só o nome e o sinal da rede; conectar fica com o Windows).
 *
 * Sem nenhum deles, a bandeja mostra só o que a página sabe (se há internet).
 */
const { execFile, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

/** Roda um comando e devolve a saída (em inglês, para ler sempre do mesmo jeito). */
function rodar(cmd, args, { timeout = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 4 << 20, env: { ...process.env, LC_ALL: 'C', LANG: 'C' } }, (erro, saida, serr) => {
      if (erro) {
        erro.saida = String(serr || saida || '').trim();
        return reject(erro);
      }
      resolve(String(saida));
    });
  });
}

/* ---------- Leitura das saídas (funções puras, testadas em testes/bandeja.test.js) ---------- */

/** "Volume: 0.40 [MUTED]" (wpctl). */
function lerWpctl(s) {
  const m = /Volume:\s*([\d.]+)/.exec(s);
  if (!m) return null;
  return { nivel: Math.round(Number(m[1]) * 100), mudo: /\[MUTED\]/i.test(s) };
}

/** "Volume: front-left: 26214 /  40% / -23.88 dB, ..." e "Mute: yes" (pactl). */
function lerPactl(volume, mudo) {
  const m = /(\d+)%/.exec(volume);
  if (!m) return null;
  return { nivel: Number(m[1]), mudo: /Mute:\s*yes/i.test(mudo) };
}

/** "Front Left: Playback 26214 [40%] [-23.88dB] [on]" (amixer). */
function lerAmixer(s) {
  const m = /\[(\d+)%\]/.exec(s);
  if (!m) return null;
  return { nivel: Number(m[1]), mudo: /\[off\]/.test(s) };
}

/** "output volume:50, input volume:75, alert volume:100, output muted:false" (osascript). */
function lerMac(s) {
  const m = /output volume:(\d+)/.exec(s);
  if (!m) return null;
  return { nivel: Number(m[1]), mudo: /output muted:true/.test(s) };
}

/** Uma linha do nmcli -t: os campos separados por ":", com "\:" e "\\" dentro deles. */
function camposNmcli(linha) {
  const r = [''];
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '\\' && i + 1 < linha.length) r[r.length - 1] += linha[++i];
    else if (c === ':') r.push('');
    else r[r.length - 1] += c;
  }
  return r;
}

/** nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device */
function lerDispositivos(s) {
  return s.split('\n').filter(Boolean).map(camposNmcli).map(([dispositivo, tipo, estado, conexao]) => ({ dispositivo, tipo, estado, conexao: conexao || '' }));
}

/** nmcli -t -f IN-USE,SSID,SIGNAL,SECURITY device wifi list: uma entrada por nome, com o melhor sinal. */
function lerRedesWifi(s) {
  const porNome = new Map();
  for (const linha of s.split('\n').filter(Boolean)) {
    const [uso, ssid, sinal, seguranca] = camposNmcli(linha);
    if (!ssid) continue; // as redes ocultas
    const r = { ssid, sinal: Number(sinal) || 0, protegida: !!seguranca && seguranca !== '--', seguranca: seguranca === '--' ? '' : (seguranca || ''), emUso: uso === '*' };
    const antes = porNome.get(ssid);
    if (!antes) porNome.set(ssid, r);
    else porNome.set(ssid, { ...(r.sinal > antes.sinal ? r : antes), emUso: antes.emUso || r.emUso });
  }
  return [...porNome.values()].sort((a, b) => (b.emUso - a.emUso) || (b.sinal - a.sinal) || a.ssid.localeCompare(b.ssid));
}

/** netsh wlan show interfaces: o nome da rede e o sinal (as outras linhas mudam com o idioma do Windows). */
function lerNetsh(s) {
  const ssid = /^\s*SSID\s*:\s*(.*?)\s*$/m.exec(s);
  if (!ssid) return null;
  const sinal = /:\s*(\d+)%\s*$/m.exec(s);
  return { ssid: ssid[1], sinal: sinal ? Number(sinal[1]) : null };
}

/** A primeira linha útil de uma mensagem de erro do nmcli ("Error: ..."). */
function erroCurto(e) {
  const t = String((e && (e.saida || e.message)) || e || '').split('\n').map((x) => x.trim()).filter(Boolean);
  return (t.find((x) => /^Error:/i.test(x)) || t[0] || '').replace(/^Error:\s*/i, '').slice(0, 300);
}

/* ---------- O volume no Windows ---------- */

// A interface de áudio do Windows (IAudioEndpointVolume), declarada na ordem dos métodos do
// endpointvolume.h e do mmdeviceapi.h. O PowerShell compila uma vez e fica esperando os pedidos.
const VOLUME_WINDOWS = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IVolumeDoPonto {
  int RegistrarAviso(IntPtr a);
  int DesfazerAviso(IntPtr a);
  int ContarCanais(out uint n);
  int DefinirNivelDb(float v, IntPtr contexto);
  int DefinirNivel(float v, IntPtr contexto);
  int LerNivelDb(out float v);
  int LerNivel(out float v);
  int DefinirCanalDb(uint c, float v, IntPtr contexto);
  int DefinirCanal(uint c, float v, IntPtr contexto);
  int LerCanalDb(uint c, out float v);
  int LerCanal(uint c, out float v);
  int DefinirMudo([MarshalAs(UnmanagedType.Bool)] bool mudo, IntPtr contexto);
  int LerMudo([MarshalAs(UnmanagedType.Bool)] out bool mudo);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IDispositivoDeSom {
  int Ativar(ref Guid iid, int contexto, IntPtr parametros, [MarshalAs(UnmanagedType.IUnknown)] out object saida);
}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IListaDeDispositivos {
  int Listar(int fluxo, int estados, out IntPtr colecao);
  int Padrao(int fluxo, int papel, out IDispositivoDeSom dispositivo);
}
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class ListaDeDispositivos { }
public static class VolumeRetro {
  static IVolumeDoPonto Ponto() {
    var lista = (IListaDeDispositivos)new ListaDeDispositivos();
    IDispositivoDeSom d;
    Marshal.ThrowExceptionForHR(lista.Padrao(0, 1, out d));
    Guid iid = typeof(IVolumeDoPonto).GUID;
    object o;
    Marshal.ThrowExceptionForHR(d.Ativar(ref iid, 23, IntPtr.Zero, out o));
    return (IVolumeDoPonto)o;
  }
  public static string Ler() {
    var p = Ponto();
    float v; bool m;
    Marshal.ThrowExceptionForHR(p.LerNivel(out v));
    Marshal.ThrowExceptionForHR(p.LerMudo(out m));
    return Math.Round(v * 100).ToString() + " " + (m ? "1" : "0");
  }
  public static void Nivel(int n) { Marshal.ThrowExceptionForHR(Ponto().DefinirNivel(Math.Max(0, Math.Min(100, n)) / 100f, IntPtr.Zero)); }
  public static void Mudo(bool m) { Marshal.ThrowExceptionForHR(Ponto().DefinirMudo(m, IntPtr.Zero)); }
}
'@
[Console]::Out.WriteLine('pronto')
while ($null -ne ($linha = [Console]::In.ReadLine())) {
  try {
    $p = $linha.Split(' ')
    if ($p[0] -eq 'bateria') {
      [Console]::Out.WriteLine('bateria ' + @(Get-CimInstance -ClassName Win32_Battery).Count)
    } elseif ($p[0] -eq 'brilho') {
      # O brilho da tela do computador portátil (as telas de fora não respondem ao WMI).
      if ($p.Length -gt 1) {
        $m = Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods | Select-Object -First 1
        Invoke-CimMethod -InputObject $m -MethodName WmiSetBrightness -Arguments @{ Timeout = [uint32]1; Brightness = [byte]$p[1] } | Out-Null
      }
      $b = Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness | Select-Object -First 1
      if ($null -eq $b) { throw 'sem brilho' }
      [Console]::Out.WriteLine('brilho ' + $b.CurrentBrightness)
    } else {
      if ($p[0] -eq 'nivel') { [VolumeRetro]::Nivel([int]$p[1]) }
      elseif ($p[0] -eq 'mudo') { [VolumeRetro]::Mudo($p[1] -eq '1') }
      [Console]::Out.WriteLine([VolumeRetro]::Ler())
    }
  } catch { [Console]::Out.WriteLine('erro ' + $_.Exception.Message) }
  [Console]::Out.Flush()
}
`;

class VolumeWindows {
  constructor() {
    this.p = null;
    this.fila = [];
    this.resto = '';
    this.pronto = null;
  }

  abrir() {
    if (this.pronto) return this.pronto;
    this.pronto = new Promise((resolve, reject) => {
      const cod = Buffer.from(VOLUME_WINDOWS, 'utf16le').toString('base64');
      const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', cod], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      this.p = p;
      let comecou = false;
      let erros = '';
      p.stderr.on('data', (d) => { erros += d; });
      p.stdout.on('data', (d) => {
        this.resto += d;
        let i;
        while ((i = this.resto.indexOf('\n')) >= 0) {
          const linha = this.resto.slice(0, i).trim();
          this.resto = this.resto.slice(i + 1);
          if (!linha) continue;
          if (!comecou && linha === 'pronto') { comecou = true; resolve(); continue; }
          const f = this.fila.shift();
          if (f) f(linha);
        }
      });
      const fim = () => {
        this.p = null;
        this.pronto = null;
        this.fila.splice(0).forEach((f) => f('erro fechado'));
        if (!comecou) reject(new Error(erros.trim().split('\n')[0] || 'PowerShell'));
      };
      p.on('error', fim);
      p.on('exit', fim);
    });
    return this.pronto;
  }

  /** Um pedido ao PowerShell; devolve a linha da resposta. */
  async linha(pedido) {
    await this.abrir();
    const r = await new Promise((resolve) => {
      const t = setTimeout(() => resolve('erro tempo'), 8000);
      this.fila.push((x) => { clearTimeout(t); resolve(x); });
      this.p.stdin.write(pedido + '\n');
    });
    if (r.startsWith('erro')) throw new Error(r.slice(5));
    return r;
  }

  /** O volume: 'ler', 'nivel N' ou 'mudo 0|1'. */
  async pedir(pedido) {
    const [nivel, mudo] = (await this.linha(pedido)).split(' ');
    return { nivel: Number(nivel), mudo: mudo === '1' };
  }

  /** O brilho (0 a 100): ler, ou mudar com n. */
  async brilho(n) {
    return Number((await this.linha(n == null ? 'brilho' : 'brilho ' + Math.round(n))).split(' ')[1]);
  }

  fechar() {
    if (this.p) { try { this.p.stdin.end(); } catch { } }
  }
}

/* ---------- O volume ---------- */

class Volume {
  constructor(plataforma = process.platform) {
    this.plataforma = plataforma;
    this.como = undefined; // descoberto na primeira leitura
    this.win = null;
  }

  /** Qual ferramenta responde neste computador (a primeira que funcionar). */
  async descobrir() {
    if (this.como !== undefined) return this.como;
    const tentativas = {
      linux: [
        ['wpctl', () => rodar('wpctl', ['get-volume', '@DEFAULT_AUDIO_SINK@'], { timeout: 3000 }).then(lerWpctl)],
        ['pactl', () => this.lerPactl()],
        ['amixer', () => rodar('amixer', ['-M', 'get', 'Master'], { timeout: 3000 }).then(lerAmixer)],
      ],
      darwin: [['osascript', () => rodar('osascript', ['-e', 'get volume settings'], { timeout: 4000 }).then(lerMac)]],
      win32: [['windows', () => (this.win = this.win || new VolumeWindows()).pedir('ler')]],
    }[this.plataforma] || [];
    for (const [nome, ler] of tentativas) {
      try {
        if (await ler()) { this.como = nome; return nome; }
      } catch { }
    }
    this.como = null;
    return null;
  }

  async lerPactl() {
    const [v, m] = await Promise.all([
      rodar('pactl', ['get-sink-volume', '@DEFAULT_SINK@'], { timeout: 3000 }),
      rodar('pactl', ['get-sink-mute', '@DEFAULT_SINK@'], { timeout: 3000 }),
    ]);
    return lerPactl(v, m);
  }

  /** { disponivel, nivel (0 a 100), mudo, como } */
  async ler() {
    const como = await this.descobrir();
    if (!como) return { disponivel: false };
    try {
      let r = null;
      if (como === 'wpctl') r = lerWpctl(await rodar('wpctl', ['get-volume', '@DEFAULT_AUDIO_SINK@']));
      else if (como === 'pactl') r = await this.lerPactl();
      else if (como === 'amixer') r = lerAmixer(await rodar('amixer', ['-M', 'get', 'Master']));
      else if (como === 'osascript') r = lerMac(await rodar('osascript', ['-e', 'get volume settings']));
      else if (como === 'windows') r = await this.win.pedir('ler');
      return r ? { disponivel: true, como, ...r } : { disponivel: false, como };
    } catch (e) {
      return { disponivel: false, como, erro: erroCurto(e) };
    }
  }

  /** Muda o nível (0 a 100) e/ou o mudo; devolve o estado novo. */
  async definir({ nivel, mudo } = {}) {
    const como = await this.descobrir();
    if (!como) return { disponivel: false };
    const n = nivel == null ? null : Math.max(0, Math.min(100, Math.round(Number(nivel))));
    try {
      if (como === 'wpctl') {
        if (n != null) await rodar('wpctl', ['set-volume', '@DEFAULT_AUDIO_SINK@', (n / 100).toFixed(2)]);
        if (mudo != null) await rodar('wpctl', ['set-mute', '@DEFAULT_AUDIO_SINK@', mudo ? '1' : '0']);
      } else if (como === 'pactl') {
        if (n != null) await rodar('pactl', ['set-sink-volume', '@DEFAULT_SINK@', n + '%']);
        if (mudo != null) await rodar('pactl', ['set-sink-mute', '@DEFAULT_SINK@', mudo ? '1' : '0']);
      } else if (como === 'amixer') {
        if (n != null) await rodar('amixer', ['-q', '-M', 'set', 'Master', n + '%']);
        if (mudo != null) await rodar('amixer', ['-q', 'set', 'Master', mudo ? 'mute' : 'unmute']);
      } else if (como === 'osascript') {
        if (n != null) await rodar('osascript', ['-e', `set volume output volume ${n}`]);
        if (mudo != null) await rodar('osascript', ['-e', `set volume output muted ${mudo ? 'true' : 'false'}`]);
      } else if (como === 'windows') {
        if (n != null) await this.win.pedir('nivel ' + n);
        if (mudo != null) await this.win.pedir('mudo ' + (mudo ? '1' : '0'));
      }
    } catch (e) {
      return { ...(await this.ler()), erro: erroCurto(e) };
    }
    return this.ler();
  }

  fechar() {
    if (this.win) this.win.fechar();
  }
}

/* ---------- O brilho da tela ---------- */

/** A tela que manda no brilho: a do firmware, a da plataforma ou a do vídeo, nessa ordem. */
function escolherLuz(raiz = '/sys/class/backlight') {
  let nomes = [];
  try { nomes = fs.readdirSync(raiz); } catch { return null; }
  const ordem = { firmware: 0, platform: 1, raw: 2 };
  const lidas = nomes.map((nome) => {
    const ler = (a) => { try { return fs.readFileSync(path.join(raiz, nome, a), 'utf8').trim(); } catch { return ''; } };
    return { nome, tipo: ler('type'), max: Number(ler('max_brightness')) || 0, atual: Number(ler('brightness')) || 0 };
  }).filter((l) => l.max > 0);
  lidas.sort((a, b) => (ordem[a.tipo] ?? 3) - (ordem[b.tipo] ?? 3));
  return lidas[0] || null;
}

class Brilho {
  constructor({ plataforma = process.platform, volume } = {}) {
    this.plataforma = plataforma;
    this.volume = volume; // no Windows, o mesmo PowerShell do volume
  }

  /** { disponivel, nivel (0 a 100) } */
  async ler() {
    if (this.plataforma === 'linux') {
      const l = escolherLuz();
      return l ? { disponivel: true, nivel: Math.round((l.atual / l.max) * 100) } : { disponivel: false };
    }
    if (this.plataforma === 'win32') {
      try {
        this.volume.win = this.volume.win || new VolumeWindows();
        return { disponivel: true, nivel: await this.volume.win.brilho() };
      } catch {
        return { disponivel: false };
      }
    }
    return { disponivel: false };
  }

  async definir(nivel) {
    // Nunca apaga a tela de todo: o mínimo é 5%.
    const n = Math.max(5, Math.min(100, Math.round(Number(nivel) || 0)));
    if (this.plataforma === 'linux') {
      const l = escolherLuz();
      if (!l) return { disponivel: false };
      const v = String(Math.max(1, Math.round((n / 100) * l.max)));
      // O logind deixa a sessão aberta mudar o brilho sem senha; o brightnessctl e o arquivo, conforme as permissões.
      const jeitos = [
        () => rodar('busctl', ['call', 'org.freedesktop.login1', '/org/freedesktop/login1/session/auto', 'org.freedesktop.login1.Session', 'SetBrightness', 'ssu', 'backlight', l.nome, v], { timeout: 3000 }),
        () => rodar('brightnessctl', ['-q', '-d', l.nome, 'set', v], { timeout: 3000 }),
        () => fs.promises.writeFile(path.join('/sys/class/backlight', l.nome, 'brightness'), v),
      ];
      for (const j of jeitos) {
        try { await j(); break; } catch { }
      }
      return this.ler();
    }
    if (this.plataforma === 'win32') {
      try {
        this.volume.win = this.volume.win || new VolumeWindows();
        return { disponivel: true, nivel: await this.volume.win.brilho(n) };
      } catch {
        return this.ler();
      }
    }
    return { disponivel: false };
  }
}

/* ---------- A bateria ---------- */

/**
 * Há bateria neste computador? (O nível e a carga vêm da própria página, pelo navigator.getBattery;
 * mas ela não distingue um computador de mesa de um portátil carregado na tomada.)
 */
async function temBateria(plataforma = process.platform, volume = null) {
  try {
    if (plataforma === 'linux') {
      const raiz = '/sys/class/power_supply';
      return fs.readdirSync(raiz).some((n) => {
        const ler = (a) => { try { return fs.readFileSync(path.join(raiz, n, a), 'utf8').trim(); } catch { return ''; } };
        // As pilhas do mouse e do teclado sem fio também aparecem aqui, com scope = Device.
        return ler('type') === 'Battery' && ler('scope') !== 'Device';
      });
    }
    if (plataforma === 'darwin') return /InternalBattery/.test(await rodar('pmset', ['-g', 'batt'], { timeout: 4000 }));
    if (plataforma === 'win32' && volume) {
      volume.win = volume.win || new VolumeWindows();
      return Number((await volume.win.linha('bateria')).split(' ')[1]) > 0;
    }
  } catch { }
  return false;
}

/**
 * As baterias dos aparelhos sem fio (o mouse, o teclado, os fones), que o Linux lê sozinho
 * (o MX Master da Logitech, por exemplo, pelo hid-logitech-hidpp): o nome e a carga.
 */
const NIVEIS = { Full: 100, High: 80, Normal: 55, Low: 20, Critical: 5 };
function lerAparelhos(raiz = '/sys/class/power_supply') {
  let nomes = [];
  try { nomes = fs.readdirSync(raiz); } catch { return []; }
  return nomes.map((n) => {
    const ler = (a) => { try { return fs.readFileSync(path.join(raiz, n, a), 'utf8').trim(); } catch { return ''; } };
    if (ler('type') !== 'Battery' || ler('scope') !== 'Device') return null;
    const cap = ler('capacity');
    const nivel = cap !== '' ? Number(cap) : (NIVEIS[ler('capacity_level')] ?? null);
    return { nome: ler('model_name') || n, nivel: Number.isFinite(nivel) ? nivel : null, carregando: ler('status') === 'Charging' };
  }).filter(Boolean);
}

/* ---------- A rede ---------- */

class Rede {
  constructor({ plataforma = process.platform, shell } = {}) {
    this.plataforma = plataforma;
    this.shell = shell;
    this.nmcli = undefined;
  }

  async temNmcli() {
    if (this.nmcli !== undefined) return this.nmcli;
    if (this.plataforma !== 'linux') return (this.nmcli = false);
    try {
      await rodar('nmcli', ['-t', '-f', 'RUNNING', 'general'], { timeout: 4000 });
      this.nmcli = true;
    } catch {
      this.nmcli = false;
    }
    return this.nmcli;
  }

  /**
   * O estado da rede: { como, wifi: { existe, ligado, ssid, sinal, dispositivo }, cabo, conexao }.
   * "como" diz se dá para escolher as redes por aqui ('nmcli') ou só ver ('netsh', null).
   */
  async estado() {
    if (await this.temNmcli()) {
      try {
        const [dev, radio] = await Promise.all([
          rodar('nmcli', ['-t', '-f', 'DEVICE,TYPE,STATE,CONNECTION', 'device']),
          rodar('nmcli', ['-t', '-f', 'WIFI', 'radio']).catch(() => 'enabled'),
        ]);
        const lista = lerDispositivos(dev);
        const w = lista.find((d) => d.tipo === 'wifi');
        const cabo = lista.find((d) => d.tipo === 'ethernet' && d.estado.startsWith('connected'));
        let sinal = null;
        if (w && w.estado.startsWith('connected')) {
          const em = lerRedesWifi(await rodar('nmcli', ['-t', '-f', 'IN-USE,SSID,SIGNAL,SECURITY', 'device', 'wifi', 'list', '--rescan', 'no']).catch(() => '')).find((r) => r.emUso);
          sinal = em ? em.sinal : null;
        }
        return {
          como: 'nmcli',
          wifi: { existe: !!w, ligado: /enabled/.test(radio), dispositivo: w ? w.dispositivo : null, ssid: w && w.estado.startsWith('connected') ? w.conexao : null, sinal, conectando: !!w && w.estado.startsWith('connecting') },
          cabo: !!cabo,
          conexao: (cabo && cabo.conexao) || (w && w.estado.startsWith('connected') ? w.conexao : null),
        };
      } catch (e) {
        return { como: null, erro: erroCurto(e) };
      }
    }
    if (this.plataforma === 'win32') {
      try {
        const r = lerNetsh(await rodar('netsh', ['wlan', 'show', 'interfaces'], { timeout: 5000 }));
        return { como: 'netsh', wifi: { existe: true, ligado: true, ssid: r ? r.ssid : null, sinal: r ? r.sinal : null }, cabo: false, conexao: r ? r.ssid : null };
      } catch {
        return { como: 'netsh', wifi: { existe: false }, cabo: false, conexao: null };
      }
    }
    return { como: null };
  }

  /** As redes Wi-Fi por perto (com "procurar", pede ao Wi-Fi uma busca nova antes). */
  async redes(procurar = false) {
    if (!(await this.temNmcli())) return [];
    if (procurar) {
      await rodar('nmcli', ['device', 'wifi', 'rescan']).catch(() => { });
      await new Promise((r) => setTimeout(r, 2500));
    }
    const [lista, salvas] = await Promise.all([
      rodar('nmcli', ['-t', '-f', 'IN-USE,SSID,SIGNAL,SECURITY', 'device', 'wifi', 'list', '--rescan', 'no'])
        .catch(() => rodar('nmcli', ['-t', '-f', 'IN-USE,SSID,SIGNAL,SECURITY', 'device', 'wifi', 'list'])),
      this.salvas(),
    ]);
    return lerRedesWifi(lista).map((r) => ({ ...r, salva: salvas.has(r.ssid) }));
  }

  /** Os nomes das conexões Wi-Fi já guardadas no computador. */
  async salvas() {
    try {
      const s = await rodar('nmcli', ['-t', '-f', 'NAME,TYPE', 'connection', 'show']);
      return new Set(s.split('\n').filter(Boolean).map(camposNmcli).filter(([, t]) => /wireless/.test(t)).map(([n]) => n));
    } catch {
      return new Set();
    }
  }

  /**
   * Conecta a uma rede: pela conexão guardada, se houver; senão, com a senha.
   * Devolve { ok } ou { ok: false, precisaSenha } ou { ok: false, erro }.
   */
  async conectar(ssid, senha) {
    if (!(await this.temNmcli())) return { ok: false, erro: 'nmcli' };
    ssid = String(ssid);
    try {
      if (!senha && (await this.salvas()).has(ssid)) {
        await rodar('nmcli', ['connection', 'up', 'id', ssid], { timeout: 45000 });
        return { ok: true };
      }
      const args = ['device', 'wifi', 'connect', ssid];
      if (senha) args.push('password', String(senha));
      await rodar('nmcli', args, { timeout: 45000 });
      return { ok: true };
    } catch (e) {
      const erro = erroCurto(e);
      // Rede protegida, sem a senha ou com a senha errada.
      if (/secrets were required|no secrets|password|802-1x|psk|802-11-wireless-security/i.test(erro)) return { ok: false, precisaSenha: true, erro: senha ? erro : '' };
      return { ok: false, erro };
    }
  }

  async desconectar() {
    const e = await this.estado();
    if (!e.wifi || !e.wifi.dispositivo) return false;
    await rodar('nmcli', ['device', 'disconnect', e.wifi.dispositivo]).catch(() => { });
    return true;
  }

  async ligarWifi(ligar) {
    if (!(await this.temNmcli())) return false;
    await rodar('nmcli', ['radio', 'wifi', ligar ? 'on' : 'off']).catch(() => { });
    return true;
  }

  /** As configurações de rede do próprio sistema (fora do Retro Computer). */
  async configuracoes() {
    const abrirUrl = (u) => (this.shell ? this.shell.openExternal(u).then(() => true, () => false) : false);
    if (this.plataforma === 'win32') return abrirUrl('ms-settings:network');
    if (this.plataforma === 'darwin') return abrirUrl('x-apple.systempreferences:com.apple.preference.network');
    for (const [cmd, args] of [['nm-connection-editor', []], ['gnome-control-center', ['network']], ['systemsettings', ['kcm_networkmanagement']]]) {
      try {
        const p = spawn(cmd, args, { detached: true, stdio: 'ignore' });
        const ok = await new Promise((r) => { p.on('error', () => r(false)); p.on('spawn', () => r(true)); });
        if (ok) { p.unref(); return true; }
      } catch { }
    }
    return false;
  }
}

/* ---------- Para os testes e as capturas (RETRO_BANDEJA_FALSA=1): o volume, o brilho e o Wi-Fi de mentira ---------- */

function bandejaFalsa() {
  let vol = { disponivel: true, como: 'teste', nivel: 60, mudo: false };
  let luz = { disponivel: true, nivel: 70 };
  let ligado = true;
  let atual = 'Casa';
  const redes = [
    { ssid: 'Casa', sinal: 82, protegida: true, seguranca: 'WPA2', salva: true },
    { ssid: 'Escritório 5G', sinal: 64, protegida: true, seguranca: 'WPA2', salva: false },
    { ssid: 'Biblioteca Municipal', sinal: 41, protegida: false, seguranca: '', salva: false },
    { ssid: 'Vizinho', sinal: 18, protegida: true, seguranca: 'WPA1 WPA2', salva: false },
  ];
  const estado = () => ({ como: 'nmcli', wifi: { existe: true, ligado, dispositivo: 'wlan0', ssid: ligado ? atual : null, sinal: ligado && atual ? (redes.find((r) => r.ssid === atual) || {}).sinal : null }, cabo: false, conexao: ligado ? atual : null });
  return {
    // A bateria de mentira: 42%, sem carregar, umas 2 horas; e um mouse sem fio.
    bateria: async () => ({ existe: true, falsa: { nivel: 0.42, carregando: false, restante: 7800 } }),
    aparelhos: async () => [{ nome: 'MX Master 3S', nivel: 80, carregando: false }],
    volume: { ler: async () => vol, definir: async (o) => { vol = { ...vol, ...(o.nivel != null ? { nivel: Math.round(o.nivel) } : {}), ...(o.mudo != null ? { mudo: !!o.mudo } : {}) }; return vol; }, fechar() { } },
    brilho: { ler: async () => luz, definir: async (n) => { luz = { disponivel: true, nivel: Math.max(5, Math.min(100, Math.round(n))) }; return luz; } },
    rede: {
      estado: async () => estado(),
      redes: async () => (ligado ? redes.map((r) => ({ ...r, emUso: r.ssid === atual })).sort((a, b) => (b.emUso - a.emUso) || (b.sinal - a.sinal)) : []),
      conectar: async (ssid, senha) => {
        const r = redes.find((x) => x.ssid === ssid);
        if (!r) return { ok: false, erro: 'No network with SSID' };
        if (r.protegida && !r.salva && !senha) return { ok: false, precisaSenha: true, erro: '' };
        if (r.protegida && !r.salva && senha !== 'senha123') return { ok: false, precisaSenha: true, erro: 'Secrets were required, but not provided.' };
        r.salva = true;
        atual = ssid;
        return { ok: true };
      },
      desconectar: async () => { atual = null; return true; },
      ligarWifi: async (v) => { ligado = !!v; if (!ligado) atual = null; return true; },
      configuracoes: async () => true,
    },
  };
}

module.exports = { Volume, Brilho, Rede, temBateria, lerAparelhos, bandejaFalsa, escolherLuz, lerWpctl, lerPactl, lerAmixer, lerMac, camposNmcli, lerDispositivos, lerRedesWifi, lerNetsh, erroCurto, VOLUME_WINDOWS, VolumeWindows };
