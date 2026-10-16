#!/usr/bin/env python3
"""
Os cursores grandes da Acessibilidade (Painel de controle › Acessibilidade › Mouse), tirados do
tema "Default" de cursores do SerenityOS (BSD-2-Clause): as versões "-2x" (o dobro do tamanho)
e a mão ampliada ponto a ponto. Os pontos ativos ficam em CURSORES, para o estilo.css.

Uso: python3 -I ferramentas/cursores.py PASTA_DO_SERENITY
"""
import os
import sys
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(RAIZ, 'src', 'sistema', 'cursores')

# nome no Retro Computer: (arquivo do SerenityOS, ampliar, ponto ativo depois de ampliar)
CURSORES = {
    'seta': ('arrow.x2y2-2x.png', 1, (4, 4)),
    'texto': ('i-beam-2x.png', 1, (15, 25)),
    'mao': ('hand.x8y4.png', 2, (16, 8)),
    'horizontal': ('resize-horizontal-2x.png', 1, (23, 13)),
    'vertical': ('resize-vertical-2x.png', 1, (13, 23)),
    'diagonal-1': ('resize-diagonal-tlbr-2x.png', 1, (21, 21)),
    'diagonal-2': ('resize-diagonal-bltr-2x.png', 1, (21, 21)),
    'mira': ('crosshair-2x.png', 1, (21, 21)),
    'mover': ('move-2x.png', 1, (25, 25)),
}


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    origem = os.path.join(sys.argv[1], 'Base', 'res', 'cursor-themes', 'Default')
    os.makedirs(DESTINO, exist_ok=True)
    for nome, (arq, k, ponto) in CURSORES.items():
        im = Image.open(os.path.join(origem, arq)).convert('RGBA')
        if k != 1:
            im = im.resize((im.width * k, im.height * k), Image.NEAREST)
        im.save(os.path.join(DESTINO, nome + '.png'), optimize=True)
        print(f'{nome}.png {im.size} ponto {ponto}')


if __name__ == '__main__':
    main()
