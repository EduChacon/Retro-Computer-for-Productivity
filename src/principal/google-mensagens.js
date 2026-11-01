'use strict';
const { tr } = require('./idioma');
function mensagemGoogle(codigo) {
  if (!codigo) return '';
  const textos = {
    cliente: tr('Configure a conexão do Google: importe o JSON de um cliente OAuth para aplicativo de computador.'),
    cofre: tr('O cofre de senhas não está disponível. Desbloqueie ou ative o chaveiro do sistema para conectar o Google.'),
    desconectar: tr('Desconecte o calendário atual antes de trocar a configuração do Google.'),
    permissao: tr('O Google não permitiu o acesso. Confira as permissões da conta e se a API Google Calendar está ativada no projeto.'),
    entrar: tr('Entre novamente no Google para continuar. Seus eventos locais foram preservados.'),
    rede: tr('Não foi possível sincronizar com o Google. A Agenda continua disponível; as alterações serão tentadas novamente.'),
    conflito: tr('Um evento mudou durante a sincronização. Sincronize novamente e revise as versões antes de escolher.'),
    alterado: tr('A Agenda mudou enquanto a sincronização trabalhava. Suas alterações foram preservadas; sincronize novamente.'),
    arquivo: tr('O arquivo da Agenda não foi encontrado ou não pôde ser lido. Nenhum evento foi excluído no Google.'),
    disco: tr('O disco ou o arquivo da Agenda mudou. Desconecte e escolha novamente o calendário para este disco.'),
    grande: tr('O calendário é grande demais para sincronizar nesta versão. Os dados existentes foram preservados.'),
    duplicado: tr('Há eventos com o mesmo identificador na Agenda. Revise as duplicações antes de sincronizar.'),
    serie: tr('Não foi possível localizar essa ocorrência da repetição no Google. O evento local foi preservado.'),
    evento: tr('Um evento usa dados que a Agenda ainda não consegue sincronizar. Nenhuma cópia foi descartada.'),
    estado: tr('Não foi possível ler o estado da conexão. Desconecte e configure novamente; seus eventos locais continuam guardados.'),
    gravar: tr('Não foi possível guardar o estado da sincronização. Confira o espaço livre e as permissões da pasta de dados.'),
    tempo: tr('O tempo para entrar no Google terminou. Tente conectar novamente.'),
    cancelado: tr('A autorização do Google foi cancelada.'),
    navegador: tr('Não foi possível abrir o navegador. Use Abrir login novamente para continuar.'),
    limite: tr('O Google pediu uma pausa. A sincronização será tentada novamente em alguns minutos.'),
    resposta: tr('O Google não aceitou a operação ou devolveu uma resposta inesperada. Os dados locais foram preservados.'),
  };
  return textos[codigo] || textos.rede;
}
module.exports = { mensagemGoogle };
