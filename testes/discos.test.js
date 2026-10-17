'use strict';
// O programa Discos: a leitura do lsblk, do Get-Disk e do diskutil (só os discos de USB e os cartões,
// nunca os do sistema), os comandos do administrador no Windows, o andamento e o fim da gravação, a
// gravação de verdade pelos roteiros (num arquivo no lugar do disco) e a limpeza do disco C:.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const D = require('../src/principal/discos.js');
const { limparRotulo } = require('../src/principal/unidades.js');
const { Disco } = require('../src/principal/disco.js');

const PS = path.join(__dirname, '..', 'src', 'principal', 'ps');

test('discos do Linux: os de USB e os cartões; nunca o do sistema, um interno que aceita "hotplug" nem o loop', () => {
  const json = JSON.stringify({ blockdevices: [
    { name: 'sda', path: '/dev/sda', type: 'disk', size: 256e9, model: 'SSD', vendor: 'ATA', tran: 'sata', rm: false, hotplug: false,
      children: [{ name: 'sda1', path: '/dev/sda1', type: 'part', size: 255e9, fstype: 'ext4', mountpoint: '/' }] },
    { name: 'sdb', path: '/dev/sdb', type: 'disk', size: 8004304896, model: 'Cruzer Blade', vendor: 'SanDisk ', tran: 'usb', rm: true, hotplug: true,
      children: [{ name: 'sdb1', path: '/dev/sdb1', type: 'part', size: 8003256320, fstype: 'vfat', label: 'PENDRIVE', mountpoint: '/media/eu/PENDRIVE' }] },
    // Um segundo disco interno, que o computador deixa trocar ligado: não é um pendrive.
    { name: 'sdc', path: '/dev/sdc', type: 'disk', size: 1e12, model: 'HD', vendor: 'ATA', tran: 'sata', rm: false, hotplug: true, children: [] },
    // O pendrive com o Linux gravado: as partições sem letra nem montagem.
    { name: 'sdd', path: '/dev/sdd', type: 'disk', size: 16e9, model: 'DataTraveler', vendor: 'Kingston', tran: 'usb', rm: true, hotplug: true, fstype: 'iso9660',
      children: [{ name: 'sdd1', path: '/dev/sdd1', type: 'part', size: 2.9e9, fstype: 'iso9660', label: 'Linux Mint' }, { name: 'sdd2', path: '/dev/sdd2', type: 'part', size: 5e6, fstype: 'vfat' }] },
    { name: 'mmcblk0', path: '/dev/mmcblk0', type: 'disk', size: 64e9, tran: null, rm: true, hotplug: false,
      children: [{ name: 'mmcblk0p1', path: '/dev/mmcblk0p1', type: 'part', size: 64e9, fstype: 'exfat', label: 'CAMERA' }] },
    // O cartão de onde o Raspberry Pi liga: tem o sistema montado.
    { name: 'mmcblk1', path: '/dev/mmcblk1', type: 'disk', size: 32e9, tran: null, rm: true,
      children: [{ name: 'mmcblk1p1', path: '/dev/mmcblk1p1', type: 'part', size: 5e8, fstype: 'vfat', mountpoint: '/boot/firmware' }, { name: 'mmcblk1p2', path: '/dev/mmcblk1p2', type: 'part', size: 31e9, fstype: 'ext4', mountpoint: '/' }] },
    { name: 'loop0', path: '/dev/loop0', type: 'loop', size: 1e8, rm: false },
    { name: 'zram0', path: '/dev/zram0', type: 'disk', size: 4e9, rm: false, mountpoint: '[SWAP]' },
  ] });
  const r = D.discosLinux(json);
  assert.deepStrictEqual(r.map((d) => d.id), ['/dev/sdb', '/dev/sdd', '/dev/mmcblk0']);
  assert.deepStrictEqual(r[0], {
    id: '/dev/sdb', nome: 'SanDisk Cruzer Blade', tamanho: 8004304896, barramento: 'usb',
    volumes: [{ id: '/dev/sdb1', rotulo: 'PENDRIVE', sistema: 'FAT32', raiz: '/media/eu/PENDRIVE', tamanho: 8003256320 }],
    pontos: ['/media/eu/PENDRIVE'],
  });
  assert.deepStrictEqual(r[1].volumes.map((v) => [v.id, v.sistema, v.raiz]), [['/dev/sdd1', 'ISO 9660', null], ['/dev/sdd2', 'FAT', null]]);
  assert.strictEqual(r[2].barramento, 'sd');
  assert.strictEqual(D.particaoDe('/dev/sdb'), '/dev/sdb1');
  assert.strictEqual(D.particaoDe('/dev/mmcblk0'), '/dev/mmcblk0p1');
});

test('discos do Windows: o Get-Disk com um disco só, a partição sem letra e o BOM', () => {
  const um = '\uFEFF' + JSON.stringify({ numero: 2, nome: 'SanDisk Cruzer Blade USB Device', tamanho: 8004304896, barramento: 'USB',
    volumes: { letra: 'e', tamanho: 8003256320, rotulo: 'Fotos de São Paulo', sistema: 'exFAT', livre: 7e9 } });
  assert.deepStrictEqual(D.discosWindows(um), [{
    id: 'PhysicalDrive2', numero: 2, nome: 'SanDisk Cruzer Blade USB Device', tamanho: 8004304896, barramento: 'usb',
    volumes: [{ id: 'E:', letra: 'E', rotulo: 'Fotos de São Paulo', sistema: 'exFAT', raiz: 'E:\\', tamanho: 8003256320 }], pontos: ['E:\\'],
  }]);
  const dois = JSON.stringify([
    { numero: 3, nome: 'Kingston', tamanho: 16e9, barramento: 'USB', volumes: [{ letra: '', tamanho: 2.9e9, rotulo: '', sistema: '' }, { letra: '\u0000', tamanho: 5e6, rotulo: '', sistema: 'FAT' }] },
    { numero: 'x', nome: 'estranho' },
  ]);
  const r = D.discosWindows(dois);
  assert.strictEqual(r.length, 1);
  assert.deepStrictEqual(r[0].volumes.map((v) => v.id), [null, null]);
  assert.deepStrictEqual(r[0].pontos, []);
  assert.deepStrictEqual(D.discosWindows(''), []);
});

const LISTA_MAC = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>AllDisksAndPartitions</key>
	<array>
		<dict>
			<key>Content</key><string>GUID_partition_scheme</string>
			<key>DeviceIdentifier</key><string>disk0</string>
			<key>Partitions</key>
			<array>
				<dict><key>Content</key><string>EFI</string><key>DeviceIdentifier</key><string>disk0s1</string><key>Size</key><integer>314572800</integer><key>VolumeName</key><string>EFI</string></dict>
				<dict><key>Content</key><string>Apple_APFS</string><key>DeviceIdentifier</key><string>disk0s2</string><key>Size</key><integer>250685575168</integer></dict>
			</array>
			<key>Size</key><integer>251000193024</integer>
		</dict>
		<dict>
			<key>Content</key><string>FDisk_partition_scheme</string>
			<key>DeviceIdentifier</key><string>disk4</string>
			<key>Partitions</key>
			<array>
				<dict><key>Content</key><string>Windows_NTFS</string><key>DeviceIdentifier</key><string>disk4s1</string><key>MountPoint</key><string>/Volumes/FOTOS &amp; MAIS</string><key>Size</key><integer>8003256320</integer><key>VolumeName</key><string>FOTOS &amp; MAIS</string></dict>
			</array>
			<key>Size</key><integer>8004304896</integer>
		</dict>
		<dict>
			<key>Content</key><string>GUID_partition_scheme</string>
			<key>DeviceIdentifier</key><string>disk6</string>
			<key>Partitions</key><array/>
			<key>Size</key><integer>1000000</integer>
		</dict>
	</array>
	<key>VolumesFromDisks</key><array><string>FOTOS</string></array>
</dict>
</plist>`;

test('o .plist do diskutil: os textos, os números, as listas e os &amp;', () => {
  const p = D.lerPlist(LISTA_MAC);
  assert.strictEqual(p.AllDisksAndPartitions.length, 3);
  assert.strictEqual(p.AllDisksAndPartitions[1].Partitions[0].MountPoint, '/Volumes/FOTOS & MAIS');
  assert.strictEqual(p.AllDisksAndPartitions[1].Size, 8004304896);
  assert.deepStrictEqual(p.AllDisksAndPartitions[2].Partitions, []);
  assert.deepStrictEqual(p.VolumesFromDisks, ['FOTOS']);
  assert.deepStrictEqual(D.lerPlist('<plist><dict><key>Internal</key><false/><key>Ejectable</key><true/><key>MediaName</key><string>Ultra &#233;</string></dict></plist>'),
    { Internal: false, Ejectable: true, MediaName: 'Ultra é' });
});

test('discos do Mac: só os externos ou de cartão, sem a imagem de disco, a partição EFI nem o que guarda o C:', () => {
  const lista = D.lerPlist(LISTA_MAC);
  const infos = {
    disk0: { Internal: true, RemovableMedia: false, BusProtocol: 'PCI-Express', VirtualOrPhysical: 'Physical', MediaName: 'APPLE SSD' },
    disk4: { Internal: false, RemovableMedia: true, BusProtocol: 'USB', VirtualOrPhysical: 'Physical', MediaName: ' Cruzer Blade ' },
    'disk4s1': { FilesystemType: 'exfat' },
    disk6: { Internal: false, BusProtocol: 'Disk Image', VirtualOrPhysical: 'Virtual' },
  };
  assert.deepStrictEqual(D.discosMac(lista, infos), [{
    id: '/dev/disk4', nome: 'Cruzer Blade', tamanho: 8004304896, barramento: 'usb',
    volumes: [{ id: '/Volumes/FOTOS & MAIS', dispositivo: 'disk4s1', rotulo: 'FOTOS & MAIS', sistema: 'exFAT', raiz: '/Volumes/FOTOS & MAIS', tamanho: 8003256320 }],
    pontos: ['/Volumes/FOTOS & MAIS'], emUso: false,
  }]);
  assert.strictEqual(D.discosMac(lista, infos, new Set(['disk4']))[0].emUso, true);
});

test('o que não pode ser apagado: o caminho dentro do lugar do volume (no Windows, sem maiúsculas)', () => {
  assert.ok(D.dentroDe('E:\\', 'e:\\Retro Computer (dados)\\disco', 'win32'));
  assert.ok(D.dentroDe('E:\\', 'E:/x', 'win32'));
  assert.ok(!D.dentroDe('E:\\', 'F:\\x', 'win32'));
  assert.ok(D.dentroDe('/media/eu/PEN', '/media/eu/PEN/dados', 'linux'));
  assert.ok(D.dentroDe('/media/eu/PEN', '/media/eu/PEN', 'linux'));
  assert.ok(!D.dentroDe('/media/eu/PEN', '/media/eu/PEN2/dados', 'linux'));
  assert.ok(!D.dentroDe(null, '/x'));
});

test('o rótulo que todos os sistemas aceitam', () => {
  assert.strictEqual(limparRotulo('Câmera; rm -rf /', 'fat32'), 'CAMERA RM -');
  assert.strictEqual(limparRotulo('Fotos de São Paulo 2026', 'exfat'), 'Fotos de Sao Pa');
  assert.strictEqual(limparRotulo('', 'exfat'), 'PENDRIVE');
  assert.strictEqual(limparRotulo('"$(reboot)"', 'ntfs'), 'reboot');
});

test('o administrador do Windows: o roteiro e os argumentos entre aspas, o de dentro codificado', () => {
  const dentro = D.comandoInterno("C:\\Users\\D'Ávila\\AppData\\Local\\Temp\\retro-x\\gravar.ps1", { Disco: 2, Imagem: "C:\\x\\it's.iso", Inteiro: true, Nada: false, Vazio: null });
  assert.strictEqual(dentro, "& 'C:\\Users\\D''Ávila\\AppData\\Local\\Temp\\retro-x\\gravar.ps1' -Disco '2' -Imagem 'C:\\x\\it''s.iso' -Inteiro");
  assert.throws(() => D.comandoInterno('x.ps1', { 'Disco; rm': 1 }));
  const fora = D.comandoAdminWindows('C:\\x.ps1', { Letra: 'E' });
  assert.match(fora, /Start-Process -FilePath 'powershell\.exe' -Verb RunAs/);
  const b64 = /-EncodedCommand ([A-Za-z0-9+/=]+)'/.exec(fora)[1];
  assert.strictEqual(Buffer.from(b64, 'base64').toString('utf16le'), "& 'C:\\x.ps1' -Letra 'E'");
  // Cancelada a confirmação, o código 1223 do Windows.
  assert.match(fora, /NativeErrorCode/);
});

test('o andamento e o fim da gravação', () => {
  const MIB = D.MIB;
  const total = 100 * MIB;
  assert.deepStrictEqual(D.andamentoUnix('gravar\n', '1048576 bytes (1,0 MB) copied, 1 s\r20971520 bytes (21 MB, 20 MiB) copied, 2 s, 10 MB/s', total), { fase: 'gravar', feito: 21 * MIB, total });
  // O dd do Mac, a cada sinal INFO.
  assert.deepStrictEqual(D.andamentoUnix('conferir', '5242880 bytes transferred in 1.000 secs (5242880 bytes/sec)\n', total), { fase: 'conferir', feito: 6 * MIB, total });
  assert.deepStrictEqual(D.andamentoUnix('', '', total), { fase: 'preparar', feito: 0, total });
  assert.deepStrictEqual(D.andamentoUnix('inicio', '', total), { fase: 'inicio', feito: total, total });
  assert.deepStrictEqual(D.andamentoWindows('gravar 4194304', total), { fase: 'gravar', feito: 4 * MIB, total });
  assert.deepStrictEqual(D.resultadoUnix('ok\n'), { ok: true });
  assert.deepStrictEqual(D.resultadoUnix('parado'), { ok: false, parado: true });
  assert.deepStrictEqual(D.resultadoUnix('erro conferir'), { ok: false, diferente: true });
  assert.deepStrictEqual(D.resultadoUnix('erro montado'), { ok: false, ocupado: true });
  assert.deepStrictEqual(D.resultadoUnix('erro gravar dd: /dev/sdb: No space left on device'), { ok: false, erro: 'dd: /dev/sdb: No space left on device' });
  assert.deepStrictEqual(D.resultadoWindows({ ok: false, estado: 'diferente' }), { ok: false, diferente: true });
  assert.deepStrictEqual(D.resultadoWindows({ ok: false, erro: 'disco' }), { ok: false, naoExterno: true });
  assert.deepStrictEqual(D.resultadoWindows({ ok: false, fat32Grande: true }), { ok: false, fat32Grande: true });
  assert.deepStrictEqual(D.resultadoWindows({ ok: true, letra: 'F' }), { ok: true, letra: 'F' });
  assert.strictEqual(D.resultadoWindows(null), null);
});

test('gravar recusa o que não é imagem, o que não existe e o disco que não está na lista', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-discos-'));
  const d = new D.Discos({ plataforma: 'nenhum' });
  fs.writeFileSync(path.join(tmp, 'nota.txt'), 'x');
  fs.writeFileSync(path.join(tmp, 'linux.iso'), 'x');
  assert.deepStrictEqual(await d.gravar('/dev/sdb', path.join(tmp, 'nota.txt')), { ok: false, tipo: true });
  assert.deepStrictEqual(await d.gravar('/dev/sdb', path.join(tmp, 'nada.iso')), { ok: false, erro: 'imagem' });
  assert.deepStrictEqual(await d.gravar('/dev/sdb', path.join(tmp, 'linux.iso')), { ok: false, naoExterno: true });
  assert.deepStrictEqual(await d.formatar({ volume: '/dev/sdb1' }, { sistema: 'ntfs' }), { ok: false, erro: 'sistema' });
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('os discos de mentira: a senha de teste, a gravação com o andamento e o parar', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-discos-'));
  const d = new D.DiscosFalsos({ plataforma: 'linux' }, tmp);
  assert.deepStrictEqual((await d.listar()).map((x) => x.id), ['falso1', 'falso2']);
  assert.deepStrictEqual(await d.formatar({ volume: 'falsa' }, {}, 'errada'), { ok: false, senhaErrada: true });
  assert.deepStrictEqual(await d.formatar({ volume: 'falsa' }, { sistema: 'fat32' }, 'certa'), { ok: true });
  const img = path.join(tmp, 'linux.iso');
  fs.writeFileSync(img, crypto.randomBytes(48 * 1024));
  const fases = new Set();
  assert.deepStrictEqual(await d.gravar('falso2', img, 'certa', (a) => fases.add(a.fase)), { ok: true });
  assert.deepStrictEqual([...fases], ['gravar', 'conferir', 'inicio']);
  const indo = d.gravar('falso2', img, 'certa');
  await new Promise((r) => setTimeout(r, 200));
  assert.strictEqual(d.ocupado, true);
  assert.strictEqual(await d.parar(), true);
  assert.deepStrictEqual(await indo, { ok: false, parado: true });
  assert.strictEqual(d.ocupado, false);
  fs.rmSync(tmp, { recursive: true, force: true });
});

// O roteiro do Linux e do Mac, de verdade, com um arquivo no lugar do disco (o modo "teste").
test('gravar.sh: a cópia exata, o resto do "disco" intacto e o parar', { skip: process.platform === 'win32' }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-gravar-'));
  const p = path.join(tmp, 'p');
  fs.mkdirSync(p);
  for (const tam of [3 * D.MIB + 2048, 700001]) {
    for (const n of fs.readdirSync(p)) fs.rmSync(path.join(p, n));
    const img = path.join(tmp, 'imagem.iso');
    const dados = crypto.randomBytes(tam);
    fs.writeFileSync(img, dados);
    const disco = path.join(tmp, 'disco falso.img');
    fs.writeFileSync(disco, Buffer.alloc(6 * D.MIB, 0xff));
    const r = spawnSync('sh', [path.join(PS, 'gravar.sh'), img, disco, String(tam), p, 'teste'], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.strictEqual(fs.readFileSync(path.join(p, 'fim'), 'utf8').trim(), 'ok');
    const depois = fs.readFileSync(disco);
    assert.strictEqual(depois.length, 6 * D.MIB);
    assert.ok(depois.subarray(0, tam).equals(dados));
    // O primeiro MiB é zerado antes da cópia; depois dele, o resto do "disco" fica como estava.
    assert.strictEqual(depois[Math.max(tam, D.MIB)], 0xff);
  }
  // Com o "parar" desde o começo, o roteiro para antes de terminar.
  for (const n of fs.readdirSync(p)) fs.rmSync(path.join(p, n));
  fs.writeFileSync(path.join(p, 'parar'), '');
  spawnSync('sh', [path.join(PS, 'gravar.sh'), path.join(tmp, 'imagem.iso'), path.join(tmp, 'disco falso.img'), String(3 * D.MIB + 2048), p, 'teste']);
  assert.strictEqual(fs.readFileSync(path.join(p, 'fim'), 'utf8').trim(), 'parado');
  // Um disco que não é um disco do Linux: recusado.
  spawnSync('sh', [path.join(PS, 'gravar.sh'), path.join(tmp, 'imagem.iso'), '/dev/sda; reboot', '10', p, 'linux']);
  assert.strictEqual(fs.readFileSync(path.join(p, 'fim'), 'utf8').trim(), 'erro disco');
  fs.rmSync(tmp, { recursive: true, force: true });
});

// Os roteiros do Windows: a sintaxe e a gravação de verdade num arquivo, pelo PowerShell (o pwsh no
// Linux e no Mac, se houver; RETRO_PWSH aponta um de outro lugar).
const PWSH = [process.env.RETRO_PWSH, 'pwsh', process.platform === 'win32' ? 'powershell.exe' : null]
  .filter(Boolean).find((c) => spawnSync(c, ['-NoProfile', '-Command', 'exit 0']).status === 0);

test('os roteiros do PowerShell: a sintaxe e a gravação num arquivo no lugar do disco', { skip: !PWSH && 'sem o PowerShell' }, () => {
  for (const nome of ['formatar.ps1', 'gravar.ps1']) {
    const r = spawnSync(PWSH, ['-NoProfile', '-Command', `$e = $null; [void][System.Management.Automation.Language.Parser]::ParseFile('${path.join(PS, nome).replace(/'/g, "''")}', [ref]$null, [ref]$e); exit $e.Count`]);
    assert.strictEqual(r.status, 0, nome);
  }
  for (const texto of [D.LISTAR_WINDOWS]) {
    const r = spawnSync(PWSH, ['-NoProfile', '-Command', `$e = $null; [void][System.Management.Automation.Language.Parser]::ParseInput($env:ROTEIRO, [ref]$null, [ref]$e); exit $e.Count`], { env: { ...process.env, ROTEIRO: texto } });
    assert.strictEqual(r.status, 0);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "retro d'Ávila "));
  const img = path.join(tmp, 'Linux Mint (teste).iso');
  const dados = crypto.randomBytes(2 * D.MIB + 100);
  fs.writeFileSync(img, dados);
  const saida = path.join(tmp, 'saida.json');
  const disco = path.join(tmp, 'disco.img');
  const cmd = D.comandoInterno(path.join(PS, 'gravar.ps1'), { Imagem: img, Pasta: tmp, Saida: saida, ArquivoTeste: disco });
  spawnSync(PWSH, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(cmd, 'utf16le').toString('base64')]);
  assert.deepStrictEqual(D.resultadoWindows(JSON.parse(fs.readFileSync(saida, 'utf8').replace(/^\uFEFF/, ''))), { ok: true });
  const gravado = fs.readFileSync(disco);
  assert.ok(gravado.subarray(0, dados.length).equals(dados));
  // O último setor completado com zeros.
  assert.strictEqual(gravado.length % 512, 0);
  assert.ok(gravado.subarray(dados.length).every((b) => b === 0));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('o disco C:: o que ocupa e as versões antigas apagadas só a pedido', async () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-uso-'));
  const d = new Disco(path.join(raiz, 'C'));
  await d.preparar();
  await d.gravar('Meus documentos/carta.txt', Buffer.alloc(1000, 65));
  await d.gravar('Meus documentos/carta.txt', Buffer.alloc(1200, 66)); // guarda a versão de antes
  await d.gravar('Área de trabalho/nota.txt', Buffer.alloc(300, 67));
  await d.gravar('solto.txt', Buffer.alloc(50, 68));
  await d.gravar('lixo.txt', Buffer.alloc(70, 69));
  await d.paraLixeira('lixo.txt');
  // Uma versão de dois meses atrás, pelo nome (a data da versão).
  const pastaV = path.join(d.raiz, '.versoes', 'Meus documentos', 'velha.txt');
  fs.mkdirSync(pastaV, { recursive: true });
  const antiga = new Date(Date.now() - 60 * 86400000).toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(pastaV, antiga + '.txt'), Buffer.alloc(400));
  const u = await d.uso();
  const pasta = (n) => u.pastas.find((p) => p.nome === n).tamanho;
  assert.strictEqual(pasta('Meus documentos'), 1200);
  assert.strictEqual(pasta('Área de trabalho'), 300);
  assert.strictEqual(u.soltos, 50);
  assert.strictEqual(u.versoes, 1400);
  assert.strictEqual(u.antigas, 400);
  assert.strictEqual(u.nAntigas, 1);
  assert.ok(u.lixeira >= 70);
  assert.strictEqual(u.total, u.pastas.reduce((s, p) => s + p.tamanho, 0) + u.soltos + u.lixeira + u.versoes);
  const r = await d.apagarVersoesAntigas(30);
  assert.deepStrictEqual(r, { n: 1, liberado: 400 });
  // A pasta que ficou vazia sai; a versão de hoje fica.
  assert.ok(!fs.existsSync(pastaV));
  assert.strictEqual((await d.versoes('Meus documentos/carta.txt')).length, 1);
  assert.strictEqual(fs.readFileSync(d.real('Meus documentos/carta.txt')).length, 1200);
  fs.rmSync(raiz, { recursive: true, force: true });
});
