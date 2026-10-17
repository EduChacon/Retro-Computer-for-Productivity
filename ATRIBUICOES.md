# Atribuições

O Retro Computer é de código aberto (licença MIT, veja [LICENSE](LICENSE)). Ele usa os recursos de terceiros abaixo, cada um com a sua licença.

## Ícones, fontes e emojis: SerenityOS

- **Origem:** <https://github.com/SerenityOS/serenity> (`Base/res/icons`, `Base/res/fonts`, `Base/res/emoji` e `Base/res/cursor-themes/Default`).
- **Uso:** os ícones de `src/sistema/icones/` (exceto os desenhos próprios listados abaixo), com as pastas recoloridas de amarelo por `ferramentas/icones.py`; as fontes Katica (interface) e Csilla (Prompt de comando), convertidas de bitmap para WOFF2 por `ferramentas/fonte-serenity.py`, só com o alfabeto latino (na Csilla, com os símbolos do Claude Code desenhados no mesmo estilo, em `ferramentas/glifos-terminal.py`, e o negrito que faltava feito da regular); os cursores grandes da Acessibilidade (`src/sistema/cursores/`, as versões em dobro do tema "Default" e a mão ampliada, por `ferramentas/cursores.py`); os desenhos do painel de emojis (`src/sistema/emojis/emojis.png`, os emojis do Unicode que o SerenityOS desenha, juntos numa folha por `ferramentas/emojis.py`, sem modificação).
- **Licença:** BSD-2-Clause.

```
BSD 2-Clause License

Copyright (c) 2018-2026, the SerenityOS developers.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## Desenhos próprios do projeto (MIT)

Feitos ponto a ponto em `ferramentas/icones.py`: `computador`, `desligar` (o mesmo computador, com a tela apagada e o símbolo de desligar), `logo` (o disquete do botão Iniciar), `foco` (o tomate), `programas-caixa`, a pena de `wordcraft`/`documento`, os papéis de `lixeira-cheia`, `breakout`, `removivel` (o pendrive), `impressora`, `bluetooth`, o muro de tijolos do `firewall`, o escudo da Central de segurança (`seguranca`, com o cadeado da bandeja), o `microfone`, o `dos` (a janela preta com o prompt), o `usuario` (a cabeça e os ombros, no verde do ícone de usuários do SerenityOS), os emblemas pequenos das pastas especiais (`EMBLEMAS_16`, nos ícones `pasta-*` de 16 pontos), o `emoji` (o rosto sorrindo do painel de emojis), a `barra-tarefas` (a área de trabalho com a barra embaixo e o disquete do próprio Retro Computer no botão Iniciar) e os da bandeja (a bateria carregando também é o ícone `energia`, das Opções de energia) (`sino`, `cadeado`, `brilho`, `sinal-*`, `bateria-*` e `bateria-carga-*`). As composições juntam ícones do SerenityOS com esses desenhos: `documentos`, `pasta-programas`, `html`, `reprodutor` (o filme com o botão de tocar), `lightcraft` (a foto com o sol) `atualizacoes` (o computador com as setas) e `firewall` (o muro na frente do globo do SerenityOS). A `lixeira` vazia de 32 pontos é o `recycle-bin` do SerenityOS sem os papéis de cima, com a boca aberta (`sem_papeis` em `ferramentas/icones.py`). A prancheta da área de transferência (`transferencia`) é o `paste` do SerenityOS, o Mapa de caracteres (`caracteres`), o `app-character-map`, o Diário de trabalho (`diario`), o `filetype-calendar`, o Painel › Usuários (`usuarios`), o `app-user-settings`, as pastas especiais grandes (`pasta-*`, a pasta amarela com o emblema: o `download`, o `filetype-image`, o `filetype-music`, o `filetype-video`, o `filetype-calendar` e o `app-screenshot` do SerenityOS, e o computador e o DOS próprios), e a Cópia de segurança (`copia`) junta o `hard-disk` com o `reload`. As cartas da Paciência, o Campo Minado e o Breakout são desenhados na hora pelo próprio código, assim como as peças e os tabuleiros das Damas e do Xadrez (`src/sistema/js/jogos/pecas.js` e `tabuleiro.js`); o ícone das Damas (`damas`, as duas pedras) é desenhado por `ferramentas/icones.py` do mesmo jeito. Os sons (`src/sistema/js/sons.js`) são sintetizados na hora. Os padrões de fundo (`src/sistema/js/aparencia.js`) são desenhos próprios de 8×8 pontos. O tema "Retro" do Openbox (`recursos/linux/openbox/`) também é próprio. O tema Mac clássico (`src/sistema/tema-mac.css`) é todo do projeto: os ícones de `src/sistema/icones-mac/`, desenhados ponto a ponto em `ferramentas/icones-mac.py`, e os controles (as caixas do título, a caixa de marcar, a bolinha de opção, o puxador da barra de rolagem), em `ferramentas/controles-mac.js`; no lugar da maçã, fica o logotipo do Retro Computer.

## Nomes dos emojis: Unicode CLDR, pelo emojibase-data

- **Origem:** o pacote [emojibase-data](https://github.com/milesj/emojibase) 16.0.3 (MIT, de Miles Johnson), com os nomes e as palavras de busca do [Unicode CLDR](https://cldr.unicode.org/) (a Licença do Unicode, v3) em português, inglês e espanhol.
- **Uso:** os nomes e as palavras de busca do painel de emojis (`src/sistema/js/emojis-dados.js`, gerado por `ferramentas/emojis.py`). O pacote não fica no repositório.
- **Licenças:** MIT (emojibase, "Copyright (c) 2017-2019 Miles Johnson") e a Licença do Unicode, v3 (os dados do CLDR, de Unicode, Inc.; o texto está em <https://www.unicode.org/license.txt>).

## Mapa do globo: Natural Earth

- **Origem:** <https://www.naturalearthdata.com/> (o contorno das terras na escala 1:110m, `ne_110m_land`).
- **Licença:** domínio público.
- **Uso:** os continentes do globo do tema Mac clássico (os ícones `navegador`, `internet` e `html` de `src/sistema/icones-mac/`), guardados em `ferramentas/icones-mac.py` como uma máscara de 2 em 2 graus (`MAPA_TERRA`). O arquivo do mapa não fica no repositório; `python3 -I ferramentas/icones-mac.py --mapa ne_110m_land.geojson` refaz a máscara.

## Bibliotecas

| Biblioteca | Licença | Uso |
|---|---|---|
| [Electron](https://www.electronjs.org/) | MIT | o aplicativo |
| [xterm.js](https://xtermjs.org/) e complementos (fit, webgl, unicode11) | MIT | o terminal do Prompt de comando |
| [node-pty](https://github.com/microsoft/node-pty) | MIT | o shell do Prompt de comando |
| [yauzl](https://github.com/thejoshwolfe/yauzl) | MIT | extrair os pacotes dos programas e as pastas compactadas |
| [yazl](https://github.com/thejoshwolfe/yazl) | MIT | criar as pastas compactadas (Enviar para › Pasta compactada) |
| [electron-updater](https://github.com/electron-userland/electron-builder) | MIT | a atualização do próprio Retro Computer |
| [mammoth](https://github.com/mwilliamson/mammoth.js) | BSD-2-Clause | o Word (`.docx`) no painel de visualização do Explorador |
| [PDF.js](https://mozilla.github.io/pdf.js/) (`pdfjs-dist`) | Apache-2.0 | o PDF no painel de visualização do Explorador; vem com as fontes padrão (Foxit, BSD-3-Clause, do PDFium; Liberation Sans, GPL-2.0 com a exceção das fontes), os decodificadores em WebAssembly (OpenJPEG, BSD-2-Clause; JBIG2, do PDFium, BSD-3-Clause; qcms, MIT) e os mapas de caracteres (cmaps, da Adobe, BSD-3-Clause), cada um com a licença na própria pasta |
| [pdf-lib](https://pdf-lib.js.org/), com o @pdf-lib/standard-fonts, o @pdf-lib/upng (MIT), o [pako](https://github.com/nodeca/pako) (MIT e Zlib) e o tslib (0BSD) | MIT | as Ferramentas de PDF (combinar, separar, extrair páginas, girar e converter imagens em PDF), no processo de trabalho |
| [Tesseract.js](https://github.com/naptha/tesseract.js) e o [tesseract.js-core](https://github.com/naptha/tesseract.js-core) (o [Tesseract](https://github.com/tesseract-ocr/tesseract), Apache-2.0, e o [Leptonica](http://www.leptonica.org/), BSD-2-Clause, compilados para WebAssembly com as bibliotecas de imagem libpng, libjpeg, libtiff, libwebp e zlib, cada uma com a licença dela, livre e sem copyleft), com o idb-keyval e o wasm-feature-detect (Apache-2.0), o bmp-js, o is-url, o node-fetch, o whatwg-url, o tr46, o regenerator-runtime, o zlibjs e o opencollective-postinstall (MIT) e o webidl-conversions (BSD-2-Clause) | Apache-2.0 | o Copiar o texto (OCR), sem internet, no processo de trabalho |
| [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator), de Kazuhiko Arase | MIT | o código QR do Receber do celular ("QR Code" é marca registrada da DENSO WAVE INCORPORATED) |
| Os dados de português, inglês e espanhol do Tesseract ([tessdata_best](https://github.com/tesseract-ocr/tessdata_best), Apache-2.0), nos pacotes [@tesseract.js-data](https://github.com/naptha/tessdata) (MIT) | Apache-2.0 | os idiomas do Copiar o texto (OCR) |
| [emulators](https://github.com/js-dos/emulators) (do projeto [js-dos](https://js-dos.com), de Alexander Guryanov), com o [DOSBox](https://www.dosbox.com) compilado para WebAssembly | GPL-2.0 | o DOS (Iniciar › Programas › Acessórios › DOS). Vai sem modificação, como componente separado: os arquivos `emulators.js`, `wdosbox.js`, `wdosbox.wasm`, `wlibzip.js` e `wlibzip.wasm` do pacote 8.5.2, com o texto da licença no próprio pacote (`node_modules/emulators/LICENSE`). O código-fonte dessa versão está em [github.com/js-dos/emulators/tree/v8.5.2](https://github.com/js-dos/emulators/tree/v8.5.2) (com o do DOSBox que ele compila) e o do DOSBox original, em [sourceforge.net/projects/dosbox](https://sourceforge.net/projects/dosbox/); o `emulators.js` traz também o [core-js](https://github.com/zloirock/core-js) (MIT). O restante do Retro Computer continua MIT. |
| [pcejs-macplus](https://www.npmjs.com/package/pcejs-macplus) (o [PCE.js](https://github.com/jsdf/pce), de James Friend), sobre o [PCE](http://www.hampa.ch/pce/), de Hampa Hug, compilado para WebAssembly | GPL-2.0 | o Mac Plus (Iniciar › Programas › Acessórios › Mac Plus). Vai sem modificação, como componente separado: os arquivos `pcejs-macplus.umd.js`, `pce-macplus.wasm` e `macplus-pcex.rom` (a extensão de ROM do próprio PCE, sem nada da Apple) do pacote 0.2.2, com o texto da GPL-2.0 em `src/mac/LICENCA-GPL-2.0.txt`. O código-fonte está em [github.com/jsdf/pce](https://github.com/jsdf/pce) (o do PCE original, em [hampa.ch/pce](http://www.hampa.ch/pce/)); o `pcejs-macplus.umd.js` traz também o [xtend](https://github.com/Raynos/xtend) (MIT) e os módulos do [browserify](https://github.com/browserify/browserify) que imitam o Node no navegador (o [buffer](https://github.com/feross/buffer), o crypto-browserify, o stream e outros, cada um com a licença dele: MIT, BSD ou ISC). Nada da Apple vem com o Retro Computer: a ROM, o System e os jogos são do usuário, na pasta C:\Mac. "Macintosh", "Mac Plus", "Mac SE" e "Mac Classic" são marcas da Apple Inc., usadas só para dizer qual computador o emulador imita. O restante do Retro Computer continua MIT. |

## Programas instaláveis (não incluídos)

Os programas Craft (WordCraft, GridCraft, DeckCraft, PdfCraft, PhotoCraft, LightCraft, VectorCraft, FigCraft, DesignCraft, FilmCraft, EffectCraft, SoundCraft, CADCraft) são do ArtCraft Team, licença MIT ou Apache-2.0 (<https://github.com/storytold>). Eles não fazem parte do Retro Computer: cada um é baixado do lançamento oficial, sem modificação, quando o usuário o instala. Os nomes e logotipos são marcas deles.

O Firefox (Mozilla, MPL-2.0) também não faz parte do Retro Computer: é o instalado no computador (ou, no Linux, instalado pelo Flathub a pedido do usuário), aberto sem modificação, com um perfil próprio. O visual da época vem só de um `userChrome.css` escrito pelo Retro Computer nesse perfil, com a fonte Katica do SerenityOS. "Firefox" e o logotipo são marcas da Mozilla Foundation; a barra de tarefas mostra a janela dele com o ícone do Navegador do Retro Computer.

Os programas da aba "Programas do Linux" vêm do [Flathub](https://flathub.org/), cada um com a sua licença (mostrada na ficha do programa); eles são instalados pelo Flatpak do próprio Linux, e os ícones e as capturas da loja são lidos do Flathub na hora, sem fazer parte do Retro Computer.

Os da aba "Programas do Windows" vêm do [winget](https://github.com/microsoft/winget-cli) (o Gerenciador de Pacotes do Windows, que vem no Windows), só da fonte oficial `winget`; as fichas são lidas na hora dos manifestos do repositório [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs) (MIT). Os da aba "Programas do Mac" vêm do [Homebrew](https://brew.sh/) (BSD-2-Clause), com a lista e as descrições da interface oficial dele ([formulae.brew.sh](https://formulae.brew.sh/)). Nenhum dos dois faz parte do Retro Computer, e cada programa tem a sua licença e é baixado do site de quem o fez. Os ícones desses programas na loja são os do próprio computador (para os instalados) ou os publicados no site oficial de cada um, lidos na hora e sem fazer parte do Retro Computer; são marcas dos donos de cada programa.

Claude e Claude Code são da Anthropic. O Retro Computer só oferece instalar o Claude Code com o instalador oficial.

## Inspiração

O visual homenageia os computadores pessoais dos anos 90 (o tema Mac clássico, o visual cinza e listrado do Mac do fim da década). Nenhum ícone, fonte, som ou imagem da Microsoft ou da Apple é usado.
