/*
 * O nascer e o pôr do sol de hoje, sem perguntar onde o computador está: a posição é a da cidade de
 * referência do fuso horário (São Paulo, para America/Sao_Paulo), da base de fusos horários
 * (fusos-dados.js). A conta é a "equação do nascer do sol", com a refração e o raio do sol (−0,833°),
 * certa por um ou dois minutos. Serve à troca do esquema de cores à noite e à luz noturna.
 */
import { FUSOS } from './fusos-dados.js';

const RAD = Math.PI / 180;
const DIA = 86400000;
const juliano = (ms) => ms / DIA + 2440587.5;
const doJuliano = (j) => Math.round((j - 2440587.5) * DIA);

/** O fuso horário do computador (o nome da base de fusos, como "America/Sao_Paulo"), ou ''. */
export function fusoDoComputador() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; }
}

/** A latitude e a longitude da cidade do fuso ([lat, lon], o leste e o norte positivos), ou null. */
export function lugarDoFuso(fuso) {
  return Object.prototype.hasOwnProperty.call(FUSOS, fuso) ? FUSOS[fuso] : null;
}

/**
 * O nascer e o pôr do sol do dia solar mais perto do instante (o do meio-dia solar mais perto dele,
 * sem depender do fuso de quem pergunta), na latitude e na longitude: { nascer, por } (em Date), ou
 * { sempre: 'dia' } e { sempre: 'noite' } perto dos polos. Às 23h, é o dia que termina; à 1h, o que começa.
 */
export function solDoDia(data, lat, lon) {
  const instante = juliano(data.getTime());
  const n = Math.round(instante - 2451545 + 0.0008);
  const j = n - lon / 360; // o meio-dia solar médio, em dias desde 2000
  const m = (357.5291 + 0.98560028 * j) % 360; // a anomalia média
  const mr = m * RAD;
  const centro = 1.9148 * Math.sin(mr) + 0.02 * Math.sin(2 * mr) + 0.0003 * Math.sin(3 * mr);
  const eclip = ((m + centro + 180 + 102.9372) % 360) * RAD; // a longitude do sol na eclíptica
  let transito = 2451545 + j + 0.0053 * Math.sin(mr) - 0.0069 * Math.sin(2 * eclip);
  transito += Math.round(instante - transito); // o meio-dia solar mais perto do instante
  const senDec = Math.sin(eclip) * Math.sin(23.4397 * RAD);
  const cosDec = Math.cos(Math.asin(senDec));
  const cosH = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * senDec) / (Math.cos(lat * RAD) * cosDec);
  if (cosH > 1) return { sempre: 'noite' };
  if (cosH < -1) return { sempre: 'dia' };
  const meio = Math.acos(cosH) / RAD / 360; // meio arco do dia, em dias
  return { nascer: new Date(doJuliano(transito - meio)), por: new Date(doJuliano(transito + meio)) };
}

/** O sol de hoje no fuso: { fuso, nascer, por } ou { fuso, sempre }, ou null sem a cidade do fuso. */
export function solDoFuso(agora = new Date(), fuso = fusoDoComputador()) {
  const lugar = lugarDoFuso(fuso);
  return lugar ? { fuso, ...solDoDia(agora, lugar[0], lugar[1]) } : null;
}

/** Entre as horas de e ate (passando da meia-noite quando de > ate); de igual a ate vale o dia todo. */
export function entreAsHoras(agora, de, ate) {
  const hora = agora.getHours() + agora.getMinutes() / 60;
  if (de === ate) return true;
  return de < ate ? hora >= de && hora < ate : hora >= de || hora < ate;
}

/**
 * É noite agora? Com quando "sol", do pôr ao nascer do sol do fuso (sem a cidade do fuso, valem as
 * horas); com "horas", das de às ate.
 */
export function noiteAgora({ quando = 'sol', de = 19, ate = 7 } = {}, agora = new Date(), fuso = fusoDoComputador()) {
  const h1 = Number.isFinite(Number(de)) ? Number(de) : 19;
  const h2 = Number.isFinite(Number(ate)) ? Number(ate) : 7;
  if (quando === 'sol') {
    const s = solDoFuso(agora, fuso);
    if (s && s.sempre) return s.sempre === 'noite';
    if (s) return agora < s.nascer || agora >= s.por;
  }
  return entreAsHoras(agora, h1, h2);
}
