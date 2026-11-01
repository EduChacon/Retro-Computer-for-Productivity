'use strict';
/* Configuração opcional do aplicativo para os instaladores; nunca imprime valores nem tokens. */
const fs = require('node:fs');
const path = require('node:path');
const json = process.env.GOOGLE_CALENDAR_CLIENT_JSON;
if (json) {
  let dados; try { dados = JSON.parse(json); } catch { throw new Error('A configuração Google não é um JSON válido.'); }
  const c = dados.installed;
  if (!c || typeof c.client_id !== 'string' || !/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(c.client_id) || typeof c.client_secret !== 'string' || !c.client_secret) throw new Error('A configuração Google precisa ser de um cliente OAuth para aplicativo de computador.');
  fs.writeFileSync(path.join(__dirname, '..', 'recursos', 'google-oauth.json'), JSON.stringify({ installed: { client_id: c.client_id, client_secret: c.client_secret } }), { mode: 0o600 });
  console.log('Configuração do aplicativo Google preparada para o instalador.');
} else console.log('Sem configuração Google do aplicativo: a configuração pessoal continuará disponível.');
