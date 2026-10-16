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
