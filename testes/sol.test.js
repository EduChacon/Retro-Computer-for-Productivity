'use strict';
// O nascer e o pôr do sol pelo fuso horário (sol.js) e a troca do esquema de cores à noite (esquemas.js).
const test = require('node:test');
const assert = require('node:assert/strict');

const carregar = () => import('../src/sistema/js/sol.js');

// Os minutos do dia em UTC (para comparar sem depender do fuso de quem roda os testes).
const minutosUtc = (d) => d.getUTCHours() * 60 + d.getUTCMinutes();
const perto = (a, b, tol, msg) => {
  let x = Math.abs(a - b) % 1440;
  if (x > 720) x = 1440 - x;
  assert.ok(x <= tol, `${msg}: ${a} e ${b} (diferença de ${x} min)`);
};

test('sol: o nascer e o pôr conferem com o algoritmo do NOAA (até 3 minutos)', async () => {
  const { solDoDia } = await carregar();
  // [ano, mês, dia, latitude, longitude, nascer e pôr em minutos UTC, pela planilha do NOAA]
  const casos = [
    [2026, 10, 17, -23.5, -46.6, 8 * 60 + 31, 21 * 60 + 11], // São Paulo
    [2026, 6, 21, -23.5, -46.6, 9 * 60 + 47, 20 * 60 + 28],
    [2026, 12, 21, 51.5, -0.1, 8 * 60 + 3, 15 * 60 + 53], // Londres
    [2026, 6, 21, 51.5, -0.1, 3 * 60 + 42, 20 * 60 + 21],
    [2026, 1, 15, 35.7, 139.7, 21 * 60 + 50, 7 * 60 + 49], // Tóquio
    [2026, 9, 1, -33.9, 151.2, 20 * 60 + 14, 7 * 60 + 36], // Sydney
  ];
  for (const [a, m, d, lat, lon, nascer, por] of casos) {
    // O meio-dia solar local de cada lugar, em UTC (12h menos a longitude em horas).
    const s = solDoDia(new Date(Date.UTC(a, m - 1, d, 12) - (lon / 15) * 3600000), lat, lon);
    perto(minutosUtc(s.nascer), nascer, 3, `nascer em ${lat},${lon} ${a}-${m}-${d}`);
    perto(minutosUtc(s.por), por, 3, `pôr em ${lat},${lon} ${a}-${m}-${d}`);
    assert.ok(s.nascer < s.por, 'o nascer vem antes do pôr');
  }
});

test('sol: perto dos polos, o dia ou a noite o dia todo', async () => {
  const { solDoDia } = await carregar();
  assert.deepEqual(solDoDia(new Date(2026, 5, 21, 12), 78, 16), { sempre: 'dia' }); // Longyearbyen, junho
  assert.deepEqual(solDoDia(new Date(2026, 11, 21, 12), 78, 16), { sempre: 'noite' }); // dezembro
});

test('sol: a cidade do fuso, os nomes antigos e o fuso sem cidade', async () => {
  const { lugarDoFuso, noiteAgora, entreAsHoras } = await carregar();
  assert.deepEqual(lugarDoFuso('America/Sao_Paulo'), [-23.5, -46.6]);
  assert.deepEqual(lugarDoFuso('Brazil/East'), [-23.5, -46.6]);
  assert.ok(lugarDoFuso('Europe/Kyiv') && lugarDoFuso('Europe/Kiev'));
  assert.equal(lugarDoFuso('UTC'), null);
  assert.equal(lugarDoFuso('__proto__'), null);
  // Sem a cidade do fuso, valem as horas (19 às 7, ou as escolhidas).
  assert.equal(noiteAgora({ quando: 'sol' }, new Date(2026, 9, 17, 12), 'UTC'), false);
  assert.equal(noiteAgora({ quando: 'sol' }, new Date(2026, 9, 17, 20), 'UTC'), true);
  assert.equal(noiteAgora({ quando: 'horas', de: 22, ate: 6 }, new Date(2026, 9, 17, 21)), false);
  assert.equal(noiteAgora({ quando: 'horas', de: 22, ate: 6 }, new Date(2026, 9, 17, 23)), true);
  assert.equal(entreAsHoras(new Date(2026, 0, 1, 3), 8, 8), true);
  assert.equal(entreAsHoras(new Date(2026, 0, 1, 9), 8, 17), true);
  assert.equal(entreAsHoras(new Date(2026, 0, 1, 18), 8, 17), false);
});

// As horas de São Paulo (UTC−3), qualquer que seja o fuso de quem roda os testes.
const sp = (dia, hora, min = 0) => new Date(Date.UTC(2026, 9, dia, hora + 3, min));

test('sol: em São Paulo, é noite depois do pôr e antes do nascer do sol', async () => {
  const { solDoFuso, noiteAgora } = await carregar();
  const meio = sp(17, 12);
  const s = solDoFuso(meio, 'America/Sao_Paulo');
  assert.equal(s.fuso, 'America/Sao_Paulo');
  // Hoje (17/10/2026), o sol nasce às 5:31 e se põe às 18:11 em São Paulo.
  perto(minutosUtc(s.nascer), 8 * 60 + 31, 2, 'nascer em São Paulo');
  perto(minutosUtc(s.por), 21 * 60 + 11, 2, 'pôr em São Paulo');
  // Às 23h e à 1h da noite seguinte, a mesma noite.
  assert.equal(noiteAgora({ quando: 'sol' }, sp(17, 23), 'America/Sao_Paulo'), true);
  assert.equal(noiteAgora({ quando: 'sol' }, sp(18, 1), 'America/Sao_Paulo'), true);
  const mais = (d, min) => new Date(d.getTime() + min * 60000);
  assert.equal(noiteAgora({ quando: 'sol' }, meio, 'America/Sao_Paulo'), false);
  assert.equal(noiteAgora({ quando: 'sol' }, mais(s.por, 1), 'America/Sao_Paulo'), true);
  assert.equal(noiteAgora({ quando: 'sol' }, mais(s.por, -1), 'America/Sao_Paulo'), false);
  assert.equal(noiteAgora({ quando: 'sol' }, mais(s.nascer, -1), 'America/Sao_Paulo'), true);
  assert.equal(noiteAgora({ quando: 'sol' }, mais(s.nascer, 1), 'America/Sao_Paulo'), false);
});

test('esquemas: a troca à noite usa o esquema da noite só com ela ligada e só à noite', async () => {
  const { esquemaDaHora } = await import('../src/sistema/js/esquemas.js');
  const dia = new Date(2026, 9, 17, 12);
  const noite = new Date(2026, 9, 17, 23);
  const c = { esquema: 'oceano', esquemaNoite: { ligado: true, esquema: 'meianoite', quando: 'horas', de: 19, ate: 7 } };
  assert.equal(esquemaDaHora(c, dia), 'oceano');
  assert.equal(esquemaDaHora(c, noite), 'meianoite');
  assert.equal(esquemaDaHora({ ...c, esquemaNoite: { ...c.esquemaNoite, ligado: false } }, noite), 'oceano');
  // Um nome que não existe vale o Padrão; sem o da noite, o Noite.
  assert.equal(esquemaDaHora({ esquema: 'nada', esquemaNoite: { ligado: true, esquema: 'xyz', quando: 'horas' } }, noite), 'padrao');
  assert.equal(esquemaDaHora({ esquemaNoite: { ligado: true, quando: 'horas' } }, noite), 'noite');
  assert.equal(esquemaDaHora({}, noite), 'padrao');
  // Pelo sol, no fuso de São Paulo.
  const sol = { esquema: 'padrao', esquemaNoite: { ligado: true, esquema: 'noite', quando: 'sol' } };
  assert.equal(esquemaDaHora(sol, sp(17, 12), 'America/Sao_Paulo'), 'padrao');
  assert.equal(esquemaDaHora(sol, sp(17, 23), 'America/Sao_Paulo'), 'noite');
});
