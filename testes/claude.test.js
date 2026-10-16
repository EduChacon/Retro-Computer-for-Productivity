'use strict';
// O Claude Code no Prompt: o comando que o abre, com o pedido do botão direito ("Pedir ao Claude").
const test = require('node:test');
const assert = require('node:assert');
const { comandoClaude } = require('../src/principal/terminal');

test('claude: o pedido vai pela variável RETRO_PEDIDO, nunca escrito no comando', () => {
  const antes = process.env.RETRO_CLAUDE_FALSO;
  delete process.env.RETRO_CLAUDE_FALSO;
  try {
    assert.strictEqual(comandoClaude({}), 'claude');
    assert.strictEqual(comandoClaude({ pedido: true, plataforma: 'linux' }), 'claude "$RETRO_PEDIDO"');
    assert.strictEqual(comandoClaude({ pedido: true, plataforma: 'darwin' }), 'claude "$RETRO_PEDIDO"');
    assert.strictEqual(comandoClaude({ pedido: true, plataforma: 'win32' }), 'claude $env:RETRO_PEDIDO');
  } finally {
    if (antes !== undefined) process.env.RETRO_CLAUDE_FALSO = antes;
  }
});

test('claude: o tema combina com o fundo da janela e o idioma é o do Retro Computer, sem passar por cima do usuário', () => {
  const { ajustesClaude, configuracoesDoClaude } = require('../src/principal/terminal');
  assert.deepStrictEqual(ajustesClaude({ tema: 'claro', idioma: 'pt-BR' }), { theme: 'light', language: 'português do Brasil' });
  assert.deepStrictEqual(ajustesClaude({ tema: 'escuro', idioma: 'es' }), { theme: 'dark', language: 'español' });
  // Em inglês, o Claude já responde em inglês.
  assert.deepStrictEqual(ajustesClaude({ tema: 'escuro', idioma: 'en' }), { theme: 'dark' });
  // O tema do usuário fica, se combina com o fundo (ou é um tema próprio); o idioma dele, sempre.
  assert.deepStrictEqual(ajustesClaude({ tema: 'claro', idioma: 'pt-BR', doUsuario: { theme: 'light-daltonized', language: 'english' } }), {});
  assert.deepStrictEqual(ajustesClaude({ tema: 'claro', doUsuario: { theme: 'custom:meu' }, idioma: 'en' }), {});
  assert.deepStrictEqual(ajustesClaude({ tema: 'claro', doUsuario: { theme: 'dark' }, idioma: 'en' }), { theme: 'light' });
  // Sem o arquivo do usuário (ou com ele estragado), nada.
  assert.deepStrictEqual(configuracoesDoClaude({ CLAUDE_CONFIG_DIR: '/pasta/que/nao/existe' }), {});
});

test('claude: as configurações vão pela variável RETRO_CLAUDE_AJUSTES, antes do --mcp-config', () => {
  const antes = process.env.RETRO_CLAUDE_FALSO;
  delete process.env.RETRO_CLAUDE_FALSO;
  try {
    assert.strictEqual(comandoClaude({ configuracoes: true, plataforma: 'linux' }), 'claude --settings "$RETRO_CLAUDE_AJUSTES"');
    assert.strictEqual(comandoClaude({ pedido: true, configuracoes: true, ajustes: true, plataforma: 'win32' }),
      'claude $env:RETRO_PEDIDO --settings $env:RETRO_CLAUDE_AJUSTES --append-system-prompt-file $env:RETRO_CLAUDE_SISTEMA --mcp-config $env:RETRO_CLAUDE_MCP');
  } finally {
    if (antes !== undefined) process.env.RETRO_CLAUDE_FALSO = antes;
  }
});
