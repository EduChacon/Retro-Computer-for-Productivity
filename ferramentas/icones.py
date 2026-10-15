#!/usr/bin/env python3
"""Gera os ícones da área de trabalho em src/sistema/icones/{16,32}/.

Origem:
  - a maioria vem do SerenityOS (BSD-2-Clause; "Copyright (c) 2018-2026, the
    SerenityOS developers"), com as pastas recoloridas de amarelo;
  - os que faltam são desenhados aqui, ponto a ponto (o computador, a caixa de
    programas, o tomate do Pomodoro, o disquete do botão Iniciar, a pena do
    processador de texto, a lixeira cheia) — desenhos próprios do projeto.

Uso: python3 -I ferramentas/icones.py PASTA_DO_SERENITY [--folha SAIDA.png]
     (PASTA_DO_SERENITY é a raiz do repositório, com Base/res/icons)
"""
import colorsys
import os
import sys

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(RAIZ, 'src', 'sistema', 'icones')

# nome no Retro Computer -> (nome no SerenityOS 32x32, nome 16x16)
DO_SERENITY = {
    'disco': ('hard-disk', 'hard-disk'),
    'lixeira': ('recycle-bin', 'trash-can'),
    'pasta': ('filetype-folder', 'filetype-folder'),
    'pasta-aberta': ('filetype-folder-open', 'filetype-folder-open'),
    'bloco': ('app-text-editor', 'app-text-editor'),
    'prompt': ('app-terminal', 'app-terminal'),
    'claude': ('app-assistant', 'app-assistant'),
    'painel': ('app-settings', 'app-settings'),
    'aparencia': ('app-display-settings', 'app-display-settings'),
    'protecao': ('app-screensaver', 'app-screensaver'),
    'sons': ('app-sound-player', 'audio-volume-high'),
    'relogio': ('app-analog-clock', 'app-analog-clock'),
    'executar': ('app-run', 'app-run'),
    'ajuda': ('app-help', 'app-help'),
    'localizar': ('app-magnifier', 'find'),
    'desligar': ('shutdown', 'power'),
    'configuracoes': ('app-settings', 'settings'),
    'chave': ('key', 'certificate'),
    'navegador': ('search-engine', 'internet'),
    'calculadora': ('app-calculator', 'app-calculator'),
    'calendario': ('app-calendar', 'app-calendar'),
    'imagens': ('app-image-viewer', 'app-image-viewer'),
    'internet': ('search-engine', 'internet'),
    'rede': ('network', 'network'),
    'msg-erro': ('msgbox-error', None),
    'msg-info': ('msgbox-information', None),
    'msg-pergunta': ('msgbox-question', None),
    'msg-aviso': ('msgbox-warning', None),
    # tipos de arquivo
    'arquivo': ('filetype-unknown', 'filetype-unknown'),
    'texto': ('filetype-text', 'filetype-text'),
    'imagem': ('filetype-image', 'filetype-image'),
    'pdf': ('filetype-pdf', 'filetype-pdf'),
    'planilha': ('filetype-spreadsheet', 'filetype-spreadsheet'),
    'apresentacao': ('filetype-presenter', 'filetype-presenter'),
    'som': ('filetype-sound', 'filetype-sound'),
    'video': ('filetype-video', 'filetype-video'),
    'compactado': ('filetype-archive', 'filetype-archive'),
    'markdown': ('filetype-markdown', 'filetype-markdown'),
    'fonte': ('filetype-font', 'filetype-font'),
    'executavel': ('filetype-executable', 'filetype-executable'),
    'codigo': ('filetype-javascript', 'filetype-javascript'),
    'json': ('filetype-json', 'filetype-json'),
    'python': ('filetype-python', 'filetype-python'),
    'shell': ('filetype-shell', 'filetype-shell'),
    'calendario-arq': ('filetype-calendar', 'filetype-calendar'),
    # os Craft (pela função do programa)
    'gridcraft': ('app-spreadsheet', 'app-spreadsheet'),
    'deckcraft': ('app-presenter', 'app-presenter'),
    'pdfcraft': ('app-pdf-viewer', 'app-pdf-viewer'),
    'photocraft': ('app-pixel-paint', 'app-pixel-paint'),
    'lightcraft': ('app-screenshot', 'app-screenshot'),
    'vectorcraft': ('app-gradient', 'app-gradient'),
    'figcraft': ('app-theme-editor', 'app-theme-editor'),
    'designcraft': ('app-font-editor', 'app-font-editor'),
    'filmcraft': ('app-video-player', 'app-video-player'),
    'effectcraft': ('animation-effects', 'app-libgfx-demo'),
    'soundcraft': ('app-piano', 'app-piano'),
    'cadcraft': ('app-3d-file-viewer', 'app-3d-file-viewer'),
    'programa': ('filetype-executable', 'filetype-executable'),
}

PASTAS = {'pasta', 'pasta-aberta'}

# Paleta dos desenhos próprios (a mesma família de cinzas dos ícones do SerenityOS).
P = {
    '.': None,
    'K': (0, 0, 0), 'W': (255, 255, 255), 'L': (198, 198, 198), 'l': (226, 226, 226),
    'G': (132, 132, 132), 'D': (90, 90, 90), 'T': (0, 128, 128), 't': (0, 168, 168),
    'u': (120, 210, 210), 'S': (0, 72, 72), 'g': (0, 220, 0), 'h': (0, 120, 0),
    'R': (220, 32, 32), 'r': (150, 16, 16), 'p': (255, 120, 110), 'V': (40, 160, 40),
    'v': (20, 100, 20), 'B': (0, 0, 128), 'b': (40, 80, 200), 'c': (110, 150, 240),
    'Y': (250, 220, 40), 'y': (190, 150, 0), 'O': (240, 140, 30), 'M': (200, 160, 110),
    'm': (150, 110, 70), 'n': (110, 75, 40), 'N': (230, 200, 150),
}


def grade(linhas):
    a = len(linhas)
    w = max(len(x) for x in linhas)
    im = Image.new('RGBA', (w, a), (0, 0, 0, 0))
    for y, linha in enumerate(linhas):
        for x, ch in enumerate(linha):
            cor = P.get(ch)
            if cor:
                im.putpixel((x, y), cor + (255,))
    return im


COMPUTADOR_32 = [
    "................................",
    "................................",
    ".....KKKKKKKKKKKKKKKKKKKKKK.....",
    ".....KWWWWWWWWWWWWWWWWWWWGK.....",
    ".....KWLLLLLLLLLLLLLLLLLLGK.....",
    ".....KWLGGGGGGGGGGGGGGGLLGK.....",
    ".....KWLGSSSSSSSSSSSSSSWLGK.....",
    ".....KWLGSutTTTTTTTTTTTWLGK.....",
    ".....KWLGStTTTTTTTTTTTTWLGK.....",
    ".....KWLGSTTTTTTTTTTTTTWLGK.....",
    ".....KWLGSTTTTTTTTTTTTTWLGK.....",
    ".....KWLGSTTTTTTTTTTTTTWLGK.....",
    ".....KWLGSTTTTTTTTTTTTTWLGK.....",
    ".....KWLGSTTTTTTTTTTTTTWLGK.....",
    ".....KWLGSTTTTTTTTTTTTTWLGK.....",
    ".....KWLGSTTTTTTTTTTTTTWLGK.....",
    ".....KWLGWWWWWWWWWWWWWWWLGK.....",
    ".....KWLLLLLLLLLLLLLLLLGgGK.....",
    ".....KWGGGGGGGGGGGGGGGGGGGK.....",
    ".....KKKKKKKKKKKKKKKKKKKKKK.....",
    "...........KWLLLLLLGK...........",
    ".........KKKKKKKKKKKKKK.........",
    "..KKKKKKKKKKKKKKKKKKKKKKKKKKKK..",
    "..KWWWWWWWWWWWWWWWWWWWWWWWWWGK..",
    "..KWLLLLLLLLLLLLLLLLLLLLLLLLGK..",
    "..KWLgLLLLLLLLLLKKKKKKKKKKLLGK..",
    "..KWLhLLLLLLLLLLGGGGGGGGGGLLGK..",
    "..KWLLLLLLLLLLLLLLLLLLLLLLLLGK..",
    "..KWGGGGGGGGGGGGGGGGGGGGGGGGGK..",
    "..KKKKKKKKKKKKKKKKKKKKKKKKKKKK..",
    "................................",
    "................................",
]

COMPUTADOR_16 = [
    "................",
    "..KKKKKKKKKKKK..",
    "..KWWWWWWWWWGK..",
    "..KWGGGGGGGLGK..",
    "..KWGutTTTTWGK..",
    "..KWGtTTTTTWGK..",
    "..KWGTTTTTTWGK..",
    "..KWWWWWWWWgGK..",
    "..KKKKKKKKKKKK..",
    ".....KWLLGK.....",
    ".KKKKKKKKKKKKKK.",
    ".KWWWWWWWWWWWGK.",
    ".KWgLLLLKKKKLGK.",
    ".KGGGGGGGGGGGGK.",
    ".KKKKKKKKKKKKKK.",
    "................",
]

# O disquete do botão Iniciar (o logotipo do Retro Computer).
LOGO_16 = [
    "................",
    ".KKKKKKKKKKKKK..",
    ".KBBBLLLLLLKBBK.",
    ".KBBBLLLDDLKBBK.",
    ".KBBBLLLDDLKBBK.",
    ".KBBBLLLLLLKBBK.",
    ".KBBBBBBBBBBBBK.",
    ".KBWWWWWWWWWWBK.",
    ".KBWRRRRRRRRWBK.",
    ".KBWOOOOOOOOWBK.",
    ".KBWYYYYYYYYWBK.",
    ".KBWVVVVVVVVWBK.",
    ".KBWbbbbbbbbWBK.",
    ".KBWWWWWWWWWWBK.",
    ".KKKKKKKKKKKKKK.",
    "................",
]

LOGO_32 = [
    "................................",
    "................................",
    "...KKKKKKKKKKKKKKKKKKKKKKKKK....",
    "...KBBBBBBLLLLLLLLLLLLLLKBBBK...",
    "...KBBBBBBLlllllllllllLGKBBBBK..",
    "...KBBBBBBLlLLLLLLDDDLLGKBBBBK..",
    "...KBBBBBBLlLLLLLLDDDLLGKBBBBK..",
    "...KBBBBBBLlLLLLLLDDDLLGKBBBBK..",
    "...KBBBBBBLlLLLLLLDDDLLGKBBBBK..",
    "...KBBBBBBLlLLLLLLLLLLLGKBBBBK..",
    "...KBBBBBBLGGGGGGGGGGGGGKBBBBK..",
    "...KBBBBBBKKKKKKKKKKKKKKKBBBBK..",
    "...KBBBBBBBBBBBBBBBBBBBBBBBBBK..",
    "...KBBBBBBBBBBBBBBBBBBBBBBBBBK..",
    "...KBBBWWWWWWWWWWWWWWWWWWWBBBK..",
    "...KBBBWWWWWWWWWWWWWWWWWWWBBBK..",
    "...KBBBWRRRRRRRRRRRRRRRRRWBBBK..",
    "...KBBBWRRRRRRRRRRRRRRRRRWBBBK..",
    "...KBBBWOOOOOOOOOOOOOOOOOWBBBK..",
    "...KBBBWOOOOOOOOOOOOOOOOOWBBBK..",
    "...KBBBWYYYYYYYYYYYYYYYYYWBBBK..",
    "...KBBBWYYYYYYYYYYYYYYYYYWBBBK..",
    "...KBBBWVVVVVVVVVVVVVVVVVWBBBK..",
    "...KBBBWVVVVVVVVVVVVVVVVVWBBBK..",
    "...KBBBWbbbbbbbbbbbbbbbbbWBBBK..",
    "...KBBBWbbbbbbbbbbbbbbbbbWBBBK..",
    "...KBBBWWWWWWWWWWWWWWWWWWWBBBK..",
    "...KBBBWWWWWWWWWWWWWWWWWWWBBBK..",
    "...KKBBBBBBBBBBBBBBBBBBBBBBBBK..",
    "....KKKKKKKKKKKKKKKKKKKKKKKKKK..",
    "................................",
    "................................",
]

TOMATE_32 = [
    "................................",
    "................................",
    "..............vh................",
    "..............vh................",
    "...........VVVvhVVV.............",
    ".........VVhhVVhVhhVV...........",
    "........KKKVhVVKVVhVKKK.........",
    "......KKRRRKVKKRKKVKRRRKK.......",
    ".....KRRRRRRKRRRRRKRRRRRRK......",
    "....KRRpppRRRRRRRRRRRRRRRRK.....",
    "...KRRppWpRRRRRRRRRRRRRRRRRK....",
    "...KRpppppRRRRRRRRRRRRRRRRRK....",
    "..KRRppppRRRRRRRRRRRRRRRRRRRK...",
    "..KRRpppRRRRRRRRRRRRRRRRRRRRK...",
    "..KRRRpRRRRRRRRRRRRRRRRRRRRRK...",
    "..KRRRRRRRRRRRRRRRRRRRRRRRRRK...",
    "..KRRRRRRRRRRRRRRRRRRRRRRRRrK...",
    "..KRRRRRRRRRRRRRRRRRRRRRRRRrK...",
    "..KRRRRRRRRRRRRRRRRRRRRRRRrrK...",
    "..KRRRRRRRRRRRRRRRRRRRRRRRrrK...",
    "...KRRRRRRRRRRRRRRRRRRRRRrrK....",
    "...KRRRRRRRRRRRRRRRRRRRRrrrK....",
    "....KRRRRRRRRRRRRRRRRRRrrrK.....",
    ".....KrRRRRRRRRRRRRRRRrrrK......",
    "......KKrrRRRRRRRRRRrrrKK.......",
    "........KKKrrrrrrrrKKK..........",
    "...........KKKKKKKK.............",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
]

TOMATE_16 = [
    "................",
    ".......vh.......",
    ".....VVvhVV.....",
    "....KVhVVhVK....",
    "..KKRKVKKVKRKK..",
    ".KRppRRRRRRRRRK.",
    ".KRpWRRRRRRRRRK.",
    "KRRppRRRRRRRRRrK",
    "KRRRRRRRRRRRRRrK",
    "KRRRRRRRRRRRRrrK",
    "KRRRRRRRRRRRRrrK",
    ".KRRRRRRRRRRrrK.",
    ".KrRRRRRRRRrrrK.",
    "..KKrrrrrrrrKK..",
    "....KKKKKKKK....",
    "................",
]

# A caixa de "Adicionar ou remover programas": uma caixa aberta com um disquete.
CAIXA_32 = [
    "................................",
    "................................",
    "................................",
    "............KKKKKKKKK...........",
    "............KBBLLLLBK...........",
    "............KBBLLDLBK...........",
    "............KBBBBBBBK...........",
    "............KBWWWWWBK...........",
    "............KBWbbbWBK...........",
    "....KKKK....KBWWWWWBK....KKKK...",
    "...KNNNNKK..KBBBBBBBK..KKNNNNK..",
    "..KNNNNNNNKKKKKKKKKKKKKNNNNNNNK.",
    "..KKNNNNNNNNKmmmmmmmKNNNNNNNNKK.",
    "...KKKKNNNNNNKmmmmmKNNNNNNKKKK..",
    "...KMMMKKKKKKKKKKKKKKKKKKKMMMK..",
    "...KMMMMMMMMMMMMMMMMMMMMMMMmmK..",
    "...KMMMMMMMMMMMMMMMMMMMMMMMmmK..",
    "...KMMMMMMMMNNNNNNNNMMMMMMMmmK..",
    "...KMMMMMMMMMMMMMMMMMMMMMMMmmK..",
    "...KMMMMMMMMMMMMMMMMMMMMMMMmmK..",
    "...KMMMMMMMMMMMMMMMMMMMMMMMmmK..",
    "...KMMMMMMMMMMMMMMMMMMMMMMMmmK..",
    "...KMMMMMMMMMMMMMMMMMMMMMMMmmK..",
    "...KMMMMMMMMMMMMMMMMMMMMMMMmmK..",
    "...KMMMMMMMMMMMMMMMMMMMMMMMmmK..",
    "...KmmmmmmmmmmmmmmmmmmmmmmmmnK..",
    "...KKKKKKKKKKKKKKKKKKKKKKKKKKK..",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
]

CAIXA_16 = [
    "................",
    "......KKKKK.....",
    "......KBLLK.....",
    "......KBBBK.....",
    "......KWbWK.....",
    "..KKK.KKKKK.KKK.",
    ".KNNNKKmmmKKNNNK",
    ".KKKNNNKmKNNNKKK",
    ".KMMKKKKKKKKKMMK",
    ".KMMMMMMMMMMMmmK",
    ".KMMMMNNNNMMMmmK",
    ".KMMMMMMMMMMMmmK",
    ".KMMMMMMMMMMMmmK",
    ".KmmmmmmmmmmmmnK",
    ".KKKKKKKKKKKKKKK",
    "................",
]

# A pena azul do processador de texto (sobre uma folha do SerenityOS).
PENA_32 = [
    "........................KK",
    ".......................KcbK",
    "......................KcbBK",
    ".....................KcbBK.",
    "....................KcbBK..",
    "...................KcbBK...",
    "..................KcbBK....",
    ".................KcbBK.....",
    "................KYyBK......",
    "...............KYyyK.......",
    "..............KYyKK........",
    "..............KyK..........",
    ".............KK............",
]

PENA_16 = [
    "..........KK",
    ".........KcK",
    "........KcBK",
    ".......KcBK.",
    "......KYBK..",
    ".....KYyK...",
    ".....KK.....",
]

PAPEIS_32 = [
    "......KKK...KKKK....",
    ".....KWWWK.KWWLWK...",
    "....KWLWWWKWWWWWLK..",
    "...KWWWWLWKWLWWWWK..",
    "...KLWWWWKWWWWLWK...",
    "....KKWLKKKWWWKK....",
]


def recolorir_pasta(im):
    """De bege (SerenityOS) para o amarelo das pastas dos anos 90."""
    im = im.copy()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s < 0.08 or not (0.02 < h < 0.14):
                continue
            nh = 0.15
            ns = min(1.0, s * 2.4 + 0.15)
            nv = min(1.0, v * 1.12)
            nr, ng, nb = colorsys.hsv_to_rgb(nh, ns, nv)
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return im


def colar(base, sobre, x, y):
    im = base.copy()
    im.alpha_composite(sobre, (x, y))
    return im


def abrir_serenity(raiz, tam, nome):
    return Image.open(os.path.join(raiz, 'Base', 'res', 'icons', f'{tam}x{tam}', nome + '.png')).convert('RGBA')


def gerar(serenity):
    feitos = {16: {}, 32: {}}
    for nome, (n32, n16) in DO_SERENITY.items():
        for tam, n in ((32, n32), (16, n16)):
            if not n:
                continue
            im = abrir_serenity(serenity, tam, n)
            if nome in PASTAS:
                im = recolorir_pasta(im)
            feitos[tam][nome] = im

    feitos[32]['computador'] = grade(COMPUTADOR_32)
    feitos[16]['computador'] = grade(COMPUTADOR_16)
    feitos[32]['logo'] = grade(LOGO_32)
    feitos[16]['logo'] = grade(LOGO_16)
    feitos[32]['foco'] = grade(TOMATE_32)
    feitos[16]['foco'] = grade(TOMATE_16)
    feitos[32]['programas-caixa'] = grade(CAIXA_32)
    feitos[16]['programas-caixa'] = grade(CAIXA_16)

    # O processador de texto: a folha com linhas e a pena azul.
    feitos[32]['wordcraft'] = colar(abrir_serenity(serenity, 32, 'filetype-text'), grade(PENA_32), 6, 2)
    feitos[16]['wordcraft'] = colar(abrir_serenity(serenity, 16, 'filetype-text'), grade(PENA_16), 4, 0)
    feitos[32]['documento'] = feitos[32]['wordcraft']
    feitos[16]['documento'] = feitos[16]['wordcraft']

    # Meus documentos: a pasta amarela com uma folha saindo.
    folha32 = abrir_serenity(serenity, 16, 'filetype-text')
    feitos[32]['documentos'] = colar(feitos[32]['pasta'], folha32, 13, 9)
    feitos[16]['documentos'] = colar(feitos[16]['pasta'], abrir_serenity(serenity, 16, 'filetype-text').resize((10, 10), Image.NEAREST), 6, 5)

    # A pasta Programas do menu Iniciar: a pasta com uma janelinha.
    janela16 = abrir_serenity(serenity, 16, 'window')
    feitos[32]['pasta-programas'] = colar(feitos[32]['pasta'], janela16, 14, 12)
    feitos[16]['pasta-programas'] = colar(feitos[16]['pasta'], janela16.crop((1, 2, 15, 14)).resize((9, 8), Image.NEAREST), 7, 7)

    # Página da internet: a folha com o globo.
    feitos[32]['html'] = colar(abrir_serenity(serenity, 32, 'filetype-unknown'), abrir_serenity(serenity, 16, 'internet'), 13, 13)
    feitos[16]['html'] = abrir_serenity(serenity, 16, 'internet')

    # A lixeira cheia: papéis amassados por cima.
    feitos[32]['lixeira-cheia'] = colar(feitos[32]['lixeira'], grade(PAPEIS_32), 6, 0)
    feitos[16]['lixeira-cheia'] = feitos[16]['lixeira']

    for tam in (16, 32):
        pasta = os.path.join(DESTINO, str(tam))
        os.makedirs(pasta, exist_ok=True)
        for nome, im in feitos[tam].items():
            im.save(os.path.join(pasta, nome + '.png'), optimize=True)
    return feitos


def folha(feitos, saida, esc=3):
    from PIL import ImageDraw
    nomes = sorted(feitos[32])
    cols = 8
    cw, ch = 32 * esc + 70, 32 * esc + 30
    im = Image.new('RGB', (cols * cw, ((len(nomes) + cols - 1) // cols) * ch), (0, 128, 128))
    d = ImageDraw.Draw(im)
    for i, n in enumerate(nomes):
        x, y = (i % cols) * cw + 4, (i // cols) * ch + 4
        a = feitos[32][n].resize((32 * esc, 32 * esc), Image.NEAREST)
        im.paste(a, (x, y), a)
        if n in feitos[16]:
            b = feitos[16][n].resize((16 * esc, 16 * esc), Image.NEAREST)
            im.paste(b, (x + 32 * esc + 4, y), b)
        d.text((x, y + 32 * esc + 4), n, fill=(255, 255, 255))
    im.save(saida)


if __name__ == '__main__':
    f = gerar(sys.argv[1])
    if '--folha' in sys.argv:
        folha(f, sys.argv[sys.argv.index('--folha') + 1])
    print('ícones:', len(f[32]), '(32)', len(f[16]), '(16)')
