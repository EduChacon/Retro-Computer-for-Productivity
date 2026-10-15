# Atribuições

O Retro Computer é de código aberto (licença MIT, veja [LICENSE](LICENSE)). Ele usa os recursos de terceiros abaixo, cada um com a sua licença.

## Ícones e fontes: SerenityOS

- **Origem:** <https://github.com/SerenityOS/serenity> (`Base/res/icons` e `Base/res/fonts`).
- **Uso:** os ícones de `src/sistema/icones/` (exceto os desenhos próprios listados abaixo), com as pastas recoloridas de amarelo por `ferramentas/icones.py`; as fontes Katica (interface) e Csilla (Prompt de comando), convertidas de bitmap para WOFF2 por `ferramentas/fonte-serenity.py`, só com o alfabeto latino.
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

Feitos ponto a ponto em `ferramentas/icones.py`: `computador`, `logo` (o disquete do botão Iniciar), `foco` (o tomate), `programas-caixa`, a pena de `wordcraft`/`documento`, os papéis de `lixeira-cheia` e as composições `documentos`, `pasta-programas` e `html`. Os sons (`src/sistema/js/sons.js`) são sintetizados na hora. Os padrões de fundo (`src/sistema/js/aparencia.js`) são desenhos próprios de 8×8 pontos.

## Bibliotecas

| Biblioteca | Licença | Uso |
|---|---|---|
| [Electron](https://www.electronjs.org/) | MIT | o aplicativo |
| [xterm.js](https://xtermjs.org/) e complementos (fit, webgl, unicode11) | MIT | o terminal do Prompt de comando |
| [node-pty](https://github.com/microsoft/node-pty) | MIT | o shell do Prompt de comando |
| [yauzl](https://github.com/thejoshwolfe/yauzl) | MIT | extrair os pacotes dos programas |

## Programas instaláveis (não incluídos)

Os programas Craft (WordCraft, GridCraft, DeckCraft, PdfCraft, PhotoCraft, LightCraft, VectorCraft, FigCraft, DesignCraft, FilmCraft, EffectCraft, SoundCraft, CADCraft) são do ArtCraft Team, licença MIT ou Apache-2.0 (<https://github.com/storytold>). Eles não fazem parte do Retro Computer: cada um é baixado do lançamento oficial, sem modificação, quando o usuário o instala. Os nomes e logotipos são marcas deles.

Claude e Claude Code são da Anthropic. O Retro Computer só oferece instalar o Claude Code com o instalador oficial.

## Inspiração

O visual homenageia os computadores pessoais dos anos 90. Nenhum ícone, fonte, som ou imagem da Microsoft ou da Apple é usado.
