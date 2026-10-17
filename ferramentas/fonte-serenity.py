#!/usr/bin/env python3
"""Converte uma fonte de bitmap do SerenityOS (.font, "!Fnt") em WOFF2.

Os pontos acesos viram o contorno da mancha que eles formam (veja contorno());
com font-size igual a `--px` (a altura do glifo), um ponto da fonte ocupa um
pixel da tela.
Licença das fontes de origem: BSD-2-Clause (SerenityOS).

Uso: python3 -I ferramentas/fonte-serenity.py ENTRADA.font SAIDA.woff2 NOME [ESTILO] [opções]
  --proprios       acrescenta os símbolos desenhados em ferramentas/glifos-terminal.py (os que faltam)
  --negrito        os símbolos próprios engrossados, para a versão em negrito
  --de OUTRA.font  os glifos que faltam vêm da OUTRA fonte, engrossados (o negrito a partir da regular)

A margem esquerda de cada glifo (o "lsb") é a do desenho: com ela em zero, o Chromium encostava
cada letra à esquerda da célula, e na fonte de largura fixa o "i" e o "l" deixavam um buraco depois.
"""
import importlib.util
import os
import struct
import sys

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

UN = 100  # unidades por ponto da fonte


def ler(caminho):
    dados = open(caminho, 'rb').read()
    (magic, gw, gh, rms, var, esp, base, media, pres, peso, incl) = struct.unpack_from('<4sBBHBBBBBHB', dados, 0)
    assert magic == b'!Fnt', 'não é uma fonte !Fnt'
    nome = dados[16:48].split(b'\0')[0].decode()
    familia = dados[48:80].split(b'\0')[0].decode()
    pos = 80
    mascara = dados[pos:pos + rms]
    pos += rms
    faixas = []
    for i, b in enumerate(mascara):
        for j in range(8):
            if b & (1 << j):
                faixas.append((i * 8 + j) * 256)
    n = 256 * len(faixas)
    linhas = dados[pos:pos + n * 4 * gh]
    pos += n * 4 * gh
    larguras = dados[pos:pos + n]
    glifos = {}
    for k, ini in enumerate(faixas):
        for c in range(256):
            idx = k * 256 + c
            w = larguras[idx] if var else (gw if larguras[idx] else 0)
            if not w:
                continue
            rows = struct.unpack_from('<%dI' % gh, linhas, idx * 4 * gh)
            glifos[ini + c] = (w, rows)
    return dict(gw=gw, gh=gh, esp=esp, base=base, nome=nome, familia=familia, glifos=glifos, peso=peso)


def contorno(f, w, rows):
    """A borda dos pontos acesos: um contorno por mancha (e um por buraco), sem um quadrado por ponto.

    Com um contorno por linha de pontos, o "hinting" do Linux (o leve, padrão do Linux Mint) encaixava
    cada um na grade da tela por conta própria e, nos tamanhos de pixel quebrados (1,5 ×), abria
    frestas brancas entre as linhas da letra. Os vértices são os cantos da grade (i, j), com j de cima.
    """
    pen = TTGlyphPen(None)
    base = f['base']

    def aceso(x, y):
        return 0 <= x < w and 0 <= y < len(rows) and (rows[y] >> x) & 1

    # As arestas de cada ponto no sentido horário (com o y para cima), só as que dão para fora:
    # a de dois pontos vizinhos se cancela.
    saidas = {}
    for y in range(len(rows)):
        for x in range(w):
            if not aceso(x, y):
                continue
            for a, b, vizinho in (((x, y + 1), (x, y), (x - 1, y)), ((x, y), (x + 1, y), (x, y - 1)),
                                  ((x + 1, y), (x + 1, y + 1), (x + 1, y)), ((x + 1, y + 1), (x, y + 1), (x, y + 1))):
                if not aceso(*vizinho):
                    saidas.setdefault(a, []).append(b)

    def direcao(a, b):
        return (b[0] - a[0], b[1] - a[1])

    # O menor vértice começa: ele é sempre um canto e nunca um ponto em que o contorno passa duas vezes.
    while saidas:
        ini = min(saidas)
        a, b = ini, saidas[ini].pop()
        if not saidas[ini]:
            del saidas[ini]
        primeira = direcao(a, b)
        pontos = [a]
        while b != ini:
            d = direcao(a, b)
            opcoes = saidas[b]
            # No canto em que dois pontos só se tocam na diagonal, vira para o lado aceso (à direita):
            # cada ponto fica no contorno dele, sem o contorno cruzar a si mesmo.
            direita = (-d[1], d[0])
            c = next((o for o in opcoes if direcao(b, o) == direita), opcoes[0])
            opcoes.remove(c)
            if not opcoes:
                del saidas[b]
            if direcao(b, c) != d:
                pontos.append(b)
            a, b = b, c
        if direcao(a, b) == primeira:
            pontos.pop(0)
        pen.moveTo((pontos[0][0] * UN, (base - pontos[0][1]) * UN))
        for i, j in pontos[1:]:
            pen.lineTo((i * UN, (base - j) * UN))
        pen.closePath()
    return pen.glyph()


def modulo_glifos():
    sys.dont_write_bytecode = True  # sem a pasta __pycache__ ao lado das ferramentas
    caminho = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'glifos-terminal.py')
    spec = importlib.util.spec_from_file_location('glifos_terminal', caminho)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def margem(w, rows):
    """A primeira coluna acesa do glifo (0 no glifo vazio, como o espaço)."""
    cols = [x for x in range(w) if any(r & (1 << x) for r in rows)]
    return min(cols) if cols else 0


def main():
    args = sys.argv[1:]
    opcoes = {'--proprios': False, '--negrito': False}
    outra = None
    pos = []
    i = 0
    while i < len(args):
        if args[i] in opcoes:
            opcoes[args[i]] = True
        elif args[i] == '--de':
            i += 1
            outra = args[i]
        else:
            pos.append(args[i])
        i += 1
    ent, sai, nome = pos[0], pos[1], pos[2]
    estilo = pos[3] if len(pos) > 3 else 'Regular'
    f = ler(ent)
    if opcoes['--proprios']:
        g = modulo_glifos()
        for c, v in g.proprios(negrito=opcoes['--negrito']).items():
            f['glifos'].setdefault(c, v)
    if outra:
        g = modulo_glifos()
        o = ler(outra)
        for c, (w, rows) in o['glifos'].items():
            if c not in f['glifos'] and w == f['gw']:
                f['glifos'][c] = (w, g.engrossar(rows, w))
    gh = f['gh']
    em = gh * UN
    fb = FontBuilder(em, isTTF=True)
    ordem = ['.notdef'] + ['u%04X' % c for c in sorted(f['glifos'])]
    fb.setupGlyphOrder(ordem)
    fb.setupCharacterMap({c: 'u%04X' % c for c in f['glifos']})
    glyf = {'.notdef': TTGlyphPen(None).glyph()}
    metr = {'.notdef': (f['gw'] * UN, 0)}
    for c, (w, rows) in f['glifos'].items():
        g = contorno(f, w, rows)
        glyf['u%04X' % c] = g
        metr['u%04X' % c] = ((w + f['esp']) * UN, margem(w, rows) * UN)
    fb.setupGlyf(glyf)
    fb.setupHorizontalMetrics(metr)
    asc = (f['base'] + 1) * UN
    desc = asc - em
    fb.setupHorizontalHeader(ascent=asc, descent=desc)
    fb.setupNameTable({'familyName': nome, 'styleName': estilo,
                       'copyright': 'Copyright (c) 2018-2026, the SerenityOS developers. BSD-2-Clause.'})
    fb.setupOS2(sTypoAscender=asc, sTypoDescender=desc, usWinAscent=asc, usWinDescent=-desc,
                usWeightClass=f['peso'] or 400)
    fb.setupPost(underlinePosition=-UN, underlineThickness=UN)
    fb.font.flavor = 'woff2'
    fb.save(sai)
    print(f"{sai}: {len(f['glifos'])} glifos, altura {gh}, base {f['base']}")


if __name__ == '__main__':
    main()
