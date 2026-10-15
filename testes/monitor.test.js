'use strict';
// O Monitor do sistema: a leitura do processador, da memória e da lista de processos, e o que
// nunca pode ser finalizado.
const test = require('node:test');
const assert = require('node:assert');
const m = require('../src/principal/monitor.js');

test('monitor: a porcentagem do processador entre duas leituras', () => {
  const antes = { ocupado: 1000, total: 4000 };
  assert.strictEqual(m.porcentagemCpu(antes, { ocupado: 1500, total: 5000 }), 50);
  assert.strictEqual(m.porcentagemCpu(antes, antes), 0);
  assert.strictEqual(m.porcentagemCpu(antes, { ocupado: 3000, total: 4500 }), 100);
  const t = m.temposCpu([{ times: { user: 10, nice: 0, sys: 5, idle: 85, irq: 0 } }, { times: { user: 20, nice: 0, sys: 0, idle: 80, irq: 0 } }]);
  assert.deepStrictEqual(t, { ocupado: 35, total: 200 });
});

test('monitor: a memória disponível do Linux e a lista do ps e do Windows', () => {
  assert.deepStrictEqual(m.lerMeminfo('MemTotal:       16000000 kB\nMemFree:          500000 kB\nMemAvailable:    8000000 kB\n'), { total: 16384000000, disponivel: 8192000000 });
  assert.deepStrictEqual(m.lerMeminfo('MemTotal: 1000 kB\nMemFree: 200 kB\n'), { total: 1024000, disponivel: 204800 });
  assert.strictEqual(m.lerMeminfo(''), null);
  assert.deepStrictEqual(m.lerPs('  412 eduardo   12.5 204800 firefox\n    1 root      0.0  1024 systemd\n 900 eduardo 0.0 512 /usr/lib/x/Web Content\nlixo\n'), [
    { pid: 412, usuario: 'eduardo', cpu: 12.5, memoria: 209715200, nome: 'firefox' },
    { pid: 1, usuario: 'root', cpu: 0, memoria: 1048576, nome: 'systemd' },
    { pid: 900, usuario: 'eduardo', cpu: 0, memoria: 524288, nome: 'Web Content' },
  ]);
  assert.deepStrictEqual(m.lerProcessosWindows('[{"Id":40,"ProcessName":"notepad","WorkingSet64":1048576}]'), [{ pid: 40, usuario: '', cpu: null, memoria: 1048576, nome: 'notepad' }]);
  assert.deepStrictEqual(m.lerProcessosWindows('{"Id":7,"ProcessName":"x","WorkingSet64":0}').length, 1);
  assert.deepStrictEqual(m.lerProcessosWindows('não é json'), []);
});

test('monitor: nunca finaliza o Retro Computer, o init nem um pid inválido', () => {
  const mon = new m.Monitor({ app: { getAppMetrics: () => [{ pid: 4242, cpu: { percentCPUUsage: 1 }, memory: { workingSetSize: 100 } }] } });
  assert.deepStrictEqual(mon.finalizar(process.pid), { ok: false, erro: 'protegido' });
  assert.deepStrictEqual(mon.finalizar(4242), { ok: false, erro: 'protegido' });
  assert.deepStrictEqual(mon.finalizar(1), { ok: false, erro: 'protegido' });
  assert.deepStrictEqual(mon.finalizar('abc'), { ok: false, erro: 'protegido' });
  const a = mon.amostra();
  assert.ok(a.memoria.total > 0 && a.memoria.emUso > 0 && a.nucleos > 0);
  assert.strictEqual(a.retro.memoria, 102400);
});
