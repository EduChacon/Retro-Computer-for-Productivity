# O Retro Computer no MacBook Air, pelo pendrive

O passo a passo mais curto para o MacBook Air ligar direto no Retro Computer, como o sistema do computador. O caminho técnico completo, com as outras opções, está em [instalacao.md](instalacao.md), seção 3.

## Antes de tudo: qual é o seu MacBook Air?

No Mac, abra o menu da maçã › **Sobre Este Mac** e veja a linha do processador:

| O que aparece | O que fazer |
|---|---|
| **Processador** … **Intel** (os MacBook Air até 2020, como o de 2014) | Siga este guia: o pendrive funciona. (Os de 2017 em diante também aceitam o macOS 12; neles, quem prefere manter o macOS pode usar o Retro Computer como aplicativo, pelo `Retro-Computer-…-mac-x64.dmg`.) |
| **Chip Apple M1**, M2, M3 ou mais novo | O pendrive não serve: esses Mac não ligam o Linux comum por pendrive. Use o Retro Computer como aplicativo: baixe o `Retro-Computer-…-mac-arm64.dmg` e siga a [seção 2](instalacao.md#2-macos-12-monterey-ou-mais-novo). |

## O que é preciso

- Um **pendrive de 8 GB ou mais** (o que estiver nele será apagado).
- O **seu computador com Windows**, para preparar o pendrive.
- Internet pelo Wi-Fi (ou o celular para compartilhar a internet por um momento, com o cabo USB).
- Cerca de **uma hora**.

> **Atenção:** a instalação apaga o macOS e tudo o que estiver no MacBook. Copie antes os seus arquivos para outro lugar (um pendrive, um HD externo ou a nuvem).

## Parte 1 — Preparar o pendrive (no Windows, uns 15 minutos)

Nada é copiado à mão para o pendrive: o balenaEtcher grava nele o Linux Mint inteiro (o arquivo `.iso`), e o pendrive passa a ser o instalador. O Retro Computer (o `.deb`) só é baixado no fim, já no MacBook (Parte 5).

> **Pelo próprio Retro Computer (1.5.0 ou mais novo), sem o balenaEtcher:** ponha o `.iso` no disco C: (o Navegador do Retro Computer guarda o que baixa em Meus documentos › Recebidos) e abra Iniciar › Programas › Acessórios › **Discos**. Escolha o pendrive, clique em **Gravar imagem…**, escolha o `.iso` e confirme (o Windows pede a confirmação dele). No fim, a cópia é conferida, e o pendrive está pronto para a Parte 2.

1. Baixe o **Linux Mint 22.3 Xfce**: o arquivo `linuxmint-22.3-xfce-64bit.iso` (2,8 GB), na página <https://linuxmint.com/edition.php?id=327> (o espelho do Brasil, da UFPR, é o mais rápido daqui). Para conferir o arquivo, o SHA-256 publicado é `45a835b5dddaf40e84d776549e0b19b3fbd49673b6cc6434ebddbfcd217df776` (no PowerShell, `Get-FileHash .\linuxmint-22.3-xfce-64bit.iso`).
2. Baixe e abra o **balenaEtcher** em <https://etcher.balena.io/>.
3. No Etcher: **Flash from file** (escolha o `.iso`), **Select target** (escolha o pendrive) e **Flash!**. Espere terminar e tire o pendrive. Se o Windows perguntar se quer formatar o pendrive, clique em **Cancelar**: ele não lê o formato do Linux, e isso é normal.

## Parte 2 — Ligar o MacBook pelo pendrive (uns 5 minutos)

1. Com o MacBook desligado, ponha o pendrive e ligue-o na tomada.
2. Aperte o botão de ligar e, logo em seguida, **segure a tecla Option (⌥)** até aparecerem os discos.
3. Escolha o disco amarelo **EFI Boot** e aperte Enter. Na tela do Linux Mint, escolha a primeira opção.

Em um ou dois minutos aparece a área de trabalho do Linux Mint, rodando do pendrive, sem ter mudado nada no MacBook ainda. Dá para experimentar o trackpad e o teclado antes de seguir.

## Parte 3 — Instalar o Linux Mint (uns 20 minutos)

1. Dois cliques em **Install Linux Mint** (na área de trabalho).
2. Escolha o idioma **Português do Brasil** e o teclado. Para o teclado americano com acentos, escolha **Inglês (EUA) › Inglês (EUA, internacional com teclas mortas)**.
3. Marque **Instalar codecs multimídia**.
4. Em **Tipo de instalação**, escolha **Apagar o disco e instalar o Linux Mint** e confirme.
5. Escolha a cidade (São Paulo), o seu nome, o nome do computador e uma senha (guarde essa senha: o computador vai pedi-la para instalar programas).
6. Espere terminar, clique em **Reiniciar agora** e, quando o computador pedir, tire o pendrive e aperte Enter.

## Parte 4 — O Wi-Fi (uns 10 minutos)

O MacBook Air precisa de um controlador à parte para o Wi-Fi (o da placa Broadcom). A versão que vem no pendrive não funciona com o Linux de hoje, e a certa vem da internet: o celular empresta a dele por alguns minutos.

1. No celular, ligue o Bluetooth e o compartilhamento da internet: no iPhone, Ajustes › **Acesso Pessoal** › **Permitir Que Outros se Conectem**; no Android, o **Roteador Bluetooth**.
2. No Linux Mint, clique no ícone do Bluetooth (no canto de baixo, perto do relógio), escolha o celular e confirme o mesmo código nos dois. Depois, com o botão direito no celular, escolha conectar como ponto de acesso de rede. Pelo cabo USB também dá, se o cabo passar dados (alguns só carregam): o iPhone pergunta se confia no computador.
3. Abra o menu (o botão no canto de baixo) e procure **Gerenciador de Drivers**. Ele procura os controladores na internet; escolha o `broadcom-sta-dkms` (a versão `6.30.223.271-23ubuntu1.3` ou mais nova) e clique em **Aplicar Mudanças**. Se a versão for mais antiga, feche o Gerenciador e, no Terminal, digite `sudo apt update` e depois `sudo apt install broadcom-sta-dkms`.
4. Reinicie o computador. O Wi-Fi aparece no canto de baixo, perto do relógio, e o celular já pode ser desligado.

## Parte 5 — Instalar o Retro Computer (uns 5 minutos)

1. No Firefox do Linux Mint, abra a página de [lançamentos](https://github.com/EduChacon/Retro-Computer-for-Productivity/releases/latest) e baixe o arquivo que termina em **`linux-amd64.deb`**.
2. Na pasta Downloads, dê dois cliques nele e clique em **Instalar pacote** (a senha da Parte 3 é pedida). Junto, vem o Openbox, que cuida das janelas na sessão do Retro Computer.
3. Saia da sessão: menu › **Sair** › **Encerrar sessão**.
4. Na tela de entrada, clique no ícone ao lado do seu nome, escolha **Retro Computer** e entre com a sua senha.

Pronto: o MacBook liga no Retro Computer. Para ele entrar direto, sem a tela de entrada, use Painel de controle › Aparência › Configurações › **Entrar direto no Retro Computer ao ligar**.

## No dia a dia

- A tecla **Command** faz o papel da tecla do logotipo do Windows (Command + E abre o Explorador).
- As teclas de cima ajustam o brilho e o volume; com **fn**, viram F1 a F12.
- O trackpad clica com um toque, rola com dois dedos e faz o botão direito com o clique de dois dedos.
- Desligar, no menu Iniciar, desliga o MacBook de verdade. Para voltar à área de trabalho do Linux Mint, use Desligar › **Sair da sessão** e escolha a outra sessão na tela de entrada.

## Se algo der errado

- **A tecla Option não mostrou o pendrive**: desligue, confira se o pendrive está bem encaixado e tente de novo, segurando a tecla Option desde o primeiro instante. Se não adiantar, grave o pendrive outra vez (Parte 1).
- **O Wi-Fi não apareceu**: refaça a Parte 4 com a internet do celular ligada (pelo Bluetooth, se o cabo só carregar: com `lsusb` no Terminal, o celular tem que aparecer na lista) e confira a versão do controlador no Gerenciador de Drivers.
- **O Retro Computer não preencheu a tela** (ficou num retângulo no meio, até a versão 1.9.0): falta o Openbox. No Prompt de comando, digite `sudo apt install openbox x11-xserver-utils x11-utils`, depois Iniciar › Desligar › **Sair da sessão**, e entre de novo na sessão Retro Computer.
- **Quer o macOS de volta**: ligue segurando **Command + Option + R** (a recuperação pela internet) e reinstale o macOS pelo assistente.
