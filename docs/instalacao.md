# Instalar o Retro Computer

Um guia curto para cada tipo de computador. Os instaladores ficam na página de [lançamentos](https://github.com/EduChacon/Retro-Computer-for-Productivity/releases/latest); o nome de cada arquivo diz o sistema e o processador (`Retro-Computer-1.0.0-linux-amd64.deb`, por exemplo).

## Em resumo

| Computador | O caminho recomendado |
|---|---|
| PC com Windows 10 ou 11 | O instalador `.exe` (o Retro Computer como aplicativo) |
| Mac com macOS 12 Monterey ou mais novo | O `.dmg` (`x64` nos Mac com Intel, `arm64` nos com chip Apple) |
| Mac antigo, que não passa do macOS 11 (como o MacBook Air de 2014) | O Linux Mint e o `.deb`, com a sessão "Retro Computer" |
| Qualquer Mac, para experimentar sem mexer no sistema | Uma máquina virtual no UTM, com o Linux e o `.deb` |
| Notebook antigo ou mini PC | O Linux Mint e o `.deb`, com a sessão "Retro Computer" |
| Raspberry Pi 4 ou 5 | O Raspberry Pi OS de 64 bits e o `arm64.deb` |
| Levar no bolso, de um computador para outro | O modo portátil num pendrive, ou o Linux Mint inteiro num pendrive ou SSD externo (seção 8) |

O Retro Computer pede um sistema de 64 bits e uns 4 GB de memória para tudo ir bem (o Claude Code pede 4 GB; a área de trabalho sozinha vai com menos).

## 1. Windows

1. Baixe o `Retro-Computer-…-win-x64.exe` e abra.
2. Na primeira vez, o Windows mostra o aviso do SmartScreen (o instalador ainda não é assinado; veja a seção 9): clique em **Mais informações** › **Executar assim mesmo**.
3. Escolha a pasta (ou deixe a sugerida) e termine. O Retro Computer fica no menu Iniciar.

Quem prefere não instalar pode usar o `.zip`: é só extrair e abrir o `Retro Computer.exe`.

### No Windows com o WSL

O item "Linux" do Explorador do Windows é o WSL (o Subsistema do Windows para Linux): um Linux, como o Ubuntu, que roda dentro do próprio Windows. O Retro Computer também funciona nele (no Windows 11, os programas do Linux abrem em janelas comuns): no Ubuntu do WSL, `sudo apt install ./Retro-Computer-1.0.0-linux-amd64.deb` e depois `retro-computer`. Para o dia a dia, porém, o instalador do Windows é mais simples e mais rápido; o WSL serve para experimentar o que só existe no Linux (a loja do Flathub, o firewall). O modo sistema não se aplica ao WSL, e o disco C: fica dentro do Linux dele (visível no Explorador do Windows, no item "Linux").

## 2. macOS 12 Monterey ou mais novo

1. Baixe o `.dmg` do seu Mac: `x64` (Intel) ou `arm64` (chip Apple, do M1 em diante).
2. Abra o `.dmg` e arraste o Retro Computer para a pasta Aplicativos.
3. Na primeira vez, o macOS avisa que não pode verificar o desenvolvedor (seção 9): abra **Ajustes do Sistema › Privacidade e Segurança** e clique em **Abrir Mesmo Assim** (até o macOS 14, também vale o botão direito no aplicativo › Abrir › Abrir).

A tecla Command funciona como a tecla do logotipo do Windows nos atalhos do Retro Computer que não são do próprio macOS.

## 3. O MacBook Air de 2014 (e outros Mac antigos)

O MacBook Air de 2014 recebe, no máximo, o macOS 11 Big Sur, e o Electron (a base do Retro Computer) pede o macOS 12 desde a versão 38. Mas o computador ainda tem fôlego: com o Linux, ele roda o Retro Computer como o sistema inteiro, bem mais leve que o macOS.

O Linux recomendado é o **Linux Mint** (a edição Xfce é a mais leve; a Cinnamon, a mais completa): ele é estável, fácil de instalar e já traz o controlador do trackpad, as teclas de brilho e de volume e o instalador do Wi-Fi da Broadcom.

1. **Guarde os seus arquivos** num pendrive ou na nuvem: a instalação pode apagar o macOS (se escolher "apagar o disco").
2. Baixe o Linux Mint em <https://linuxmint.com/download.php> e grave num pendrive de 8 GB ou mais com o [balenaEtcher](https://etcher.balena.io/) (ou o "Gravador de imagens USB" de outro Linux).
3. Com o pendrive no Mac, ligue o computador segurando a tecla **Option (⌥)** e escolha o disco **EFI Boot**.
4. No Linux Mint de teste, clique em **Instalar o Linux Mint** e siga as telas. Marque "Instalar programas de terceiros" (os codecs e os controladores).
5. **O Wi-Fi**: o MacBook Air usa uma placa da Broadcom que precisa de um controlador à parte. Depois de instalar, abra o **Gerenciador de drivers** do Mint e escolha o `broadcom-sta-dkms`. Sem internet nenhuma, ele pode usar o próprio pendrive de instalação; outra saída é ligar o celular por cabo USB e compartilhar a internet dele por um momento.
6. Baixe o `Retro-Computer-…-linux-amd64.deb` e, no Terminal, na pasta dele:
   ```
   sudo apt install ./Retro-Computer-1.0.0-linux-amd64.deb
   ```
7. Saia da sessão (Menu › Sair). Na tela de entrada, escolha a sessão **Retro Computer** (o ícone ao lado do nome do usuário) e entre.

No MacBook:

- O **trackpad** funciona com o controlador do Linux: mover, clicar, tocar para clicar (a sessão liga), dois dedos para rolar e o clique com dois dedos para o botão direito.
- A tecla **Command** é a tecla do logotipo (logotipo + E abre o Explorador, logotipo + V o histórico da área de transferência). As teclas F1 a F12 de cima são as do brilho e do volume; com **fn**, elas viram F1 a F12.
- A **câmera** FaceTime HD desse modelo precisa de um controlador que não vem no Linux (o `facetimehd`, de fora): sem ele, o Navegador não tem câmera.
- Com a tampa fechada, o computador suspende; ao abrir, a senha é pedida (se houver uma, em Painel de controle › Senhas).

## 4. Numa máquina virtual, pelo UTM (Mac)

O [UTM](https://mac.getutm.app/) roda outros sistemas numa janela do Mac. É a forma mais prática de experimentar o Retro Computer como sistema sem mexer no macOS.

1. Instale o UTM e crie uma máquina nova:
   - num Mac com chip Apple: **Virtualize** › **Linux**, com o Ubuntu ou o Debian para **ARM64** (a galeria do UTM tem imagens prontas; o Linux Mint não tem versão ARM);
   - num Mac com Intel: **Virtualize** › **Linux**, com o Linux Mint ou o Ubuntu comuns.
2. Dê à máquina 4 GB de memória (ou mais) e uns 25 GB de disco. Em **Tela**, escolha a placa `virtio-gpu` com a aceleração (GL): sem ela, os programas Craft desenham por software, mais devagar.
3. Instale o Linux na máquina e, dentro dela, o `spice-vdagent` (`sudo apt install spice-vdagent`): ele traz a área de transferência compartilhada com o Mac e a resolução que acompanha o tamanho da janela.
4. Instale o `.deb` do Retro Computer (`arm64` no chip Apple, `amd64` no Intel), como no passo 6 da seção 3, e entre na sessão **Retro Computer**.

Dicas: em **Entrada**, ligue a captura do teclado para os atalhos (Alt+Tab, a tecla do logotipo) irem para a máquina, e não para o Mac; uma pasta compartilhada do UTM pode servir de disco C: (Painel de controle › Disco C:), para os arquivos ficarem visíveis também no Mac.

## 5. Notebook antigo ou mini PC

Um notebook de uns dez anos ou um mini PC usado (os "thin clients" de escritório) com processador Intel ou AMD de 64 bits e 4 GB de memória roda bem o Retro Computer como sistema.

1. Instale o Linux Mint (seção 3, passos 1 a 4; no PC, a tecla do menu de inicialização costuma ser F12, F11, F9 ou Esc).
2. Instale o `Retro-Computer-…-linux-amd64.deb` e entre na sessão **Retro Computer**.

O Ubuntu e o Debian também servem; no Ubuntu, a sessão aparece na engrenagem da tela de entrada.

## 6. Raspberry Pi

O Retro Computer roda no Raspberry Pi 4 e 5 (o 3 também, mas sem os Craft; veja a tabela em [uso.md](uso.md), seção 7).

1. Grave o **Raspberry Pi OS (64-bit)** no cartão com o [Raspberry Pi Imager](https://www.raspberrypi.com/software/).
2. No Pi, baixe o `Retro-Computer-…-linux-arm64.deb` e instale: `sudo apt install ./Retro-Computer-1.0.0-linux-arm64.deb`.
3. Saia da sessão e escolha **Retro Computer** na tela de entrada.

## 7. A sessão "Retro Computer"

Com ela, o computador abre direto no Retro Computer, sem a área de trabalho do Linux por baixo: Desligar desliga o computador de verdade, a bandeja mostra o Wi-Fi, o som, a bateria e o Bluetooth, e os programas do Linux aparecem na barra de tarefas. Para voltar à área de trabalho do Linux, use Desligar › Sair da sessão e escolha a outra sessão.

- **Ligar direto no Retro Computer** (sem a tela de entrada): Painel de controle › Aparência › Configurações › "Entrar direto no Retro Computer ao ligar" (com a tela de entrada LightDM, a do Linux Mint e a do Raspberry Pi OS).
- **Proteção**: Painel de controle › Segurança mostra num lugar só a senha da tela de bloqueio, o firewall, as atualizações de segurança automáticas e a chave do Claude.

Outros detalhes estão em [uso.md](uso.md), seção 7.

## 8. No pendrive

Há dois jeitos de levar o Retro Computer de um computador para outro.

### O modo portátil (o programa e os arquivos no pendrive)

O programa roda no Windows, no Mac ou no Linux do computador da vez, e tudo o que é seu (as configurações, os programas instalados e o disco C:) fica no pendrive.

1. Copie para o pendrive o programa sem instalador: no Windows, o `.zip` extraído (a pasta com o `Retro Computer.exe`); no Linux, o `.AppImage`; no Mac, o aplicativo de dentro do `.dmg`.
2. Ao lado dele, crie uma pasta chamada exatamente **`Retro Computer (dados)`**.
3. Abra o programa pelo pendrive. Com a pasta ao lado, ele entra no modo portátil: as configurações vão para `Retro Computer (dados)/Sistema` e o disco C:, para `Retro Computer (dados)/Disco C` (Painel de controle › Disco C: avisa). Nada fica no computador.

Os programas Craft e os sites instalados como programas vão junto. A chave do Claude, não: ela é cifrada pelo cofre de cada computador e, num computador novo, é pedida de novo (ou use a sua conta do Claude). Use um pendrive rápido (USB 3) e tire-o só depois de fechar o Retro Computer.

### O computador inteiro (o Linux Mint no pendrive)

Para ligar qualquer PC já no Retro Computer como sistema, sem tocar no disco dele, o Linux Mint pode morar num pendrive ou, melhor, num **SSD externo** (bem mais rápido e mais durável que um pendrive comum):

1. Grave o Linux Mint num primeiro pendrive (seção 3, passo 2) e ligue o computador por ele.
2. Ligue também o pendrive ou o SSD de destino (32 GB ou mais) e, em **Instalar o Linux Mint**, escolha **Outra opção** no tipo de instalação: apague e use só o disco de destino (confira o tamanho e o nome, para não escolher o disco do computador) e, em "Dispositivo para a instalação do carregador de inicialização", escolha esse mesmo disco.
3. Depois de instalar, ligue o computador pelo disco de destino (a tecla do menu de inicialização costuma ser F12, F11, F9 ou Esc; no Mac, Option), instale o `.deb` e escolha a sessão **Retro Computer** (seção 7).

Um atalho é o [Ventoy](https://www.ventoy.net/) com a "persistência" (um arquivo no pendrive que guarda as mudanças do Linux de teste); ele é mais rápido de montar, mas a instalação completa do passo 2 é mais estável para o dia a dia.

## 9. Os avisos de segurança

Os instaladores ainda não são **assinados digitalmente**, e por isso o Windows e o macOS pedem uma confirmação na primeira vez (o caminho de cada um está nas seções 1 e 2). O Linux não pede.

A assinatura é um certificado comprado de quem o sistema confia:

| Sistema | O que é preciso | Custo |
|---|---|---|
| macOS | O Apple Developer Program, para assinar e "notarizar" o aplicativo | US$ 99 por ano |
| Windows | Um certificado de assinatura de código; para projetos de código aberto, a [SignPath Foundation](https://signpath.org/) assina sem custo, com as condições dela (o código aberto, a compilação no GitHub Actions e a revisão do projeto; veja os [termos](https://signpath.org/terms)) | Gratuito pela SignPath; os certificados comerciais custam centenas de dólares por ano |

Enquanto isso, os instaladores vêm sempre da página oficial de lançamentos, compilados pelo GitHub Actions a partir do código deste repositório.

## 10. Atualizar e remover

- **Atualizar**: o Retro Computer procura uma versão nova uma vez por dia e avisa. Com o instalador do Windows e no Linux (o `.deb`, que pede a senha de administrador, e o `.AppImage`), ele baixa e instala pelo próprio aplicativo; no macOS e no `.zip` do Windows, o aviso leva à página do lançamento para baixar. Os seus arquivos e configurações ficam.
- **Remover**: no Windows, em Configurações › Aplicativos; no macOS, arrastando o aplicativo para o Lixo; no Linux, `sudo apt remove retro-computer`. A pasta do disco C: (os seus arquivos) nunca é apagada.
