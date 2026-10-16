# Atribuições

O Retro Computer é de código aberto (licença MIT, veja [LICENSE](LICENSE)). Ele usa os recursos de terceiros abaixo, cada um com a sua licença.

## Ícones e fontes: SerenityOS

- **Origem:** <https://github.com/SerenityOS/serenity> (`Base/res/icons`, `Base/res/fonts` e `Base/res/cursor-themes/Default`).
- **Uso:** os ícones de `src/sistema/icones/` (exceto os desenhos próprios listados abaixo), com as pastas recoloridas de amarelo por `ferramentas/icones.py`; as fontes Katica (interface) e Csilla (Prompt de comando), convertidas de bitmap para WOFF2 por `ferramentas/fonte-serenity.py`, só com o alfabeto latino; os cursores grandes da Acessibilidade (`src/sistema/cursores/`, as versões em dobro do tema "Default" e a mão ampliada, por `ferramentas/cursores.py`).
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

Feitos ponto a ponto em `ferramentas/icones.py`: `computador`, `logo` (o disquete do botão Iniciar), `foco` (o tomate), `programas-caixa`, a pena de `wordcraft`/`documento`, os papéis de `lixeira-cheia`, `breakout`, `removivel` (o pendrive), `impressora`, `bluetooth`, o muro de tijolos do `firewall`, o escudo da Central de segurança (`seguranca`, com o cadeado da bandeja), o `microfone`, a `barra-tarefas` (a área de trabalho com a barra embaixo e o disquete do próprio Retro Computer no botão Iniciar) e os da bandeja (a bateria carregando também é o ícone `energia`, das Opções de energia) (`sino`, `cadeado`, `brilho`, `sinal-*`, `bateria-*` e `bateria-carga-*`). As composições juntam ícones do SerenityOS com esses desenhos: `documentos`, `pasta-programas`, `html`, `reprodutor` (o filme com o botão de tocar), `lightcraft` (a foto com o sol) `atualizacoes` (o computador com as setas) e `firewall` (o muro na frente do globo do SerenityOS). A prancheta da área de transferência (`transferencia`) é o `paste` do SerenityOS, o Mapa de caracteres (`caracteres`), o `app-character-map`, o Diário de trabalho (`diario`), o `filetype-calendar`, e a Cópia de segurança (`copia`) junta o `hard-disk` com o `reload`. As cartas da Paciência, o Campo Minado e o Breakout são desenhados na hora pelo próprio código, assim como as peças e os tabuleiros das Damas e do Xadrez (`src/sistema/js/jogos/pecas.js` e `tabuleiro.js`); o ícone das Damas (`damas`, as duas pedras) é desenhado por `ferramentas/icones.py` do mesmo jeito. Os sons (`src/sistema/js/sons.js`) são sintetizados na hora. Os padrões de fundo (`src/sistema/js/aparencia.js`) são desenhos próprios de 8×8 pontos. O tema "Retro" do Openbox (`recursos/linux/openbox/`) também é próprio.

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

## Programas instaláveis (não incluídos)

Os programas Craft (WordCraft, GridCraft, DeckCraft, PdfCraft, PhotoCraft, LightCraft, VectorCraft, FigCraft, DesignCraft, FilmCraft, EffectCraft, SoundCraft, CADCraft) são do ArtCraft Team, licença MIT ou Apache-2.0 (<https://github.com/storytold>). Eles não fazem parte do Retro Computer: cada um é baixado do lançamento oficial, sem modificação, quando o usuário o instala. Os nomes e logotipos são marcas deles.

O Firefox (Mozilla, MPL-2.0) também não faz parte do Retro Computer: é o instalado no computador (ou, no Linux, instalado pelo Flathub a pedido do usuário), aberto sem modificação, com um perfil próprio. O visual da época vem só de um `userChrome.css` escrito pelo Retro Computer nesse perfil, com a fonte Katica do SerenityOS. "Firefox" e o logotipo são marcas da Mozilla Foundation; a barra de tarefas mostra a janela dele com o ícone do Navegador do Retro Computer.

Os programas da aba "Programas do Linux" vêm do [Flathub](https://flathub.org/), cada um com a sua licença (mostrada na ficha do programa); eles são instalados pelo Flatpak do próprio Linux, e os ícones e as capturas da loja são lidos do Flathub na hora, sem fazer parte do Retro Computer.

Claude e Claude Code são da Anthropic. O Retro Computer só oferece instalar o Claude Code com o instalador oficial.

## Inspiração

O visual homenageia os computadores pessoais dos anos 90. Nenhum ícone, fonte, som ou imagem da Microsoft ou da Apple é usado.
