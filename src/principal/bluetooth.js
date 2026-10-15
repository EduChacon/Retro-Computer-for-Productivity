'use strict';
/*
 * O Bluetooth no Linux, pelo bluetoothctl (BlueZ): ligar e desligar, os aparelhos (com a
 * bateria, quando o aparelho informa), procurar, parear, conectar, desconectar e esquecer.
 *
 * O pareamento é uma conversa com o bluetoothctl: os teclados costumam pedir que se digite
 * um código neles, e outros aparelhos pedem para confirmar um número. Cada pergunta vai para
 * a área de trabalho (aoPergunta) e a resposta volta (responder).
 */
const { execFile, spawn } = require('node:child_process');

function rodar(args, { timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile('bluetoothctl', args, { timeout, env: { ...process.env, LC_ALL: 'C' } }, (erro, saida, serr) => {
      if (erro) { erro.saida = String(saida || '') + String(serr || ''); return reject(erro); }
      resolve(String(saida));
    });
  });
}

const limpar = (s) => String(s).replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/\r/g, '\n').replace(/\x01|\x02/g, '');
const macValido = (m) => /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(String(m || ''));
const campo = (texto, nome) => { const m = new RegExp('^\\s*' + nome + ':\\s*(.+)$', 'm').exec(texto); return m ? m[1].trim() : null; };

/** bluetoothctl show → { existe, ligado, procurando, nome } */
function lerShow(texto) {
  const t = limpar(texto);
  if (!/^Controller /m.test(t)) return { existe: false, ligado: false, procurando: false, nome: '' };
  return { existe: true, ligado: campo(t, 'Powered') === 'yes', procurando: campo(t, 'Discovering') === 'yes', nome: campo(t, 'Alias') || campo(t, 'Name') || '' };
}

/** bluetoothctl devices → [{ mac, nome }] */
function lerDevices(texto) {
  const r = [];
  for (const linha of limpar(texto).split('\n')) {
    const m = /^Device\s+(([0-9A-F]{2}:){5}[0-9A-F]{2})\s*(.*)$/i.exec(linha.trim());
    if (m) r.push({ mac: m[1].toUpperCase(), nome: m[3].trim() || m[1] });
  }
  return r;
}

/** bluetoothctl info MAC → { nome, tipo, pareado, conectado, confiavel, bateria } */
function lerInfo(texto) {
  const t = limpar(texto);
  const bat = /Battery Percentage:\s*0x[0-9a-f]+\s*\((\d+)\)/i.exec(t);
  const icone = campo(t, 'Icon') || '';
  // O tipo pelo ícone do BlueZ (input-mouse, input-keyboard, audio-headset, phone…).
  const tipo = /mouse|tablet/.test(icone) ? 'mouse' : /keyboard/.test(icone) ? 'teclado' : /gaming|joystick/.test(icone) ? 'controle'
    : /audio|headset|headphone/.test(icone) ? 'som' : /phone/.test(icone) ? 'telefone' : /computer/.test(icone) ? 'computador' : 'outro';
  return {
    nome: campo(t, 'Alias') || campo(t, 'Name') || '',
    tipo,
    pareado: campo(t, 'Paired') === 'yes',
    conectado: campo(t, 'Connected') === 'yes',
    confiavel: campo(t, 'Trusted') === 'yes',
    bateria: bat ? Number(bat[1]) : null,
  };
}

/**
 * Uma linha do bluetoothctl durante o pareamento → o que fazer:
 * { pergunta: 'digitar'|'confirmar'|'pin'|'autorizar', codigo? } | { fim: 'pareado'|'conectado'|'falhou', erro? } | null
 */
function lerLinhaPareamento(linha) {
  const l = limpar(linha);
  let m;
  if ((m = /Passkey:\s*(\d{1,6})/i.exec(l)) && !/Confirm/i.test(l)) return { pergunta: 'digitar', codigo: m[1].padStart(6, '0') };
  if ((m = /Confirm passkey\s+(\d{1,6})/i.exec(l))) return { pergunta: 'confirmar', codigo: m[1].padStart(6, '0') };
  if (/Request confirmation/i.test(l) && (m = /(\d{6})/.exec(l))) return { pergunta: 'confirmar', codigo: m[1] };
  if (/Enter PIN code/i.test(l)) return { pergunta: 'pin' };
  if (/Authorize service/i.test(l)) return { pergunta: 'autorizar' };
  if (/Pairing successful/i.test(l)) return { fim: 'pareado' };
  if (/Connection successful/i.test(l)) return { fim: 'conectado' };
  if ((m = /Failed to (pair|connect):\s*(.*)$/i.exec(l))) return { fim: 'falhou', erro: m[2].trim() };
  if (/not available/i.test(l)) return { fim: 'falhou', erro: 'nao-encontrado' };
  return null;
}

class Bluetooth {
  constructor({ plataforma = process.platform, aoPergunta = () => { } } = {}) {
    this.plataforma = plataforma;
    this.aoPergunta = aoPergunta;
    this.conversa = null;
  }

  async estado() {
    if (this.plataforma !== 'linux') return { existe: false, sistema: this.plataforma };
    try { return lerShow(await rodar(['show'], { timeout: 5000 })); } catch { return { existe: false }; }
  }

  async ligar(ligado) {
    try {
      await rodar(['power', ligado ? 'on' : 'off']);
      return { ok: true };
    } catch (e) {
      // Bloqueado pelo botão do avião (rfkill): o BlueZ avisa.
      return { ok: false, bloqueado: /rfkill|blocked/i.test(e.saida || ''), erro: limpar(e.saida || e.message).trim().split('\n').pop() };
    }
  }

  /** Os aparelhos conhecidos (pareados e os achados na última procura), com o estado de cada um. */
  async aparelhos() {
    let lista = [];
    try { lista = lerDevices(await rodar(['devices'])); } catch { return []; }
    const r = [];
    for (const d of lista.slice(0, 40)) {
      try { r.push({ mac: d.mac, ...lerInfo(await rodar(['info', d.mac], { timeout: 5000 })), nome: d.nome }); } catch { r.push({ mac: d.mac, nome: d.nome, tipo: 'outro', pareado: false, conectado: false }); }
    }
    return r;
  }

  /** Procura aparelhos por alguns segundos (eles precisam estar no modo de pareamento). */
  async procurar(segundos = 12) {
    try { await rodar(['--timeout', String(segundos), 'scan', 'on'], { timeout: (segundos + 5) * 1000 }); } catch { }
    return this.aparelhos();
  }

  async simples(acao, mac) {
    if (!macValido(mac)) return { ok: false, erro: 'endereco' };
    try {
      const s = limpar(await rodar([acao, mac], { timeout: 25000 }));
      const falhou = /Failed|not available|Error/i.exec(s);
      return falhou ? { ok: false, erro: s.trim().split('\n').pop() } : { ok: true };
    } catch (e) {
      return { ok: false, erro: limpar(e.saida || e.message).trim().split('\n').pop() };
    }
  }

  conectar(mac) { return this.simples('connect', mac); }
  desconectar(mac) { return this.simples('disconnect', mac); }
  esquecer(mac) { return this.simples('remove', mac); }

  /** Pareia, confia e conecta. As perguntas do aparelho vão para aoPergunta({ mac, pergunta, codigo }). */
  parear(mac) {
    if (!macValido(mac)) return Promise.resolve({ ok: false, erro: 'endereco' });
    if (this.conversa) return Promise.resolve({ ok: false, erro: 'ocupado' });
    return new Promise((resolve) => {
      const p = spawn('bluetoothctl', [], { env: { ...process.env, LC_ALL: 'C' } });
      const escrever = (s) => { try { p.stdin.write(s + '\n'); } catch { } };
      let pareado = false;
      let resto = '';
      const fim = (r) => {
        if (!this.conversa) return;
        clearTimeout(limite);
        this.conversa = null;
        escrever('scan off');
        escrever('quit');
        setTimeout(() => p.kill(), 1500);
        resolve(r);
      };
      const limite = setTimeout(() => fim({ ok: pareado, conectado: false, erro: pareado ? null : 'tempo' }), 90000);
      this.conversa = { responder: (resposta) => escrever(String(resposta)), cancelar: () => fim({ ok: false, erro: 'cancelado' }) };
      p.on('error', () => fim({ ok: false, erro: 'bluetoothctl' }));
      p.stdout.on('data', (d) => {
        resto += String(d);
        const linhas = resto.split(/\n|\r/);
        resto = linhas.pop();
        // As perguntas ("(yes/no):", "PIN code:") não terminam a linha: a parte sem quebra conta
        // só quando já chegou inteira.
        const prontas = [...linhas];
        if (/\(yes\/no\):\s*$|PIN code:\s*$/i.test(limpar(resto))) { prontas.push(resto); resto = ''; }
        for (const linha of prontas) {
          const r = lerLinhaPareamento(linha);
          if (!r) continue;
          if (r.pergunta === 'autorizar') { escrever('yes'); continue; }
          if (r.pergunta) { this.aoPergunta({ mac, ...r }); continue; }
          if (r.fim === 'pareado' && !pareado) {
            pareado = true;
            this.aoPergunta({ mac, pergunta: 'pronto' });
            escrever(`trust ${mac}`);
            escrever(`connect ${mac}`);
          } else if (r.fim === 'conectado') fim({ ok: true, conectado: true });
          else if (r.fim === 'falhou') fim(pareado ? { ok: true, conectado: false, erro: r.erro } : { ok: false, erro: r.erro });
        }
      });
      escrever('agent KeyboardDisplay');
      escrever('default-agent');
      escrever('scan on');
      setTimeout(() => escrever(`pair ${mac}`), 2500);
    });
  }

  responder(resposta) {
    if (this.conversa) this.conversa.responder(resposta);
  }

  cancelar() {
    if (this.conversa) this.conversa.cancelar();
  }
}

/** Para os testes e as capturas (RETRO_BLUETOOTH_FALSO=1): um mouse pareado e um teclado para parear. */
class BluetoothFalso extends Bluetooth {
  constructor(o) {
    super(o);
    this.ligado = true;
    this.lista = [
      { mac: 'C0:FF:EE:00:00:01', nome: 'MX Master 3S', tipo: 'mouse', pareado: true, conectado: true, confiavel: true, bateria: 85 },
      { mac: 'C0:FF:EE:00:00:02', nome: 'Fones de ouvido', tipo: 'som', pareado: true, conectado: false, confiavel: true, bateria: null },
    ];
  }

  async estado() { return { existe: true, ligado: this.ligado, procurando: false, nome: 'retro' }; }
  async ligar(v) { this.ligado = v; return { ok: true }; }
  async aparelhos() { return this.ligado ? this.lista.map((a) => ({ ...a })) : []; }
  async procurar() {
    if (!this.lista.some((a) => a.tipo === 'teclado')) this.lista.push({ mac: 'C0:FF:EE:00:00:03', nome: '8BitDo Retro Keyboard', tipo: 'teclado', pareado: false, conectado: false, confiavel: false, bateria: null });
    return this.aparelhos();
  }
  async conectar(mac) { const a = this.lista.find((x) => x.mac === mac); if (a) a.conectado = true; return { ok: true }; }
  async desconectar(mac) { const a = this.lista.find((x) => x.mac === mac); if (a) a.conectado = false; return { ok: true }; }
  async esquecer(mac) { this.lista = this.lista.filter((x) => x.mac !== mac); return { ok: true }; }
  parear(mac) {
    return new Promise((resolve) => {
      this.aoPergunta({ mac, pergunta: 'digitar', codigo: '482913' });
      this.conversa = {
        responder: () => { },
        cancelar: () => { this.conversa = null; resolve({ ok: false, erro: 'cancelado' }); },
      };
      setTimeout(() => {
        if (!this.conversa) return;
        this.conversa = null;
        const a = this.lista.find((x) => x.mac === mac);
        if (a) Object.assign(a, { pareado: true, conectado: true, confiavel: true });
        resolve({ ok: true, conectado: true });
      }, 2500);
    });
  }
}

module.exports = { Bluetooth, BluetoothFalso, lerShow, lerDevices, lerInfo, lerLinhaPareamento, macValido };
