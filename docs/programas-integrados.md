# Programas do computador dentro do Retro

Em **Iniciar › Programas do computador**, selecione um programa e clique em **Abrir integrado…**. O botão direito oferece os modos de abertura, a preferência **Usar integração por padrão** e a associação de uma versão web. A preferência vale também para os atalhos da mesa e do menu. **Abrir no computador** mantém a abertura normal disponível.

## Windows: moldura do Retro

A integração é experimental e serve para janelas tradicionais compatíveis. Escolha qual janela integrar se houver mais de uma. A área do programa aparece dentro da moldura retrô, com o tema e o esquema de cores escolhidos. O conteúdo, os menus e as ferramentas do programa continuam sendo os originais.

Você pode mover, redimensionar, maximizar e minimizar a moldura pelo Retro. A superfície nativa só fica visível quando a moldura está ativa; menus, caixas de diálogo e o bloqueio do Retro a escondem para que ela não cubra esses controles. Outros documentos e diálogos do próprio programa podem abrir como janelas normais do Windows.

**Sair da integração**, inclusive pelo X da moldura, devolve a janela ao computador, com a moldura e a posição anteriores. Não fecha o documento nem encerra o programa. **Fechar programa…** devolve primeiro a janela ao Windows, encerra a moldura de integração e pede o fechamento normal à janela original: o próprio programa ainda pode perguntar se você quer salvar ou cancelar. Se você cancelar, o programa permanece aberto no computador. O Retro nunca encerra seu processo à força.

O auxiliar usa uma janela hospedeira independente do processo do Retro. Se o Retro sair ou fechar inesperadamente, o auxiliar tenta devolver as janelas antes de sair. Nenhum executável do programa é alterado e não há injeção de código. Aplicativos com processos de abertura diferentes, janelas especiais, elevação de administrador ou renderização incompatível podem recusar a integração. Nesse caso, use a abertura normal ou uma versão web. São até quatro programas integrados ao mesmo tempo, uma janela escolhida por programa.

## Mac: controles da janela original

O macOS não oferece incorporação geral de janelas de outros processos. O modo do Mac mostra isso claramente: a janela do Retro oferece **Focar programa**, **Minimizar programa**, **Fechar programa…** e **Organizar lado a lado**. A janela original mantém a moldura do macOS. Fechar o painel do Retro mantém o programa aberto.

No primeiro uso, clique em **Permitir controle de janelas…**. Em **Ajustes do Sistema › Privacidade e Segurança › Acessibilidade**, permita o controle ao Retro Computer ou ao auxiliar `retro-janelas-mac`, conforme o nome mostrado pelo sistema. Volte ao Retro e clique em **Tentar novamente**. A solicitação só ocorre por esse botão; a integração usa a API pública de Acessibilidade e não pede gravação de tela.

**Organizar lado a lado** sai da tela cheia do Retro e coloca as duas janelas na área útil do monitor. Alguns programas impõem um tamanho mínimo ou não permitem redimensionamento; o Retro mostra a falha quando o macOS recusa a ação. Revogar a permissão em Ajustes interrompe o controle das janelas.

## Versão web: janela inteiramente interna

No botão direito do programa, escolha **Associar versão web…** e informe o endereço HTTPS oficial que você quer usar. A associação também ativa a abertura integrada por padrão. O programa passa a abrir no navegador interno, com a moldura completa do Retro no Windows, Mac e Linux, usando a sessão do navegador do Retro. A preferência por Firefox externo não desvia esta abertura interna explícita.

A versão web é uma aplicação diferente da instalada: suas funções, seus arquivos, seu login e as restrições do serviço podem ser diferentes. O Retro não adivinha nem substitui essa associação automaticamente. Para removê-la, abra a mesma caixa e deixe o endereço vazio; para voltar ao programa instalado por padrão, desmarque **Usar integração por padrão**.

## Desenvolvimento e validação

`npm ci` compila o auxiliar Swift somente no Mac, com as ferramentas do Xcode; o instalador já contém o executável, sem exigir Xcode do usuário. O empacotamento confere a arquitetura e inclui o auxiliar assinado ad hoc. O Windows carrega os fontes próprios C# pelo .NET do Windows PowerShell 5.1, fora do ASAR, sem administrador.

Os testes do Windows usam um programa WinForms próprio e janelas reais para conferir incorporação, tamanho, fechamento cancelado, devolução e saída inesperada do processo hospedeiro. O aplicativo Windows empacotado exercita o fluxo com essa janela real e guarda uma captura da tela. No Mac, a compilação e a consulta real de permissão são testadas, e o fluxo de controles usa um provedor local de teste. Os testes não concedem permissões de Acessibilidade nem controlam aplicativos pessoais.
