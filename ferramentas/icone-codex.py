#!/usr/bin/env python3
"""Ícone próprio do Codex: um terminal com >_, sem logotipos de terceiros."""
from pathlib import Path
from PIL import Image, ImageDraw


def desenhar(tam, mac=False):
    im = Image.new('RGBA', (16, 16))
    d = ImageDraw.Draw(im)
    d.rectangle((1, 2, 14, 13), fill='#dddddd' if mac else '#c0c0c0', outline='#000000')
    d.line((2, 3, 13, 3), fill='#ffffff')
    d.rectangle((3, 5, 12, 11), fill='#142c2c', outline='#000000')
    d.line([(5, 6), (7, 8), (5, 10)], fill='#aaffcc')
    d.line((8, 10, 10, 10), fill='#aaffcc')
    d.line((5, 14, 10, 14), fill='#000000')
    return im.resize((tam, tam), Image.Resampling.NEAREST)


if __name__ == '__main__':
    raiz = Path(__file__).resolve().parents[1] / 'src' / 'sistema'
    for mac in (False, True):
        for tam in (16, 32):
            desenhar(tam, mac).save(raiz / ('icones-mac' if mac else 'icones') / str(tam) / 'codex.png', optimize=True)
