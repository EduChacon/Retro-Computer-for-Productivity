# Google Calendar na Agenda

A Agenda pode sincronizar nos dois sentidos com um calendário editável do Google: recebe eventos, envia criações e alterações e acompanha exclusões. Abra **Agenda › Google Calendar…**. A assinatura antiga em **Calendários da internet** continua sendo somente leitura; ela não serve para enviar alterações.

Esta versão conecta a Agenda local a um calendário do Google por perfil. Outros calendários ainda podem ser assinados em `.ics` para consulta.

## Preparar o login do Google

O Google exige que o aplicativo tenha um cliente OAuth próprio. A conexão do Google usada no ChatGPT, no navegador ou no sistema operacional não fornece esse cadastro ao Retro Computer. Não use a senha da conta, uma senha de aplicativo ou o endereço secreto `.ics` nesse lugar.

Há duas opções:

- **Configuração no instalador:** o responsável pelo projeto configura o cliente de aplicativo para computador no lançamento. Os usuários podem usar **Conectar Google** diretamente, autorizando suas próprias contas no Google.
- **Configuração pessoal:** se o instalador ainda não inclui o cadastro, use **Configurar a conexão do Google › Importar configuração do Google…** e escolha o JSON do seu cliente OAuth para aplicativo de computador. O arquivo é lido pelo processo principal e fica no cofre do perfil, fora do disco C:. Não cole nem envie seu conteúdo numa conversa.

Para criar o cadastro pessoal:

1. Abra o [Google Cloud Console](https://console.cloud.google.com/) e crie ou escolha um projeto.
2. Ative a **Google Calendar API** na biblioteca de APIs desse projeto.
3. Na **Google Auth Platform**, configure o nome do aplicativo e os contatos. Em **Audience**, escolha o público adequado. Se o projeto estiver em teste, adicione sua conta em **Test users**. Uma conta pessoal do Gmail normalmente usa o público externo.
4. Em **Data Access**, configure os escopos `https://www.googleapis.com/auth/calendar.events` e `https://www.googleapis.com/auth/calendar.calendarlist.readonly`.
5. Em **Clients**, crie um cliente OAuth do tipo **Desktop app / Aplicativo para computador** e baixe o JSON. Clientes do tipo aplicativo da Web não são aceitos por este fluxo.
6. No Retro, importe esse JSON e clique em **Conectar Google**. O navegador padrão abre a autorização oficial; não é necessário entrar na conta pelo Navegador integrado.

O JSON identifica o aplicativo; não é a senha da sua conta. A API precisa estar ativada e a conta precisa ser permitida no público/testes do projeto. Em projetos OAuth externos que ainda estão no modo de teste, os tokens de atualização de escopos de calendário normalmente expiram em sete dias: nesse caso, entre novamente. Para distribuir a integração a outras pessoas, o responsável deve configurar o público e cumprir as exigências de verificação do Google. O Retro não contorna bloqueios ou políticas de acesso do Google.

No Linux, ative e desbloqueie um chaveiro de senhas, como o GNOME Keyring ou a carteira do KDE. A integração não guarda tokens pelo backend `basic_text`. No Mac e no Windows, usa o cofre do sistema. A Agenda local continua funcionando quando o cofre está indisponível.

## Ativar e usar

Depois de autorizar, escolha o calendário e clique em **Ativar sincronização**. Calendários somente leitura não podem ser escolhidos para uma conexão nos dois sentidos. Confira a confirmação: os eventos da Agenda e do Google serão reunidos; mudanças e exclusões posteriores passam a valer nos dois lugares.

A sincronização usa os identificadores dos eventos. Um evento já importado de `.ics` pode ser reconhecido pelo mesmo UID. Eventos com identificadores diferentes continuam sendo eventos diferentes, mesmo que tenham o mesmo título e horário. Quando há uma assinatura `.ics` antiga do mesmo Google Calendar, ela fica oculta para não duplicar a apresentação; a assinatura não é apagada.

A Agenda verifica mudanças em segundo plano enquanto o Retro está aberto, aproximadamente a cada minuto, e agenda uma verificação depois de uma edição local. **Sincronizar agora** força uma tentativa. Sem internet, os eventos e as edições permanecem no arquivo local; a próxima tentativa retoma o trabalho. Erros e limites do Google são mostrados na janela, sem descartar a cópia local.

Se um evento mudou nos dois lados, aparecem as duas versões. Escolha **Manter versão do Retro** ou **Usar versão do Google**. Se ele mudar novamente enquanto você decide, a Agenda pede uma nova verificação. O Retro não resolve o conflito silenciosamente pelo horário do computador.

**Pausar sincronização** mantém a conexão e interrompe novas tentativas. **Desconectar Google…** remove os tokens guardados e interrompe a integração, preservando os eventos locais e os que estão no Google. Para revogar também o consentimento no Google, use a página de conexões de terceiros da sua conta Google.

## Recuperação e limites

O arquivo da Agenda continua sendo um `.ics` comum em Meus documentos. Gravar por cima mantém a versão anterior, e o sincronizador confere que o arquivo não mudou durante seu trabalho. Um arquivo ausente ou inválido não é interpretado como um pedido de excluir todos os eventos no Google.

Antes de mudanças que podem substituir ou excluir uma cópia, o Retro também guarda os eventos afetados em **Mostrar cópias de recuperação**, dentro da pasta de dados deste perfil. Há arquivos `.ics` e `.json`; eles contêm dados dos eventos e nenhuma credencial OAuth. Copie um `.ics` de recuperação para o disco C: e use **Importar um calendário (.ics)…** para recuperar os eventos desejados. As cópias ficam guardadas até você removê-las; gerencie esse espaço pela pasta de recuperação.

Esta versão mantém os campos que o editor conhece: título, descrição, local, início/fim, dia todo, lembrete e repetição. Campos do Google que não foram editados, como convidados e conferências, não são substituídos por uma gravação completa. A integração usa `sendUpdates=none`: não envia convites ou avisos aos convidados. A apresentação das regras de repetição mais complexas continua sujeita aos limites do editor da Agenda; a regra original é conservada quando o editor não a substitui. Eventos especiais ou bloqueados pelo Google podem recusar edições, que continuam preservadas localmente para revisão.

## Configuração dos instaladores

Para oferecer o login do aplicativo em todos os pacotes, o responsável deve criar um cliente OAuth de **aplicativo para computador**, conforme acima, e configurar o segredo de repositório **`GOOGLE_CALENDAR_CLIENT_JSON`** em **Settings › Secrets and variables › Actions**. O valor é o JSON do cliente Desktop, sem tokens de usuários.

O fluxo Compilar chama `ferramentas/preparar-google.cjs`, que prepara somente `client_id` e `client_secret` em `recursos/google-oauth.json`. Esse arquivo é ignorado pelo Git e copiado para os recursos dos instaladores. Em aplicativos Desktop, essa configuração é distribuída com o aplicativo; a proteção dos tokens da conta usa PKCE e o cofre do usuário. Nenhuma senha ou token de uma conta Google deve ser incluído nesse segredo ou no pacote. Sem o segredo, o instalador continua funcionando com a opção de configuração pessoal.

## Referências e validação

- [OAuth 2.0 para aplicativos instalados](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Sincronização incremental do Google Calendar](https://developers.google.com/calendar/api/guides/sync)
- [Google Calendar API — eventos](https://developers.google.com/calendar/api/v3/reference/events)

Os testes automáticos usam um provedor local com OAuth por loopback e uma API de calendário de teste. Eles verificam PKCE/state, criação e edição nos dois sentidos, exclusão, recorrências, conflitos, `If-Match`, recuperação, falta de rede, reinício, pausa e desconexão. Não autenticam uma conta real. O login e o comportamento de uma conta real ainda dependem do cadastro OAuth, das políticas do projeto e da autorização do usuário.
