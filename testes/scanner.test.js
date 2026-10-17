'use strict';
/* Os scanners (scanner.js): a leitura das saídas do scanimage e os roteiros do WIA. Rodar: npm test */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const S = require('../src/principal/scanner.js');

test('scanner: a lista do scanimage, sem o mesmo aparelho repetido pela rede', () => {
  const saida = [
    'airscan:e0:HP LaserJet MFP M28w\tHP\tLaserJet MFP M28w\teSCL network scanner',
    'escl:https://192.168.1.20:443\tHP\tLaserJet MFP M28w\tflatbed scanner',
    'pixma:04A91912_123456\tCANON\tCanon PIXMA MG2500\tmulti-function peripheral',
    'v4l:/dev/video0\tNoname\tWebcam\tvirtual device',
    '',
  ].join('\n');
  assert.deepEqual(S.lerLista(saida), [
    { id: 'airscan:e0:HP LaserJet MFP M28w', nome: 'HP LaserJet MFP M28w', tipo: 'eSCL network scanner' },
    { id: 'pixma:04A91912_123456', nome: 'CANON Canon PIXMA MG2500', tipo: 'multi-function peripheral' },
    { id: 'v4l:/dev/video0', nome: 'Noname Webcam', tipo: 'virtual device' },
  ]);
  assert.deepEqual(S.lerLista('\nNo scanners were identified.\n'), []);
});

test('scanner: as escolhas do scanimage -A (os modos, as resoluções em lista ou em faixa, as origens)', () => {
  const pixma = `All options specific to device \`pixma:04A91912':
  Scan mode:
    --resolution auto||75|150|300|600|1200dpi [75]
        Sets the resolution of the scanned image.
    --mode auto||Color|Gray|Lineart [Color]
        Selects the scan mode (e.g., lineart, monochrome, or color).
    --source Flatbed|Automatic Document Feeder [Flatbed]
        Selects the scan source.`;
  assert.deepEqual(S.lerOpcoes(pixma), { modos: ['Color', 'Gray', 'Lineart'], resolucoes: [75, 150, 300, 600, 1200], origens: ['Flatbed', 'Automatic Document Feeder'] });
  const faixa = '    --resolution 50..1200dpi (in steps of 1) [150]\n    --mode Color|Gray [Color]\n';
  assert.deepEqual(S.lerOpcoes(faixa), { modos: ['Color', 'Gray'], resolucoes: [150, 200, 300, 600], origens: [] });
  assert.equal(S.modoSane('cinza', ['Color', 'Gray', 'Lineart']), 'Gray');
  assert.equal(S.modoSane('pb', ['Color', 'Gray', 'Lineart']), 'Lineart');
  assert.equal(S.modoSane('pb', ['Color', 'Gray']), null);
  assert.equal(S.modoSane('cor', ['color', 'gray']), 'color');
  assert.equal(S.resolucaoMaisPerto(200, [75, 150, 300, 600]), 150);
  assert.equal(S.resolucaoMaisPerto(250, [75, 150, 300, 600]), 300);
  assert.equal(S.resolucaoMaisPerto(300, []), 300);
});

test('scanner: só se digitaliza num scanner da última lista', async () => {
  const s = new S.Scanners({ plataforma: 'linux' });
  await assert.rejects(s.digitalizar('-o /tmp/x', {}), (e) => e.codigo === 'sem-scanner');
  const m = new S.Scanners({ plataforma: 'darwin' });
  assert.deepEqual(await m.listar(), { disponivel: false, motivo: 'mac', scanners: [] });
});

const PWSH = [process.env.RETRO_PWSH, 'pwsh', process.platform === 'win32' ? 'powershell.exe' : null]
  .filter(Boolean).find((c) => spawnSync(c, ['-NoProfile', '-Command', 'exit 0']).status === 0);

test('scanner: a sintaxe dos roteiros do WIA (e a lista, no Windows)', { skip: !PWSH && 'sem o PowerShell' }, () => {
  for (const texto of [S.LISTAR_WIA, S.DIGITALIZAR_WIA]) {
    const r = spawnSync(PWSH, ['-NoProfile', '-Command', '$e = $null; [void][System.Management.Automation.Language.Parser]::ParseInput($env:ROTEIRO, [ref]$null, [ref]$e); exit $e.Count'], { env: { ...process.env, ROTEIRO: texto } });
    assert.strictEqual(r.status, 0);
  }
  // Sem o WIA (fora do Windows) ou sem scanner, a lista é vazia, e não um erro.
  const r = spawnSync(PWSH, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(S.LISTAR_WIA, 'utf16le').toString('base64')]);
  assert.strictEqual(r.status, 0, String(r.stderr));
  assert.ok(Array.isArray(JSON.parse(String(r.stdout).trim() || '[]')));
});
