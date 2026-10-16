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
    'usuarios': ('app-user-settings', 'app-user-settings'),
    'navegador': ('search-engine', 'internet'),
    'calculadora': ('app-calculator', 'app-calculator'),
    'caracteres': ('app-character-map', 'app-character-map'),
    'diario': ('filetype-calendar', 'filetype-calendar'),
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
    'acessibilidade': ('app-magnifier', 'app-magnifier'),
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
    'vectorcraft': ('app-gradient', 'app-gradient'),
    'figcraft': ('app-theme-editor', 'app-theme-editor'),
    'designcraft': ('app-font-editor', 'app-font-editor'),
    'effectcraft': ('animation-effects', 'app-libgfx-demo'),
    'soundcraft': ('app-piano', 'app-piano'),
    'cadcraft': ('app-3d-file-viewer', 'app-3d-file-viewer'),
    'filmcraft': ('app-video-player', 'app-video-player'),
    'programa': ('filetype-executable', 'filetype-executable'),
    # 0.3.0: e-mail, jogos e a barra do Navegador (só em 16 pontos).
    'correio': ('app-mail', 'app-mail'),
    'jogos': ('games', 'games'),
    'paciencia': ('app-solitaire', 'app-solitaire'),
    'campo-minado': ('app-minesweeper', 'app-minesweeper'),
    'xadrez': ('app-chess', 'app-chess'),
    'voltar': (None, 'go-back'),
    'avancar': (None, 'go-forward'),
    'parar': (None, 'stop'),
    'atualizar': (None, 'reload'),
    'inicio': (None, 'go-home'),
    'favoritos': (None, 'bookmark-filled'),
    # 1.0: o Painel de controle › Teclado.
    'teclado': ('app-keyboard-settings', 'app-keyboard-settings'),
    # 1.0: as ferramentas (o Reprodutor de mídia, a Captura de tela, o Monitor do sistema)
    # e os botões das barras delas (só em 16 pontos).
    'captura': ('app-screenshot', 'app-screenshot'),
    'monitor': ('app-system-monitor', 'app-system-monitor'),
    'tocar': (None, 'play'),
    'pausar': (None, 'pause'),
    'anterior': (None, 'go-first'),
    'proximo': (None, 'go-last'),
    'girar-esq': (None, 'edit-rotate-ccw'),
    'girar-dir': (None, 'edit-rotate-cw'),
    'ajustar': (None, 'fit-image-to-view'),
    'tela-cheia': (None, 'fullscreen'),
    'ampliar': (None, 'zoom-in'),
    'reduzir': (None, 'zoom-out'),
    'tamanho-real': (None, 'zoom-reset'),
    'excluir': (None, 'delete'),
    'copiar': (None, 'edit-copy'),
    'finalizar': (None, 'kill'),
    'selecao': (None, 'select-all'),
    # 1.0: o mouse (os aparelhos do Bluetooth).
    'mouse': ('app-mouse', 'app-mouse'),
}

PASTAS = {'pasta', 'pasta-aberta', 'compactado'}  # a pasta compactada também fica amarela

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


# O Breakout: as fileiras de tijolos, a bola e a raquete.
BREAKOUT_32 = [
    "................................",
    "................................",
    "..KKKKKKKKKKKKKKKKKKKKKKKKKKKK..",
    "..KRRRRRKRRRRRKRRRRRKRRRRRKRRK..",
    "..KRrrrrKRrrrrKRrrrrKRrrrrKRrK..",
    "..KKKKKKKKKKKKKKKKKKKKKKKKKKKK..",
    "..KOOOKOOOOOKOOOOOKOOOOOKOOOOK..",
    "..KOyyKOyyyyKOyyyyKOyyyyKOyyyK..",
    "..KKKKKKKKKKKKKKKKKKKKKKKKKKKK..",
    "..KYYYYYKYYYYYKYYYYYK......KYK..",
    "..KYyyyyKYyyyyKYyyyyK......KyK..",
    "..KKKKKKKKKKKKKKKKKKK......KKK..",
    "..KVVVKVVVVVK..................",
    "..KVvvKVvvvvK..................",
    "..KKKKKKKKKKK..................",
    "................................",
    "................................",
    "................KKKK............",
    "...............KWWLGK...........",
    "...............KWLLGK...........",
    "...............KLLGGK...........",
    "................KKKK............",
    "................................",
    "................................",
    "................................",
    "................................",
    "............KKKKKKKKKKKK........",
    "...........KWWWWWWWWWWWLK.......",
    "...........KWLLLLLLLLLLGK.......",
    "............KKKKKKKKKKKK........",
    "................................",
    "................................",
]

BREAKOUT_16 = [
    "................",
    "KKKKKKKKKKKKKKKK",
    "KRRRKRRRKRRRKRRK",
    "KKKKKKKKKKKKKKKK",
    "KOOKOOOKOOOK..KK",
    "KKKKKKKKKKKK....",
    "KYYYKYYYK.......",
    "KKKKKKKKK.......",
    "................",
    "........KK......",
    ".......KWLK.....",
    "........KK......",
    "................",
    "....KKKKKKKK....",
    "...KWWWWWWLLK...",
    "....KKKKKKKK....",
]

# O pendrive (disco removível): o conector de metal e o corpo azul.
PENDRIVE_32 = [
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "...........KKKKKKKKKKKKKKKKKKK..",
    "..KKKKKKKKKKccccccccccccccccbK..",
    "..KWWWWWWWWKcbbbbbbbbbbbbbbbBK..",
    "..KWLLLLLLGKcbbbbbbbbbbbbbbbBK..",
    "..KWLKKLKKGKcbbbWWWWWWbbbbbbBK..",
    "..KWLKKLKKGKcbbbWbbbbbbbbbbbBK..",
    "..KWLLLLLLGKcbbbWWWWbbbbbbbbBK..",
    "..KWLKKLKKGKcbbbbbbbbbbbbbbbBK..",
    "..KWLKKLKKGKcbbbbbbbbbbbbbbbBK..",
    "..KWLLLLLLGKcbbbbbbbbbbbbbbbBK..",
    "..KGGGGGGGGKbBBBBBBBBBBBBBBBBK..",
    "..KKKKKKKKKKKKKKKKKKKKKKKKKKKK..",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
]

# 1.0: a impressora (Painel de controle › Impressoras) e o Bluetooth (a bandeja), desenhos próprios.
IMPRESSORA_32 = [
    "................................",
    "................................",
    "................................",
    "................................",
    "..........KKKKKKKKKKKK..........",
    "..........KWWWWWWWWWWK..........",
    "..........KWGGGGGGGGWK..........",
    "..........KWWWWWWWWWWK..........",
    "..........KWGGGGGGWWWK..........",
    "..........KWWWWWWWWWWK..........",
    ".....KKKKKKKKKKKKKKKKKKKKKK.....",
    "....KlllllllllllllllllllllLK....",
    "...KlWWWWWWWWWWWWWWWWWWWWWLGK...",
    "...KlLLLLLLLLLLLLLLLLLLLLLLGK...",
    "...KlLLLLLLLLLLLLLLLLLgLhLLGK...",
    "...KlLLLLLLLLLLLLLLLLLLLLLLGK...",
    "...KlLDDDDDDDDDDDDDDDDDDDDLGK...",
    "...KlLKKKKKKKKKKKKKKKKKKKKLGK...",
    "...KlLLLLLLLLLLLLLLLLLLLLLLGK...",
    "...KGGGGGGGGGGGGGGGGGGGGGGGGK...",
    "...KKKKKKKKKKKKKKKKKKKKKKKKKK...",
    ".......KWWWWWWWWWWWWWWWWWK......",
    ".......KWGGGGGGGGGGGGWWWWK......",
    ".......KWWWWWWWWWWWWWWWWWK......",
    ".......KWGGGGGGGGGWWWWWWWK......",
    ".......KKKKKKKKKKKKKKKKKKK......",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
]

IMPRESSORA_16 = [
    "................",
    "................",
    ".....KKKKKK.....",
    ".....KWWWWK.....",
    ".....KWGGWK.....",
    "..KKKKKKKKKKKK..",
    ".KlWWWWWWWWWWLK.",
    ".KlLLLLLLLgLhGK.",
    ".KlLLLLLLLLLLGK.",
    ".KlDDDDDDDDDDGK.",
    ".KGGGGGGGGGGGGK.",
    ".KKKKKKKKKKKKKK.",
    "...KWWWWWWWWK...",
    "...KWGGGGGWWK...",
    "...KKKKKKKKKK...",
    "................",
]

BLUETOOTH_16 = [
    "................",
    "................",
    ".....bbbbbbb....",
    "....bbbbWbbbb...",
    "....bbbbWWbbb...",
    "....bbWbWbWbb...",
    "....bbbWWWbbb...",
    "....bbbbWbbbb...",
    "....bbbWWWbbb...",
    "....bbWbWbWbb...",
    "....bbbbWWbbb...",
    "....bbbbWbbbb...",
    ".....bbbbbbb....",
    "................",
    "................",
    "................",
]

PENDRIVE_16 = [
    "................",
    "................",
    "................",
    "................",
    "......KKKKKKKKK.",
    "KKKKKKcccccccbK.",
    "KWWWWKcbbbbbbBK.",
    "KWKLKKcbWWbbbBK.",
    "KWLLLKcbWbbbbBK.",
    "KWKLKKcbbbbbbBK.",
    "KGGGGKbBBBBBBBK.",
    "KKKKKKKKKKKKKKK.",
    "................",
    "................",
    "................",
    "................",
]


# 1.0: a bandeja. O sino das notificações e o cadeado (das redes protegidas e da tela de bloqueio).
SINO_16 = [
    "................",
    ".......KK.......",
    "......KYYK......",
    ".....KYWYYK.....",
    ".....KYWYYK.....",
    "....KYWYYYyK....",
    "....KYWYYYyK....",
    "....KYYYYYyK....",
    "...KYYYYYYYyK...",
    "...KYYYYYYYyK...",
    "..KYYYYYYYYYyK..",
    "..KyyyyyyyyyyK..",
    "..KKKKKKKKKKKK..",
    "......KyyK......",
    ".......KK.......",
    "................",
]

CADEADO_16 = [
    "................",
    "......KKKK......",
    ".....KLLLLK.....",
    "....KLK..KLK....",
    "....KLK..KLK....",
    "....KLK..KLK....",
    "...KKKKKKKKKK...",
    "...KYYYYYYYyK...",
    "...KYWYYYYYyK...",
    "...KYYYKKYYyK...",
    "...KYYYKKYYyK...",
    "...KYYYYKYYyK...",
    "...KYYYYYYYyK...",
    "...KyyyyyyyyK...",
    "...KKKKKKKKKK...",
    "................",
]

# O sol do brilho da tela: o disco e os oito raios.
SOL_16 = [
    "................",
    ".......y........",
    "..y....Y....y...",
    "...Y.......Y....",
    "......KKK.......",
    ".....KYYYK......",
    "....KYWYYyK.....",
    ".yY.KYYYYyK.Yy..",
    "....KYYYYyK.....",
    ".....KyyyK......",
    "......KKK.......",
    "...Y.......Y....",
    "..y....Y....y...",
    ".......y........",
    "................",
    "................",
]


def sinal(n):
    """As barras do sinal do Wi-Fi: n de 0 a 4 cheias (azuis); as outras, só o contorno cinza."""
    linhas = [['.'] * 16 for _ in range(16)]
    for i in range(4):
        x0, alto = 1 + i * 4, 4 + i * 3
        cheia = i < n
        for y in range(14 - alto, 14):
            for x in range(x0, x0 + 3):
                borda = y == 14 - alto or y == 13 or x in (x0, x0 + 2)
                if cheia:
                    linhas[y][x] = 'K' if borda else 'b'
                elif borda:
                    linhas[y][x] = 'G'
    return [''.join(l) for l in linhas]


# O raio da bateria carregando (por cima do corpo da bateria).
RAIO = [
    "........KKKK....",
    ".......KYYYK....",
    "......KYYYK.....",
    ".....KYYYKKKK...",
    "....KYYYYYYYK...",
    "....KKKKYYYK....",
    ".......KYYK.....",
    "......KYYK......",
    "......KYK.......",
    "......KK........",
]


def bateria(n, carga=False):
    """A bateria deitada: n de 0 a 4 quartos (0 é quase vazia, em vermelho); com carga, o raio."""
    linhas = [['.'] * 16 for _ in range(16)]
    for y in range(4, 12):
        for x in range(0, 14):
            borda = y in (4, 11) or x in (0, 13)
            linhas[y][x] = 'K' if borda else 'W'
    for y in range(6, 10):
        linhas[y][14] = 'K'
        linhas[y][15] = 'K' if y in (6, 9) else 'G'
    cor = 'R' if n == 0 else ('O' if n == 1 else 'V')
    cheio = 2 if n == 0 else round(12 * n / 4)
    for y in range(5, 11):
        for x in range(1, 1 + cheio):
            linhas[y][x] = cor if y < 9 else ('r' if n == 0 else ('y' if n == 1 else 'v'))
    if carga:
        for dy, l in enumerate(RAIO):
            for x, ch in enumerate(l):
                if ch != '.':
                    linhas[3 + dy][x] = ch
    return [''.join(l) for l in linhas]


def muro(tam):
    """O muro de tijolos do firewall (desenho próprio): os tijolos vermelhos desencontrados,
    a argamassa cinza e o contorno preto. Só a parte de baixo do quadro; o resto fica vazio."""
    if tam == 32:
        x0, x1, y0, tij, fiadas = 2, 29, 13, 8, ['A3', 'L', 'B3', 'L', 'A3', 'L', 'B3']
    else:
        x0, x1, y0, tij, fiadas = 1, 14, 7, 5, ['A2', 'L', 'B2', 'L', 'A1']
    linhas = [['.'] * tam for _ in range(tam)]
    y = y0 + 1
    for f in fiadas:
        if f == 'L':
            for x in range(x0 + 1, x1):
                linhas[y][x] = 'L'
            y += 1
            continue
        desvio = 0 if f[0] == 'A' else tij // 2
        altura = int(f[1])
        cores = {3: 'pRr', 2: 'Rr', 1: 'R'}[altura]
        for k in range(altura):
            for x in range(x0 + 1, x1):
                junta = (x - x0 - 1 + desvio) % tij == tij - 1
                linhas[y][x] = 'L' if junta else cores[k]
            y += 1
    for x in range(x0, x1 + 1):
        linhas[y0][x] = 'K'
        linhas[y][x] = 'K'
    for yy in range(y0, y + 1):
        linhas[yy][x0] = 'K'
        linhas[yy][x1] = 'K'
    return [''.join(l) for l in linhas]


def escudo(tam):
    """O escudo da Central de segurança (desenho próprio): azul, com a metade da direita mais
    escura, o brilho na borda de cima à esquerda e o contorno preto; o fundo reto e a ponta embaixo."""
    import math
    m = tam / 32
    x0, x1 = 5 * m, 27 * m      # as bordas dos lados
    y0, yr, y1 = 2 * m, 15 * m, 30 * m  # o alto, onde começa a curva e a ponta
    cx = tam / 2

    def dentro(x, y):
        x += 0.5
        y += 0.5
        if y < y0 or y > y1 or x < x0 or x > x1:
            return False
        if y <= yr:
            return True
        # Abaixo de yr, os lados descem em curva até a ponta.
        f = (y - yr) / (y1 - yr)
        meia = (x1 - x0) / 2 * math.cos(f * math.pi / 2) ** 0.8
        return abs(x - cx) <= meia

    linhas = [['.'] * tam for _ in range(tam)]
    for y in range(tam):
        for x in range(tam):
            if not dentro(x, y):
                continue
            borda = not all(dentro(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if borda:
                linhas[y][x] = 'K'
            elif x + 0.5 < cx:
                brilho = (y < y0 + 2 * m) or (x < x0 + 2 * m)
                linhas[y][x] = 'c' if brilho else 'b'
            else:
                linhas[y][x] = 'B'
    return [''.join(l) for l in linhas]


def microfone(tam):
    """O microfone de mesa: a cabeça com a grade, o suporte em U, a haste e a base (desenho próprio)."""
    k = 1 if tam == 16 else 2
    w = tam
    c = [['.'] * w for _ in range(w)]

    def ret(x0, y0, x1, y1, ch):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if 0 <= x < w and 0 <= y < w:
                    c[y][x] = ch

    meio = w // 2
    # A cabeça: uma cápsula com o contorno preto, a luz à esquerda, a sombra à direita e a grade.
    hx0, hx1 = meio - 3 * k, meio + 2 * k - 1 + (0 if k == 1 else 1)
    hy0, hy1 = k, 9 * k - 1
    for y in range(hy0, hy1 + 1):
        canto = 1 if y in (hy0, hy1) else 0
        for x in range(hx0 + canto, hx1 - canto + 1):
            borda = x in (hx0 + canto, hx1 - canto) or y in (hy0, hy1)
            if borda:
                c[y][x] = 'K'
            elif x == hx0 + 1:
                c[y][x] = 'W'
            elif x >= hx1 - k:
                c[y][x] = 'G'
            else:
                c[y][x] = 'D' if (y - hy0) % 2 == 0 and (x - hx0) % 2 == 0 else 'L'
    # O suporte em U em volta da metade de baixo da cabeça.
    ux0, ux1 = hx0 - k - 1, hx1 + k + 1
    uy0, uy1 = 5 * k, 10 * k
    ret(ux0, uy0, ux0, uy1 - 1, 'K')
    ret(ux1, uy0, ux1, uy1 - 1, 'K')
    if k == 2:
        ret(ux0 + 1, uy0, ux0 + 1, uy1 - 1, 'G')
        ret(ux1 - 1, uy0, ux1 - 1, uy1 - 1, 'D')
    ret(ux0 + 1, uy1, ux1 - 1, uy1, 'K')
    # A haste e a base.
    ret(meio - k, uy1 + 1, meio + k - 1, 13 * k - 1, 'G')
    ret(meio - k - 1, uy1 + 1, meio - k - 1, 13 * k - 1, 'K')
    ret(meio + k, uy1 + 1, meio + k, 13 * k - 1, 'K')
    if k == 2:
        ret(meio - k, uy1 + 1, meio - k, 13 * k - 1, 'L')
    by0 = 13 * k
    ret(meio - 4 * k + 1, by0, meio + 4 * k - 2, by0, 'K')
    ret(meio - 4 * k, by0 + 1, meio + 4 * k - 1, by0 + k, 'L')
    ret(meio - 4 * k, by0 + k, meio + 4 * k - 1, by0 + k, 'G')
    ret(meio - 4 * k - 1, by0 + 1, meio - 4 * k - 1, by0 + k, 'K')
    ret(meio + 4 * k, by0 + 1, meio + 4 * k, by0 + k, 'K')
    ret(meio - 4 * k, by0 + k + 1, meio + 4 * k - 1, by0 + k + 1, 'K')
    return [''.join(l) for l in c]


def pedra(tam, branca):
    """Uma pedra das damas vista de cima, com a lateral, o sulco e a borda em relevo (como no jogo)."""
    cores = ({'contorno': (0, 0, 0), 'luz': (255, 255, 255), 'base': (236, 228, 204), 'sombra': (180, 166, 132), 'sulco': (200, 188, 156), 'fundo': (124, 108, 76)}
             if branca else
             {'contorno': (0, 0, 0), 'luz': (122, 122, 122), 'base': (58, 58, 58), 'sombra': (32, 32, 32), 'sulco': (42, 42, 42), 'fundo': (16, 16, 16)})
    esp = max(2, round(tam / 10))
    r = (tam - esp) / 2 - 1
    cx, cy = tam / 2, r + 1
    face = lambda x, y: (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r
    toda = lambda x, y: any(face(x, y - e) for e in range(esp + 1))
    im = Image.new('RGBA', (tam, tam), (0, 0, 0, 0))
    for y in range(tam):
        for x in range(tam):
            if not toda(x, y):
                continue
            if not (toda(x - 1, y) and toda(x + 1, y) and toda(x, y - 1) and toda(x, y + 1)):
                cor = cores['contorno']
            elif not face(x, y):
                cor = cores['contorno'] if face(x, y - 1) else (cores['fundo'] if x + 0.5 - cx > r * 0.35 else cores['sombra'])
            else:
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                dist = (dx * dx + dy * dy) ** 0.5
                d = dist / r
                lado = (-dx - dy) / (dist or 1)
                cor = cores['base']
                if d > 0.76:
                    cor = cores['luz'] if lado > 0.35 else cores['sombra'] if lado < -0.35 else cores['base']
                elif d > 0.6:
                    cor = cores['sulco']
                elif d > 0.48:
                    cor = cores['sombra'] if lado > 0.2 else cores['luz'] if lado < -0.2 else cores['base']
            im.putpixel((x, y), cor + (255,))
    return im


def barra_tarefas(tam):
    """A Barra de tarefas e o menu Iniciar: a área de trabalho com uma janela e a barra embaixo."""
    k = tam // 16
    c = [['.'] * tam for _ in range(tam)]

    def ret(x0, y0, x1, y1, ch):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                c[y][x] = ch

    x0, x1 = k, tam - 1 - k
    y0, y1 = 2 * k, tam - 2 * k
    ret(x0, y0, x1, y1, 'K')
    ret(x0 + 1, y0 + 1, x1 - 1, y1 - 1, 'T')
    by0 = y1 - 4 * k  # a borda clara da barra
    # A janela na área de trabalho, com a barra de título azul.
    jx0, jy0, jx1, jy1 = x0 + 3 * k, y0 + 2 * k, x0 + 10 * k, by0 - 2 * k
    ret(jx0, jy0, jx1, jy1, 'K')
    ret(jx0 + 1, jy0 + 1, jx1 - 1, jy1 - 1, 'W')
    ret(jx0 + 1, jy0 + 1, jx1 - 1, jy0 + k, 'B')
    # A barra de tarefas: a borda clara, o botão Iniciar (com o logotipo) e os botões das janelas.
    ret(x0 + 1, by0, x1 - 1, y1 - 1, 'L')
    ret(x0 + 1, by0, x1 - 1, by0, 'W')
    t, b = by0 + k, y1 - k

    def botao(bx0, bx1):
        ret(bx0, t, bx1, b, 'L')
        ret(bx0, t, bx1, t, 'W')
        ret(bx0, t, bx0, b, 'W')
        ret(bx1, t, bx1, b, 'D')
        ret(bx0, b, bx1, b, 'D')

    botao(x0 + k, x0 + 5 * k)
    # No botão Iniciar, o disquete azul do próprio Retro Computer (o logotipo do botão de verdade).
    meio = (t + b) // 2
    if k > 1:
        ret(x0 + 3, meio - 1, x0 + 5, meio + 1, 'B')
        ret(x0 + 4, meio - 1, x0 + 4, meio - 1, 'L')
        ret(x0 + 4, meio + 1, x0 + 4, meio + 1, 'W')
    else:
        ret(x0 + 2, meio, x0 + 3, meio, 'B')
    botao(x0 + 6 * k, x0 + 10 * k)
    if k > 1:
        botao(x0 + 11 * k, x1 - k)
    return [''.join(l) for l in c]


def dos(tam):
    """O DOS: uma janela preta com o prompt "C:\\>" e o cursor, em pontos."""
    c = [['.'] * tam for _ in range(tam)]

    def ret(x0, y0, x1, y1, ch):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                c[y][x] = ch

    if tam >= 32:
        ret(1, 3, 30, 28, 'K')
        ret(2, 4, 29, 7, 'B')
        ret(26, 5, 28, 6, 'L')
        ret(2, 8, 29, 27, 'K')
        letras = {
            'C': ['.LL', 'L..', 'L..', 'L..', '.LL'],
            ':': ['.', 'L', '.', 'L', '.'],
            '\\': ['L..', 'L..', '.L.', '..L', '..L'],
            '>': ['L..', '.L.', '..L', '.L.', 'L..'],
        }
        x = 4
        for ch in 'C:\\>':
            for j, linha in enumerate(letras[ch]):
                for i, p in enumerate(linha):
                    if p == 'L':
                        c[11 + j][x + i] = 'L'
            x += len(letras[ch][0]) + 1
        ret(x, 15, x + 2, 15, 'W')  # o cursor
        ret(4, 19, 6, 19, 'G')  # as linhas de antes, mais apagadas
        ret(8, 19, 15, 19, 'G')
        ret(4, 22, 12, 22, 'G')
    else:
        ret(0, 1, 15, 14, 'K')
        ret(1, 2, 14, 3, 'B')
        ret(1, 4, 14, 13, 'K')
        for i, linha in enumerate(['L..', '.L.', '..L', '.L.', 'L..']):
            for k, p in enumerate(linha):
                if p == 'L':
                    c[6 + i][3 + k] = 'L'
        ret(7, 10, 9, 10, 'W')
    return [''.join(l) for l in c]


def pessoa(tam):
    """O usuário (os perfis): a cabeça e os ombros, no verde e com a luz do ícone de usuários do SerenityOS."""
    if tam >= 32:
        cab = (16, 9.5, 6.2)  # o centro e o raio da cabeça
        ombro = (16, 29, 12.5, 10.5)  # o centro e os raios dos ombros (uma elipse cortada embaixo)
        fim = tam - 3
    else:
        # No pequeno, a cabeça maior, para ler de longe.
        cab = (8, 4.9, 3.75)
        ombro = (8, 15.2, 6.9, 6)
        fim = tam - 2

    def na_cabeca(x, y):
        return (x + 0.5 - cab[0]) ** 2 + (y + 0.5 - cab[1]) ** 2 <= cab[2] ** 2

    def nos_ombros(x, y):
        if y > fim:
            return False
        return ((x + 0.5 - ombro[0]) / ombro[2]) ** 2 + ((y + 0.5 - ombro[1]) / ombro[3]) ** 2 <= 1

    def parte(x, y):
        if not (0 <= x < tam and 0 <= y < tam):
            return 0
        return 1 if na_cabeca(x, y) else 2 if nos_ombros(x, y) else 0

    rampa = [(206, 240, 98), (170, 214, 36), (124, 180, 14), (76, 140, 0), (44, 96, 0)]
    im = Image.new('RGBA', (tam, tam), (0, 0, 0, 0))
    for y in range(tam):
        for x in range(tam):
            q = parte(x, y)
            if not q:
                continue
            vizinhos = [parte(x - 1, y), parte(x + 1, y), parte(x, y - 1), parte(x, y + 1)]
            # O contorno preto em volta de cada parte (o pescoço fica separado da cabeça, como no SerenityOS).
            if any(v != q for v in vizinhos):
                im.putpixel((x, y), (0, 0, 0, 255))
                continue
            if q == 1:
                dx, dy, r = x + 0.5 - cab[0], y + 0.5 - cab[1], cab[2]
            else:
                dx, dy, r = (x + 0.5 - ombro[0]) * 0.8, y + 0.5 - (ombro[1] - ombro[3] * 0.55), ombro[2]
            # A luz do alto à esquerda: mais clara perto do brilho, mais escura do outro lado.
            luz = ((dx + r * 0.45) ** 2 + (dy + r * 0.45) ** 2) ** 0.5 / (r * 1.6)
            i = max(0, min(len(rampa) - 1, int(luz * len(rampa))))
            im.putpixel((x, y), rampa[i] + (255,))
    return im


def damas(tam):
    """As Damas: a pedra preta atrás, à direita, e a branca na frente."""
    im = Image.new('RGBA', (tam, tam), (0, 0, 0, 0))
    lado = round(tam * 0.72) if tam >= 32 else 13
    preta = pedra(lado, False)
    branca = pedra(lado, True)
    im.alpha_composite(preta, (tam - lado, 0))
    im.alpha_composite(branca, (0, tam - lado))
    return im


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

    # Desenhos próprios da 0.3.0: o Breakout e o pendrive (disco removível).
    feitos[32]['breakout'] = grade(BREAKOUT_32)
    feitos[16]['breakout'] = grade(BREAKOUT_16)
    feitos[32]['removivel'] = grade(PENDRIVE_32)
    feitos[16]['removivel'] = grade(PENDRIVE_16)

    # A bandeja (1.0): o volume e a rede do SerenityOS; o sino, o cadeado, o sol, o sinal e a bateria, próprios.
    for nome, n16 in (('som-alto', 'audio-volume-high'), ('som-medio', 'audio-volume-medium'), ('som-baixo', 'audio-volume-low'),
                      ('som-zero', 'audio-volume-zero'), ('som-mudo', 'audio-volume-muted'),
                      ('rede-ligada', 'network-connected'), ('rede-desligada', 'network-disconnected')):
        feitos[16][nome] = abrir_serenity(serenity, 16, n16)
    feitos[16]['sino'] = grade(SINO_16)
    feitos[16]['cadeado'] = grade(CADEADO_16)
    feitos[16]['brilho'] = grade(SOL_16)
    for n in range(5):
        feitos[16][f'sinal-{n}'] = grade(sinal(n))
        feitos[16][f'bateria-{n}'] = grade(bateria(n))
        feitos[16][f'bateria-carga-{n}'] = grade(bateria(n, True))

    # 1.0: o Reprodutor de mídia é o filme com o botão de tocar (a claquete fica com o FilmCraft),
    # e o LightCraft (as fotos) passa a ser a foto com o sol, já que a câmera é da Captura de tela.
    feitos[32]['reprodutor'] = colar(abrir_serenity(serenity, 32, 'filetype-video'), abrir_serenity(serenity, 16, 'play'), 16, 15)
    feitos[16]['reprodutor'] = colar(abrir_serenity(serenity, 16, 'filetype-video'), abrir_serenity(serenity, 16, 'play').crop((2, 1, 14, 15)).resize((8, 9), Image.NEAREST), 8, 7)
    feitos[32]['lightcraft'] = colar(abrir_serenity(serenity, 32, 'app-image-viewer'), grade(SOL_16), 16, 15)
    feitos[16]['lightcraft'] = colar(abrir_serenity(serenity, 16, 'app-image-viewer'), grade(SOL_16).resize((9, 9), Image.NEAREST), 7, 7)

    # As atualizações do Linux: o computador com as setas verdes (SerenityOS); em 16, o disco com a seta.
    feitos[32]['atualizacoes'] = colar(grade(COMPUTADOR_32), abrir_serenity(serenity, 16, 'reload'), 16, 16)
    feitos[16]['atualizacoes'] = abrir_serenity(serenity, 16, 'download')
    feitos[32]['impressora'] = grade(IMPRESSORA_32)
    feitos[16]['impressora'] = grade(IMPRESSORA_16)
    feitos[16]['bluetooth'] = grade(BLUETOOTH_16)
    feitos[32]['bluetooth'] = grade(BLUETOOTH_16).resize((32, 32), Image.NEAREST)

    # 1.0: o firewall é o muro de tijolos na frente do globo (o globo é o do SerenityOS);
    # a área de transferência é a prancheta do SerenityOS.
    globo16 = abrir_serenity(serenity, 16, 'internet')
    feitos[32]['firewall'] = colar(colar(Image.new('RGBA', (32, 32), (0, 0, 0, 0)), globo16, 8, 2), grade(muro(32)), 0, 0)
    feitos[16]['firewall'] = colar(colar(Image.new('RGBA', (16, 16), (0, 0, 0, 0)), globo16.resize((10, 10), Image.NEAREST), 3, 1), grade(muro(16)), 0, 0)
    feitos[16]['transferencia'] = abrir_serenity(serenity, 16, 'paste')
    # A cópia de segurança: o disco rígido com as setas verdes da atualização (SerenityOS).
    feitos[32]['copia'] = colar(abrir_serenity(serenity, 32, 'hard-disk'), abrir_serenity(serenity, 16, 'reload'), 16, 16)
    feitos[16]['copia'] = colar(abrir_serenity(serenity, 16, 'hard-disk'), abrir_serenity(serenity, 16, 'reload').resize((9, 9), Image.NEAREST), 7, 7)
    # A Central de segurança: o escudo com o cadeado da bandeja (desenhos próprios).
    feitos[32]['seguranca'] = colar(grade(escudo(32)), grade(CADEADO_16), 8, 7)
    feitos[16]['seguranca'] = grade(escudo(16))

    # As Opções de energia: a bateria carregando da bandeja, ampliada no 32.
    feitos[16]['energia'] = grade(bateria(4, True))
    feitos[32]['energia'] = grade(bateria(4, True)).resize((32, 32), Image.NEAREST)
    # O microfone (a gravação nas Propriedades de Sons): desenho próprio.
    feitos[32]['microfone'] = grade(microfone(32))
    feitos[16]['microfone'] = grade(microfone(16))

    # A Barra de tarefas e o menu Iniciar (Painel de controle): desenho próprio.
    feitos[32]['barra-tarefas'] = grade(barra_tarefas(32))
    feitos[16]['barra-tarefas'] = grade(barra_tarefas(16))

    # O DOS (o DOSBox do js-dos): desenho próprio.
    feitos[32]['dos'] = grade(dos(32))
    feitos[16]['dos'] = grade(dos(16))

    # As Damas: duas pedras, desenhadas como as do jogo (src/sistema/js/jogos/pecas.js).
    feitos[32]['damas'] = damas(32)
    feitos[16]['damas'] = damas(16)

    # Os perfis: o usuário (desenho próprio) e o Painel › Usuários (o ícone de usuários do SerenityOS).
    feitos[32]['usuario'] = pessoa(32)
    feitos[16]['usuario'] = pessoa(16)

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
