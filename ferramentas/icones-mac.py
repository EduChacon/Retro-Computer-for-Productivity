#!/usr/bin/env python3
"""Desenha os ícones do tema Mac clássico em src/sistema/icones-mac/{16,32}/.

Todos são desenhos próprios do projeto, feitos aqui ponto a ponto, no espírito dos ícones do Mac
OS 9 (o contorno preto, a luz no alto e à esquerda, a sombra embaixo e à direita, as pastas lavanda,
as folhas com o canto dobrado), sem copiar nenhum ícone da Apple. O ícone que falta aqui fica o do
tema do PC (tema.js). A lista dos que existem vai para src/sistema/js/icones-mac.js.

Uso: python3 -I ferramentas/icones-mac.py [--folha SAIDA.png]
"""
import os
import sys

from PIL import Image, ImageDraw

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(RAIZ, 'src', 'sistema', 'icones-mac')
LISTA = os.path.join(RAIZ, 'src', 'sistema', 'js', 'icones-mac.js')


def cor(h):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


# A paleta (própria): o preto do contorno, os cinzas do "Platinum", o lavanda das pastas e as cores de destaque.
K = cor('000000')
BR = cor('ffffff')
C1, C2, C3, C4, C5, C6, C7, C8 = (cor(x) for x in ('eeeeee', 'dddddd', 'cccccc', 'bbbbbb', '999999', '777777', '555555', '333333'))
# As pastas: do lavanda mais claro ao mais fundo.
P1, P2, P3, P4, P5, P6 = (cor(x) for x in ('e6e6ff', 'c8c8ff', 'a8a8f4', '8c8ce4', '6a6ac8', '4c4ca4'))
# O papel das folhas: branco, com a sombra cinza-clara.
PAPEL, PAPEL2, PAPEL3 = BR, cor('f0f0f0'), cor('d8d8d8')
VERM, VERM2, VERM3 = cor('ee3333'), cor('bb1111'), cor('ff8888')
AMAR, AMAR2, AMAR3 = cor('ffdd33'), cor('cc9900'), cor('fff2a0')
VERD, VERD2, VERD3 = cor('33bb33'), cor('117711'), cor('99ee99')
AZUL, AZUL2, AZUL3 = cor('3377dd'), cor('1144aa'), cor('99ccff')
CIANO, CIANO2 = cor('33bbcc'), cor('117788')
LARANJA, LARANJA2 = cor('ff9922'), cor('cc6600')
ROXO, ROXO2 = cor('9955cc'), cor('662299')
MARROM, MARROM2, MARROM3 = cor('aa7744'), cor('774411'), cor('ddaa77')


class Tela:
    """Uma tela de tam × tam pontos, com as ferramentas de desenho."""

    def __init__(self, tam):
        self.tam = tam
        self.im = Image.new('RGBA', (tam, tam), (0, 0, 0, 0))
        self.px = self.im.load()

    def ponto(self, x, y, c):
        if 0 <= x < self.tam and 0 <= y < self.tam and c is not None:
            self.px[x, y] = c

    def pega(self, x, y):
        if 0 <= x < self.tam and 0 <= y < self.tam:
            return self.px[x, y]
        return (0, 0, 0, 0)

    def ret(self, x0, y0, x1, y1, c):
        """O retângulo cheio de x0,y0 até x1,y1 (os dois incluídos)."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.ponto(x, y, c)

    def hlinha(self, x0, x1, y, c):
        self.ret(min(x0, x1), y, max(x0, x1), y, c)

    def vlinha(self, x, y0, y1, c):
        self.ret(x, min(y0, y1), x, max(y0, y1), c)

    def linha(self, x0, y0, x1, y1, c):
        """A linha de Bresenham."""
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        e = dx + dy
        while True:
            self.ponto(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * e
            if e2 >= dy:
                e += dy
                x0 += sx
            if e2 <= dx:
                e += dx
                y0 += sy

    def poligono(self, pts, c):
        """O polígono cheio (os pontos dos cantos, em ordem), pelo centro de cada ponto."""
        ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            cy = y + 0.5
            xs = []
            for i in range(len(pts)):
                (xa, ya), (xb, yb) = pts[i], pts[(i + 1) % len(pts)]
                if (ya <= cy < yb) or (yb <= cy < ya):
                    xs.append(xa + (cy - ya) * (xb - xa) / (yb - ya))
            xs.sort()
            for k in range(0, len(xs) - 1, 2):
                for x in range(int(round(xs[k])), int(round(xs[k + 1]))):
                    self.ponto(x, y, c)

    def elipse(self, cx, cy, rx, ry, c):
        """A elipse cheia, com o centro em cx,cy (em meios pontos, para centrar em número par)."""
        for y in range(self.tam):
            for x in range(self.tam):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1.0:
                    self.ponto(x, y, c)

    def dentro(self, x, y):
        return self.pega(x, y)[3] > 0

    def contorno(self, c=K, so=None):
        """Pinta de c a borda de dentro da figura (o ponto aceso com um vizinho apagado)."""
        borda = []
        for y in range(self.tam):
            for x in range(self.tam):
                if self.dentro(x, y) and (so is None or so(x, y)):
                    if not all(self.dentro(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                        borda.append((x, y))
        for x, y in borda:
            self.ponto(x, y, c)

    def relevo(self, x0, y0, x1, y1, luz, sombra):
        """A luz no alto e à esquerda, a sombra embaixo e à direita, por dentro do retângulo."""
        self.hlinha(x0, x1 - 1, y0, luz)
        self.vlinha(x0, y0, y1 - 1, luz)
        self.hlinha(x0 + 1, x1, y1, sombra)
        self.vlinha(x1, y0 + 1, y1, sombra)

    def colar(self, outra, x, y):
        self.im.alpha_composite(outra.im if isinstance(outra, Tela) else outra, (x, y))
        self.px = self.im.load()

    def grade(self, x, y, linhas, cores):
        """Um desenho pequeno em letras (cada letra uma cor de cores; '.' é vazio)."""
        for j, l in enumerate(linhas):
            for i, ch in enumerate(l):
                if ch != '.' and ch in cores:
                    self.ponto(x + i, y + j, cores[ch])


# ---------- As pastas ----------

def pasta(t, aberta=False):
    """A pasta lavanda: a aba no alto, à esquerda, o fundo mais escuro aparecendo em cima e a frente
    clara, com a luz em cima e à esquerda e a sombra embaixo e à direita (aberta: a frente caída)."""
    s = Tela(t)
    if t == 32:
        # O fundo, com a aba de cantos chanfrados.
        s.poligono([(1, 9), (3, 6), (12, 6), (14, 9), (30, 9), (30, 28), (1, 28)], P4)
        s.contorno()
        s.hlinha(3, 11, 7, P2)          # a luz da aba
        s.hlinha(2, 12, 8, P3)
        s.hlinha(2, 28, 10, P5)         # o fundo por dentro, mais escuro (até o contorno, sem cobri-lo)
        s.hlinha(2, 28, 11, P5)
        if aberta:
            # A frente caída: um trapézio mais largo embaixo, com a boca aberta em cima.
            s.ret(2, 10, 29, 12, P6)
            frente = Tela(32)
            frente.poligono([(0, 14), (32, 14), (30, 29), (2, 29)], P3)
            frente.contorno()
            frente.hlinha(1, 30, 15, P1)
            frente.hlinha(2, 29, 16, P2)
            frente.hlinha(3, 28, 27, P5)
            for y in range(17, 28):
                frente.ponto(int(round(30 - (y - 14) * 2 / 15)) - 1, y, P4)
            s.colar(frente, 0, 0)
        else:
            frente = Tela(32)
            frente.ret(1, 12, 30, 28, P3)
            frente.contorno()
            frente.hlinha(1, 30, 12, P6)      # a borda da frente
            frente.hlinha(2, 29, 13, P1)      # a luz logo abaixo dela
            frente.vlinha(2, 13, 26, P2)
            frente.hlinha(3, 29, 27, P5)
            frente.vlinha(29, 14, 27, P4)
            frente.hlinha(2, 28, 27, P5)
            s.colar(frente, 0, 0)
    else:
        s.poligono([(0, 4), (1, 2), (6, 2), (7, 4), (15, 4), (15, 14), (0, 14)], P4)
        s.contorno()
        s.hlinha(2, 5, 3, P2)
        s.hlinha(1, 13, 5, P5)
        frente = Tela(16)
        if aberta:
            frente.poligono([(0, 7), (16, 7), (15, 15), (1, 15)], P3)
            frente.contorno()
            frente.hlinha(1, 14, 8, P1)
            frente.hlinha(2, 13, 13, P5)
        else:
            frente.ret(0, 6, 15, 14, P3)
            frente.contorno()
            frente.hlinha(0, 15, 6, P6)
            frente.hlinha(1, 14, 7, P1)
            frente.vlinha(1, 7, 12, P2)
            frente.hlinha(2, 14, 13, P5)
            frente.vlinha(14, 8, 13, P4)
        s.colar(frente, 0, 0)
    return s


def emblema_pasta(t, desenho32, desenho16):
    """A pasta com um emblema gravado na frente (como as pastas especiais do Mac da época)."""
    s = pasta(t)
    if t == 32:
        desenho32(s, 15, 19)
    else:
        desenho16(s, 7, 10)
    return s


def gravado(s, x, y, linhas):
    """O emblema em baixo-relevo na frente da pasta: o traço escuro com a luz embaixo à direita."""
    for j, l in enumerate(linhas):
        for i, ch in enumerate(l):
            if ch == '#':
                s.ponto(x + i + 1, y + j + 1, P1)
    for j, l in enumerate(linhas):
        for i, ch in enumerate(l):
            if ch == '#':
                s.ponto(x + i, y + j, P6)


def centro_gravado(s, cx, cy, linhas):
    w = max(len(l) for l in linhas)
    gravado(s, cx - w // 2, cy - len(linhas) // 2, linhas)


EMBLEMAS = {
    # A Área de trabalho: um monitor.
    # As Configurações do Iniciar: a mesma pasta do Painel de controle.
    'pasta-mesa': (['#########', '#.......#', '#.......#', '#.......#', '#.......#', '#########', '...###...', '.#######.'],
                   ['#####', '#...#', '#####', '.###.']),
    # Imagens: o quadro com a montanha e o sol.
    'pasta-imagens': (['##########', '#........#', '#.....##.#', '#..#..##.#', '#.###....#', '#######..#', '##########'],
                      ['#####', '#.#.#', '#####']),
    # Músicas: a nota.
    'pasta-musicas': (['.....##', '...####', '..##..#', '..#...#', '..#...#', '###..##', '###.###', '....###'],
                      ['..##', '.#.#', '##.#', '##..']),
    # Vídeos: a fita de filme.
    'pasta-videos': (['##########', '#.#.#.#.##', '##########', '#........#', '#........#', '##########', '#.#.#.#.##', '##########'],
                     ['#####', '#...#', '#####']),
    # Programas: a janelinha.
    'pasta-programas': (['##########', '##########', '#........#', '#........#', '#........#', '##########'],
                        ['#####', '#...#', '#####']),
    # Recebidos: a seta para baixo, na bandeja.
    'pasta-recebidos': (['...###...', '...###...', '...###...', '.#######.', '..#####..', '...###...', '#...#...#', '#########'],
                        ['.#.', '###', '#.#', '###']),
    # Capturas: a câmera.
    'pasta-capturas': (['...###....', '##########', '#...##...#', '#..#..#..#', '#..#..#..#', '#...##...#', '##########'],
                       ['.##..', '#####', '#.#.#', '#####']),
    # Diário: o calendário.
    'pasta-diario': (['.#.....#.', '#########', '#.......#', '#.#.#.#.#', '#.......#', '#.#.#.#.#', '#########'],
                     ['#.#.#', '#####', '#.#.#', '#####']),
    # DOS: o prompt.
    'pasta-dos': (['##########', '#........#', '#.#......#', '#..#.....#', '#.#..###.#', '#........#', '##########'],
                  ['#####', '#.#.#', '#####']),
    # Painel de controle: os controles deslizantes.
    'painel': (['..#.....#..', '..#.....#..', '#####...#..', '#####...#..', '..#...#####', '..#...#####', '..#.....#..', '..#.....#..'],
               ['.#..#.', '###.#.', '.#.###', '.#..#.']),
}


def pasta_especial(nome):
    l32, l16 = EMBLEMAS[nome]

    def faz(t):
        s = pasta(t)
        if t == 32:
            centro_gravado(s, 16, 20, l32)
        else:
            centro_gravado(s, 8, 10, l16)
        return s
    return faz


def documentos(t):
    """Meus documentos: a pasta com uma folha saindo dela."""
    s = Tela(t)
    if t == 32:
        f = folha(20, linhas=True)
        s.colar(pasta(32), 0, 0)
        s.colar(f, 9, 2)
        # A frente da pasta por cima da folha.
        p = pasta(32)
        frente = Tela(32)
        for y in range(11, 29):
            for x in range(32):
                frente.ponto(x, y, p.pega(x, y))
        s.colar(frente, 0, 0)
    else:
        s.colar(pasta(16), 0, 0)
        f = Tela(16)
        f.ret(5, 1, 12, 8, PAPEL)
        f.contorno()
        f.hlinha(7, 10, 3, C5)
        f.hlinha(7, 10, 5, C5)
        s.colar(f, 0, 0)
        p = pasta(16)
        frente = Tela(16)
        for y in range(6, 15):
            for x in range(16):
                frente.ponto(x, y, p.pega(x, y))
        s.colar(frente, 0, 0)
    return s


# ---------- As folhas (os documentos) ----------

def folha(alt=28, linhas=False):
    """A folha branca com o canto de cima, à direita, dobrado (32 pontos de altura no máximo)."""
    w = round(alt * 0.78)
    s = Tela(32)
    d = max(4, alt // 4)  # o tamanho da dobra
    s.poligono([(0, 0), (w - d, 0), (w, d), (w, alt), (0, alt)], PAPEL)
    s.contorno()
    # A dobra: o triângulo cinza com a linha da dobra.
    for i in range(1, d):
        s.hlinha(w - d, w - d + i - 1, i, C2)
    s.vlinha(w - d, 0, d, K)
    s.hlinha(w - d, w - 1, d, K)
    s.linha(w - d, 0, w, d, K)
    for i in range(2, d):
        s.ponto(w - d + i - 1, i, C3)
    # A sombra da folha (dentro, embaixo e à direita: o contorno fica na última coluna e na última linha).
    s.hlinha(1, w - 2, alt - 2, PAPEL3)
    s.vlinha(w - 2, d + 1, alt - 2, PAPEL3)
    if linhas:
        for y in range(d + 4, alt - 3, 3):
            s.hlinha(3, w - 4 - (3 if y % 2 else 0), y, C5)
    return s


# A folha de 16 pontos: a dobra no canto, o contorno inteiro e a sombra por dentro, embaixo e à direita.
FOLHA_16 = [
    "..KKKKKKKKK.....",
    "..KWWWWWWWKK....",
    "..KWWWWWWWKcK...",
    "..KWWWWWWWKKK...",
    "..KWWWWWWWWsK...",
    "..KWWWWWWWWsK...",
    "..KWWWWWWWWsK...",
    "..KWWWWWWWWsK...",
    "..KWWWWWWWWsK...",
    "..KWWWWWWWWsK...",
    "..KWWWWWWWWsK...",
    "..KWWWWWWWWsK...",
    "..KWWWWWWWWsK...",
    "..KsssssssssK...",
    "..KKKKKKKKKKK...",
    "................",
]


def doc(t, emblema=None, linhas=False, faixa=None):
    """O documento: a folha com o emblema do tipo (ou as linhas de texto), centrado no ícone."""
    s = Tela(t)
    if t == 32:
        f = folha(29, linhas=linhas)
        s.colar(f, 5, 1)
        if faixa:
            # A faixa colorida embaixo, com o nome do tipo (o PDF, a planilha…).
            s.ret(7, 23, 25, 27, faixa[0])
            s.hlinha(7, 25, 22, K)
            s.hlinha(7, 25, 28, faixa[1])
        if emblema:
            emblema(s, 32)
    else:
        s.grade(0, 0, FOLHA_16, {'K': K, 'W': PAPEL, 'c': C2, 's': PAPEL3})
        if linhas:
            for y in (5, 7, 9, 11):
                s.hlinha(4, 10 if y != 11 else 8, y, C5)
        if faixa:
            s.ret(3, 11, 11, 13, faixa[0])
            s.hlinha(3, 11, 10, K)
        if emblema:
            emblema(s, 16)
    return s


def letras(s, x, y, texto, c):
    """O nome do tipo em letras de 3 × 5 (desenho próprio)."""
    F = {
        'P': ['##.', '#.#', '##.', '#..', '#..'], 'D': ['##.', '#.#', '#.#', '#.#', '##.'], 'F': ['###', '#..', '##.', '#..', '#..'],
        'J': ['..#', '..#', '..#', '#.#', '.#.'], 'S': ['.##', '#..', '.#.', '..#', '##.'], 'O': ['.#.', '#.#', '#.#', '#.#', '.#.'],
        'N': ['#.#', '###', '###', '#.#', '#.#'], 'Y': ['#.#', '#.#', '.#.', '.#.', '.#.'], 'H': ['#.#', '#.#', '###', '#.#', '#.#'],
        'T': ['###', '.#.', '.#.', '.#.', '.#.'], 'M': ['#.#', '###', '###', '#.#', '#.#'], 'L': ['#..', '#..', '#..', '#..', '###'],
        'Z': ['###', '..#', '.#.', '#..', '###'], 'I': ['###', '.#.', '.#.', '.#.', '###'], 'X': ['#.#', '#.#', '.#.', '#.#', '#.#'],
        'C': ['.##', '#..', '#..', '#..', '.##'], 'V': ['#.#', '#.#', '#.#', '#.#', '.#.'], 'A': ['.#.', '#.#', '###', '#.#', '#.#'],
        'E': ['###', '#..', '##.', '#..', '###'], 'R': ['##.', '#.#', '##.', '#.#', '#.#'], 'B': ['##.', '#.#', '##.', '#.#', '##.'],
        'G': ['.##', '#..', '#.#', '#.#', '.##'], 'K': ['#.#', '#.#', '##.', '#.#', '#.#'], 'U': ['#.#', '#.#', '#.#', '#.#', '###'],
        '{': ['.##', '.#.', '#..', '.#.', '.##'], '}': ['##.', '.#.', '..#', '.#.', '##.'], '>': ['#..', '.#.', '..#', '.#.', '#..'],
        '_': ['...', '...', '...', '...', '###'], '#': ['#.#', '###', '#.#', '###', '#.#'],
    }
    for ch in texto:
        if ch == ' ':
            x += 2
            continue
        s.grade(x, y, F[ch], {'#': c})
        x += 4
    return x


def larg_letras(texto):
    return sum(2 if ch == ' ' else 4 for ch in texto) - 1


# Os emblemas dos tipos de arquivo (no 32 e no 16).

def em_imagem(s, t):
    if t == 32:
        s.ret(8, 9, 24, 21, AZUL3)
        s.ret(8, 17, 24, 21, VERD)
        s.poligono([(8, 21), (13, 14), (18, 21)], VERD2)
        s.poligono([(14, 21), (19, 15), (25, 21)], VERD)
        s.elipse(20.5, 11.5, 2, 2, AMAR)
        s.relevo(7, 8, 25, 22, K, K)
        s.hlinha(7, 25, 8, K)
        s.vlinha(7, 8, 22, K)
    else:
        s.ret(4, 5, 11, 11, AZUL3)
        s.ret(4, 9, 11, 11, VERD)
        s.ponto(9, 6, AMAR)
        s.hlinha(3, 12, 4, K)
        s.hlinha(3, 12, 12, K)
        s.vlinha(3, 4, 12, K)
        s.vlinha(12, 4, 12, K)


def em_som(s, t):
    if t == 32:
        s.grade(10, 8, ['......####', '....######', '...###..##', '...#....##', '...#....##', '...#....##', '...#....##',
                        '...#..####', '...#.#####', '####.#####', '#####.###.', '#####.....', '.###......'], {'#': ROXO2})
    else:
        s.grade(5, 5, ['..###', '..#.#', '..#.#', '###.#', '###..'], {'#': ROXO2})


def em_video(s, t):
    if t == 32:
        s.ret(8, 9, 24, 21, C8)
        for x in range(9, 24, 3):
            s.ret(x, 10, x + 1, 11, BR)
            s.ret(x, 19, x + 1, 20, BR)
        s.ret(9, 13, 23, 17, AZUL3)
        s.poligono([(14, 13), (19, 15), (14, 18)], AZUL2)
    else:
        s.ret(4, 5, 11, 11, C8)
        s.ret(5, 7, 10, 9, AZUL3)
        for x in (5, 7, 9):
            s.ponto(x, 6, BR)
            s.ponto(x, 10, BR)


def em_compactado(s, t):
    if t == 32:
        # O zíper no meio da folha.
        for y in range(6, 26, 2):
            s.ret(14, y, 15, y, C7)
            s.ret(16, y + 1, 17, y + 1, C7)
        s.ret(13, 20, 18, 25, C6)
        s.ret(14, 21, 17, 24, C3)
    else:
        for y in range(3, 12, 2):
            s.ponto(7, y, C7)
            s.ponto(8, y + 1, C7)
        s.ret(6, 11, 9, 13, C6)


def em_html(s, t):
    globo(s, t, 16 if t == 32 else 7.5, 16 if t == 32 else 9, 7 if t == 32 else 3.5)


def em_texto_tipo(texto, frente, fundo):
    def f(s, t):
        if t == 32:
            w = larg_letras(texto)
            letras(s, 16 - w // 2, 23, texto, frente)
        else:
            pass
    return f


def em_planilha(s, t):
    if t == 32:
        s.ret(8, 8, 24, 21, BR)
        for y in range(8, 22, 3):
            s.hlinha(8, 24, y, C5)
        for x in (8, 13, 18, 24):
            s.vlinha(x, 8, 21, C5)
        s.ret(9, 9, 12, 10, VERD3)
        s.ret(14, 12, 17, 13, VERD3)
    else:
        for y in (5, 7, 9, 11):
            s.hlinha(4, 11, y, C5)
        for x in (4, 7, 11):
            s.vlinha(x, 5, 11, C5)


def em_apresentacao(s, t):
    if t == 32:
        s.ret(8, 9, 24, 19, AZUL3)
        s.relevo(8, 9, 24, 19, BR, AZUL)
        s.ret(10, 15, 12, 18, LARANJA)
        s.ret(14, 13, 16, 18, VERD)
        s.ret(18, 11, 20, 18, VERM)
        s.vlinha(16, 20, 22, C7)
        s.hlinha(13, 19, 22, C7)
    else:
        s.ret(4, 5, 11, 10, AZUL3)
        s.ret(5, 8, 5, 9, VERM)
        s.ret(7, 7, 7, 9, VERD)
        s.ret(9, 6, 9, 9, LARANJA)


def em_codigo(s, t):
    if t == 32:
        letras(s, 9, 11, '{', AZUL2)
        letras(s, 20, 11, '}', AZUL2)
        for y in (11, 13, 15):
            s.hlinha(13, 18, y, C6)
    else:
        s.grade(4, 6, ['.#..#.', '#....#', '.#..#.'], {'#': AZUL2})


def em_shell(s, t):
    if t == 32:
        s.ret(8, 9, 24, 21, C8)
        letras(s, 10, 12, '>', VERD3)
        s.hlinha(15, 19, 16, VERD3)
    else:
        s.ret(4, 5, 11, 11, C8)
        s.grade(5, 6, ['#..', '.#.', '#.#'], {'#': VERD3})


def em_fonte(s, t):
    if t == 32:
        s.grade(9, 8, ['....##....', '....##....', '...####...', '...#.##...', '..##..##..', '..##..##..', '.########.', '.##....##.', '##......##', '##......##'], {'#': K})
    else:
        s.grade(5, 5, ['.##.', '#..#', '####', '#..#', '#..#'], {'#': K})


def em_calendario(s, t):
    if t == 32:
        s.ret(8, 8, 24, 21, BR)
        s.ret(8, 8, 24, 11, VERM)
        s.relevo(8, 8, 24, 21, K, K)
        s.hlinha(8, 24, 8, K)
        s.vlinha(8, 8, 21, K)
        for y in (14, 17):
            for x in range(10, 23, 3):
                s.ret(x, y, x + 1, y + 1, C5)
    else:
        s.ret(4, 5, 11, 11, BR)
        s.hlinha(4, 11, 5, VERM)
        s.hlinha(4, 11, 6, VERM)
        for x in (5, 7, 9):
            s.ponto(x, 8, C5)
            s.ponto(x, 10, C5)


def em_markdown(s, t):
    if t == 32:
        s.ret(8, 11, 24, 20, BR)
        s.hlinha(9, 23, 10, K)
        s.hlinha(9, 23, 21, K)
        s.vlinha(7, 11, 20, K)
        s.vlinha(25, 11, 20, K)
        s.grade(10, 13, ['#...#..##..', '##.##..##..', '#.#.#..##..', '#...#.####.', '#...#..##..', '.......#...'], {'#': K})
    else:
        s.grade(3, 6, ['#.#..#.', '###..#.', '#.#.###', '#.#..#.'], {'#': K})


def em_executavel(s, t):
    if t == 32:
        programa_desenho(s, 32, ox=4, oy=6, k=0.75)


# A terra do mundo, de 2 em 2 graus (180 pontos por linha, do polo norte ao sul, da longitude -180 à
# 180; cada letra hexadecimal são 4 pontos), tirada do contorno "ne_110m_land" do Natural Earth (domínio
# público): o globo do Navegador mostra os continentes de verdade. Para refazer: --mapa ne_110m_land.geojson.
MAPA_TERRA = (
    '000000000000000000000000000000000000000000000'
    '000000000000000000000000000000000000000000000'
    '000000000000000000000000000000000000000000000'
    '0000000000007f800ffc0000000000000000000000000'
    '000000000017ff3fffffe000000000000040000000000'
    '00000000061df0ffffff0000f8000000003c000000000'
    '000000030027c3ffffff8000200000000006000000000'
    '0000000038afc007ffff00000000030007ffc001d8000'
    '0000000e88b7b003fffe000000000c003ffffec000000'
    '80180009fc33fc00fffa00000300041dffffffeffc801'
    '00fffbfe725d8f00fff800001ff000edfffffffffffdf'
    'e0ffffffffff87c1ff8000007ffebffdfffffffffffff'
    '31fffffffffd1f80fc01e000f9ebfffffffffffffffff'
    '00fffffffff8034078000003e7fffffffffffffffffff'
    '01fdffffffe01e0038000007e7ffffffffffffffff2f0'
    '007807ffffe01e4000000007e3ffffffffffffff82200'
    '001001fffff80fe000000182c7fffffffffffffe00f00'
    '0080007fffff9ff8000003820ffffffffffffffc00e00'
    '0000007fffff9ffc000006cfffffffffffffffffc0800'
    '0000003ffffffffc000000dfffffffffffffffff40000'
    '00000017ffffff460000007fffffffffffffffff40000'
    '0000000fffffffc10000007ffffffffffffffffe40000'
    '0000000fffffff600000007f7f97cffffffffffc00000'
    '0000000ffffffe00000007f19f03cffffffffff8c0000'
    '0000000ffffffc00000003c26f7fe7ffffffffe080000'
    '0000000ffffff000000007c02dffe7fffffff84080000'
    '00000007fffff0000000018740ffe7fffffffe6300000'
    '00000003fffff000000001fe022ffffffffffc4f00000'
    '00000001ffffc000000003ff000ffffffffffc1800000'
    '00000000ffff8000000007ffef7ffffffffffe0000000'
    '000000003fc04000000007ffffffdffffffffe0000000'
    '000000005f80400000001fffffefe7fffffffc0000000'
    '000000002f80000000001fffffe7f41ffffffc0000000'
    '000000000780c00000003ffffff7ff07fffff20000000'
    '000000000786100000007ffffffbfe07fcff000000000'
    '0000000003cc020000003ffffff9fe03f07e800000000'
    '0000000000fc000000003ffffff9f801e07f020000000'
    '00000000000f000000007ffffffde001c01f020000000'
    '000000000003000000003ffffffe8001c01f820000000'
    '0000000000010f0000003fffffff3000c013008000000'
    '000000000000aff000001fffffffe000a012000000000'
    '0000000000001ff800000fffffffe0002000008000000'
    '0000000000001fff00000687ffffc000002c180000000'
    '0000000000001fff80000001ffff80000014380000000'
    '0000000000003fff80000001ffff000000187a0000000'
    '0000000000003fffe0000003fffe0000000c781800000'
    '0000000000003ffffc000001fffc00000006762b80000'
    '0000000000007fffff000000fffc000000020101e0000'
    '0000000000003fffff800000fffc00000001c001f0800'
    '0000000000001fffff000000fffc000000000880d0200'
    '0000000000001ffffe0000007ffc00000000000000000'
    '0000000000000ffffe000000fffc20000000001c40000'
    '0000000000000ffffe000000fffc2000000000fc60040'
    '00000000000003fffc000000fff8e000000001fe60000'
    '00000000000001fffc000000fff0e000000001ffe0000'
    '00000000000001fffc0000007ff0c00000000ffff8080'
    '00000000000001fff00000007ff0c00000001ffff8000'
    '00000000000001ffc00000007fe0800000001ffffc000'
    '00000000000001ffc00000003fc0000000001ffffe000'
    '00000000000003ff800000003fc0000000001ffffe000'
    '00000000000003ff800000001f80000000000ffffe000'
    '00000000000003ff000000001f00000000000f07fc000'
    '00000000000003f8000000000000000000000801f8008'
    '00000000000007fc000000000000000000000000f8004'
    '00000000000007e000000000000000000000000000006'
    '00000000000007a00000000000000000000000003000c'
    '00000000000003c000000000000000000000000010018'
    '000000000000078000000000000000000000000000030'
    '000000000000078000000000000000000000000000000'
    '0000000000000f0000000000000000080000000000000'
    '0000000000000e0000000000000000000000000000000'
    '000000000000070000000000000000000000000000000'
    '000000000000030000000000000000000000000000000'
    '000000000000000000000000000000000000000000000'
    '000000000000000000000000000000000000000000000'
    '000000000000000000000000000000000000000000000'
    '000000000000000000000000000000000000000000000'
    '000000000000002000000000000000000000000000000'
    '00000000000000c00000000000001e00020ff9ffe0000'
    '00000000000000c0000000000013fff87fffffffff000'
    '00000000000003e00000001ffffffff3fffffffffffc0'
    '00000000038400f000001ffffffffffffffffffffffe0'
    '00000ffff4ffffc000007ffffffffffffffffffffff80'
    '0001ffffffffe000001ffffffffffffffffffffffff00'
    '004fffffffffe00070fffffffffffffffffffffffff00'
    '0000fffffffffe0080ffffffffffffffffffffffffc00'
    '0007fffffffffffffffffffffffffffffffffffffff80'
    'ff803ffffffffffffffffffffffffffffffffffffffff'
    'fffffffffffffffffffffffffffffffffffffffffffff'
    'fffffffffffffffffffffffffffffffffffffffffffff'
)


def _terra():
    bits = []
    for ch in MAPA_TERRA:
        v = int(ch, 16)
        bits.extend(((v >> 3) & 1, (v >> 2) & 1, (v >> 1) & 1, v & 1))
    return bits


TERRA = _terra()


def tem_terra(lat, lon):
    k = min(89, max(0, int((90 - lat) // 2)))
    i = int(((lon + 180) % 360) // 2)
    return TERRA[k * 180 + i]


def mapa_do_geojson(caminho):
    """A máscara de 2 em 2 graus a partir do contorno do Natural Earth (o ne_110m_land.geojson)."""
    import json
    aneis = []
    for f in json.load(open(caminho, encoding='utf-8'))['features']:
        g = f['geometry']
        for p in ([g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']):
            for anel in p:
                xs = [a[0] for a in anel]
                ys = [a[1] for a in anel]
                aneis.append((anel, min(xs), max(xs), min(ys), max(ys)))

    def dentro(lon, lat):
        d = False
        for anel, x0, x1, y0, y1 in aneis:
            if not (x0 <= lon <= x1 and y0 <= lat <= y1):
                continue
            j = len(anel) - 1
            for i in range(len(anel)):
                (xi, yi), (xj, yj) = anel[i][:2], anel[j][:2]
                if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
                    d = not d
                j = i
        return d
    bits = [1 if dentro(-179 + 2 * i, 89 - 2 * k) else 0 for k in range(90) for i in range(180)]
    hexa = ''.join('%x' % (bits[i] * 8 + bits[i + 1] * 4 + bits[i + 2] * 2 + bits[i + 3]) for i in range(0, len(bits), 4))
    return [hexa[i:i + 45] for i in range(0, len(hexa), 45)]


# O centro da vista do globo: o Atlântico, com a América do Sul à esquerda e a África e a Europa à
# direita (as formas que se reconhecem mesmo em 16 pontos).
GLOBO_CENTRO = (-25.0, 10.0)


def globo(s, t, cx, cy, r, centro=None):
    """O globo: os continentes de verdade (projeção ortográfica da MAPA_TERRA), o mar azul, a luz no
    alto, à esquerda, e a sombra embaixo, à direita."""
    import math
    lon0, lat0 = centro or GLOBO_CENTRO
    f0, l0 = math.radians(lat0), math.radians(lon0)
    luz = (-0.55, 0.6, 0.58)
    n = math.sqrt(sum(v * v for v in luz))
    luz = tuple(v / n for v in luz)
    g = Tela(s.tam)
    sub = 4  # pontos de amostra por lado, em cada ponto do ícone
    for y in range(s.tam):
        for x in range(s.tam):
            terra = mar = 0
            soma_i = 0.0
            for a in range(sub):
                for b in range(sub):
                    X = (x + (a + 0.5) / sub - cx) / r
                    Y = -(y + (b + 0.5) / sub - cy) / r
                    rho = math.hypot(X, Y)
                    if rho > 1:
                        continue
                    c = math.asin(rho)
                    if rho == 0:
                        lat, lon = f0, l0
                    else:
                        lat = math.asin(math.cos(c) * math.sin(f0) + Y * math.sin(c) * math.cos(f0) / rho)
                        lon = l0 + math.atan2(X * math.sin(c), rho * math.cos(c) * math.cos(f0) - Y * math.sin(c) * math.sin(f0))
                    if tem_terra(math.degrees(lat), (math.degrees(lon) + 540) % 360 - 180):
                        terra += 1
                    else:
                        mar += 1
                    Z = math.sqrt(max(0.0, 1 - rho * rho))
                    soma_i += X * luz[0] + Y * luz[1] + Z * luz[2]
            total = terra + mar
            if total * 2 < sub * sub:  # menos da metade do ponto dentro do círculo
                continue
            i = soma_i / total
            # A sombra entra aos poucos: uma faixa em xadrez entre a cor do meio e a escura.
            escuro = i < 0.24 or (i < 0.34 and (x + y) % 2 == 0)
            if terra * 2.2 >= total:
                g.ponto(x, y, VERD3 if i > 0.88 else VERD2 if escuro else VERD)
            else:
                g.ponto(x, y, AZUL3 if i > 0.9 else AZUL2 if escuro else AZUL)
    g.contorno()
    s.colar(g, 0, 0)


# ---------- O computador, o disco, a Lixeira, os programas ----------

def computador(t):
    """O monitor cinza de três quartos, com a tela verde-azulada e o pé (desenho genérico)."""
    s = Tela(t)
    if t == 32:
        # A caixa do monitor (a frente e o lado) e o pé.
        s.poligono([(3, 3), (25, 3), (28, 5), (28, 24), (25, 25), (3, 25)], C2)
        s.ret(9, 25, 22, 27, C3)
        s.ret(6, 27, 25, 29, C2)
        s.contorno()
        s.relevo(4, 4, 24, 23, BR, C5)
        s.poligono([(25, 4), (27, 6), (27, 23), (25, 24)], C4)
        s.vlinha(25, 4, 24, C6)
        # A tela, funda, com o brilho no canto.
        s.ret(6, 6, 22, 19, K)
        s.ret(7, 7, 21, 18, cor('2a8080'))
        s.ret(7, 7, 21, 8, cor('46a6a6'))
        s.ret(7, 7, 8, 18, cor('46a6a6'))
        s.ret(9, 10, 13, 10, cor('9fe0e0'))
        s.ret(9, 12, 16, 12, cor('9fe0e0'))
        s.ret(9, 14, 12, 14, cor('9fe0e0'))
        # O botão e a luz verde.
        s.hlinha(7, 12, 22, C5)
        s.ret(19, 21, 21, 22, C5)
        s.ponto(17, 22, VERD)
        s.hlinha(7, 24, 28, C4)
    else:
        s.grade(0, 0, [
            ".KKKKKKKKKKKKKK.",
            ".KWWWWWWWWWWWcK.",
            ".KWKKKKKKKKKKsK.",
            ".KWKbbbaaaaaKsK.",
            ".KWKbaaaaaaaKsK.",
            ".KWKaaaaaaaaKsK.",
            ".KWKaaaaaaaaKsK.",
            ".KWKaaaaaaaaKsK.",
            ".KWKKKKKKKKKKsK.",
            ".KWccccccccvcsK.",
            ".KcsssssssssssK.",
            ".KKKKKKKKKKKKKK.",
            ".....KddddK.....",
            "...KKKKKKKKKK...",
            "...KWccccccsK...",
            "...KKKKKKKKKK...",
        ], {'K': K, 'W': BR, 'c': C2, 's': C5, 'd': C3, 'a': cor('2a8080'), 'b': cor('9fe0e0'), 'v': VERD})
    return s


def disco(t):
    """O disco rígido: a caixa cinza de três quartos, com a luz verde e a ranhura."""
    s = Tela(t)
    if t == 32:
        s.poligono([(2, 12), (8, 8), (31, 8), (31, 20), (25, 24), (2, 24)], C3)
        s.contorno()
        # O alto (mais claro), a frente e o lado.
        s.poligono([(3, 12), (8, 9), (30, 9), (25, 12)], C1)
        s.hlinha(3, 25, 13, K)
        s.ret(3, 14, 24, 22, C3)
        s.relevo(3, 14, 24, 22, BR, C5)
        s.poligono([(26, 13), (30, 10), (30, 20), (26, 23)], C5)
        s.vlinha(25, 13, 23, K)
        s.linha(25, 13, 30, 9, K)
        # A ranhura e a luz verde.
        s.hlinha(6, 20, 18, C6)
        s.hlinha(6, 20, 19, BR)
        s.ret(5, 21, 6, 21, VERD)
    else:
        s.poligono([(0, 6), (3, 4), (15, 4), (15, 10), (12, 12), (0, 12)], C3)
        s.contorno()
        s.poligono([(1, 6), (3, 5), (14, 5), (12, 6)], C1)
        s.hlinha(1, 12, 7, K)
        s.vlinha(12, 7, 11, K)
        s.ret(13, 7, 13, 9, C5)
        s.hlinha(2, 9, 9, C6)
        s.ponto(2, 10, VERD)
    return s


def lixeira(t, cheia=False):
    """A lata de lixo de metal, com as ranhuras em pé, a tampa e a alça (cheia: os papéis por cima)."""
    s = Tela(t)
    if t == 32:
        topo = 9 if not cheia else 10
        # O corpo (afina embaixo) e a tampa.
        s.poligono([(7, topo), (25, topo), (24, 30), (8, 30)], C3)
        s.contorno()
        for x in range(9, 24, 3):
            s.vlinha(x, topo + 3, 28, C6)
            s.vlinha(x + 1, topo + 3, 28, BR)
        s.vlinha(8, topo + 1, 29, C1)
        s.vlinha(23, topo + 1, 29, C5)
        s.hlinha(9, 23, 29, C5)
        tampa = Tela(32)
        ty = topo - 4
        tampa.ret(5, ty + 1, 26, ty + 4, C2)
        tampa.ret(13, ty - 1, 18, ty, C2)
        tampa.contorno()
        tampa.hlinha(6, 25, ty + 2, BR)
        tampa.hlinha(6, 25, ty + 3, C5)
        tampa.ret(14, ty, 17, ty, C4)
        if cheia:
            # Os papéis amassados saindo por baixo da tampa levantada.
            p = Tela(32)
            p.poligono([(8, topo + 1), (11, topo - 6), (16, topo - 4), (20, topo - 8), (24, topo + 1)], BR)
            p.contorno()
            p.linha(12, topo - 3, 14, topo, C5)
            p.linha(18, topo - 5, 19, topo - 1, C5)
            s.colar(p, 0, 0)
            tampa2 = Tela(32)
            tampa2.colar(tampa, 0, -4)
            s.colar(tampa2, 0, 0)
        else:
            s.colar(tampa, 0, 0)
    else:
        # Cheia, a lata fica um ponto mais baixa: os papéis aparecem entre a boca e a tampa levantada.
        topo = 5 if cheia else 4
        s.poligono([(3, topo), (13, topo), (12, 15), (4, 15)], C3)
        s.contorno()
        for x in (6, 9):
            s.vlinha(x, topo + 3, 12, C6)
        tampa = Tela(16)
        tampa.ret(2, 2, 13, 4, C2)
        tampa.ret(6, 1, 9, 1, C2)
        tampa.contorno()
        if cheia:
            # Os papéis, ponto a ponto: o monte branco com uma dobra, entre a boca e a tampa.
            s.grade(0, 3, ['....KKKKKKKK....', '...KWWWWsWWWK...'], {'K': K, 'W': BR, 's': C5})
            t2 = Tela(16)
            t2.colar(tampa, 0, -2)
            s.colar(t2, 0, 0)
        else:
            s.colar(tampa, 0, 0)
    return s


def programa_desenho(s, t, ox=0, oy=0, k=1.0):
    """O programa: o losango lavanda em relevo, com uma janelinha de título escuro no meio (desenho próprio)."""
    d = Tela(s.tam)
    if t == 32:
        c = lambda v: int(round(v * k))
        cx, cy, r = ox + c(16), oy + c(16), c(15)
        d.poligono([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], P3)
        # A luz nos lados de cima e a sombra nos de baixo.
        for x in range(s.tam):
            for y in range(s.tam):
                if d.pega(x, y) == P3:
                    u, v = x + 0.5 - cx, y + 0.5 - cy
                    if abs(u) + abs(v) > r - 3:
                        d.ponto(x, y, P2 if v < 0 else P5)
        d.contorno()
        w, h = c(5), c(4)
        d.ret(cx - w, cy - h, cx + w, cy + h, BR)
        d.ret(cx - w, cy - h, cx + w, cy - h + 1, P6)
        d.hlinha(cx - w - 1, cx + w + 1, cy - h - 1, K)
        d.hlinha(cx - w - 1, cx + w + 1, cy + h + 1, K)
        d.vlinha(cx - w - 1, cy - h - 1, cy + h + 1, K)
        d.vlinha(cx + w + 1, cy - h - 1, cy + h + 1, K)
        d.hlinha(cx - w + 1, cx + w - 1, cy + h, C3)
    else:
        d.poligono([(8, 0), (16, 8), (8, 16), (0, 8)], P3)
        d.contorno()
        d.ret(5, 6, 10, 10, BR)
        d.hlinha(5, 10, 6, P6)
        d.hlinha(4, 11, 5, K)
        d.hlinha(4, 11, 11, K)
        d.vlinha(4, 5, 11, K)
        d.vlinha(11, 5, 11, K)
    s.colar(d, 0, 0)


def programa(t):
    s = Tela(t)
    programa_desenho(s, t)
    return s


def navegador(t):
    """O Navegador: o globo azul e verde, com a luz no alto."""
    s = Tela(t)
    if t == 32:
        globo(s, 32, 16, 16, 14)
    else:
        globo(s, 16, 8, 8, 7.5)
    return s


def correio(t):
    """O E-mail: o envelope branco de três quartos, com a aba e o selo."""
    s = Tela(t)
    if t == 32:
        s.ret(2, 8, 29, 25, PAPEL)
        s.contorno()
        s.linha(2, 8, 15, 18, K)
        s.linha(29, 8, 16, 18, K)
        s.linha(2, 25, 12, 16, C5)
        s.linha(29, 25, 19, 16, C5)
        s.hlinha(3, 28, 24, PAPEL3)
        s.ret(23, 10, 27, 14, VERM)
        s.relevo(23, 10, 27, 14, VERM3, VERM2)
    else:
        s.ret(1, 4, 14, 12, PAPEL)
        s.contorno()
        s.linha(1, 4, 7, 9, K)
        s.linha(14, 4, 8, 9, K)
        s.ret(11, 5, 13, 6, VERM)
    return s


def bloco(t):
    """O Bloco de notas: o bloco amarelo pautado, com a espiral no alto."""
    s = Tela(t)
    if t == 32:
        s.ret(6, 4, 25, 29, AMAR3)
        s.contorno()
        s.ret(7, 5, 24, 7, AMAR)
        s.hlinha(7, 24, 8, K)
        for y in range(11, 28, 3):
            s.hlinha(8, 23, y, cor('aab4dd'))
        s.vlinha(10, 9, 28, cor('ee9999'))
        for x in range(8, 25, 3):
            s.vlinha(x, 2, 5, C6)
            s.ponto(x, 2, K)
        s.hlinha(7, 24, 28, AMAR2)
        s.vlinha(24, 9, 28, AMAR2)
    else:
        s.ret(3, 2, 12, 15, AMAR3)
        s.contorno()
        s.hlinha(4, 11, 3, AMAR)
        s.hlinha(4, 11, 4, K)
        for y in (7, 9, 11, 13):
            s.hlinha(5, 10, y, cor('aab4dd'))
        for x in (5, 8, 11):
            s.ponto(x, 1, C6)
    return s


def prompt(t):
    """O Prompt de comando: a janelinha cinza com a tela preta e o cursor verde."""
    s = Tela(t)
    if t == 32:
        s.ret(2, 4, 29, 27, C2)
        s.contorno()
        s.ret(3, 5, 28, 8, C3)
        for y in (6, 7):
            s.hlinha(8, 26, y, C5 if y == 6 else BR)
        s.ret(4, 6, 6, 7, C1)
        s.ret(4, 10, 27, 25, K)
        s.grade(6, 12, ['#..', '.#.', '..#', '.#.', '#..'], {'#': VERD3})
        s.hlinha(10, 14, 16, VERD3)
        s.relevo(3, 9, 28, 26, C5, BR)
    else:
        s.ret(1, 2, 14, 13, C2)
        s.contorno()
        s.ret(2, 5, 13, 12, K)
        s.grade(3, 6, ['#.', '.#', '#.'], {'#': VERD3})
        s.hlinha(6, 8, 8, VERD3)
    return s


def balao(t, sinal, fundo=P2, escuro=P6):
    """O balão de fala com um sinal dentro (a ajuda, as mensagens)."""
    s = Tela(t)
    if t == 32:
        s.elipse(16, 13.5, 14, 11, fundo)
        s.poligono([(8, 20), (13, 23), (5, 30)], fundo)
        s.contorno()
        s.elipse(13, 9, 6, 3.5, P1 if fundo == P2 else BR)
        s.elipse(16, 13.5, 14, 11, None)
        sinal(s, 32, escuro)
    else:
        s.elipse(8, 7, 7.5, 6.2, fundo)
        s.poligono([(3, 10), (7, 12), (2, 16)], fundo)
        s.contorno()
        sinal(s, 16, escuro)
    return s


def sinal_interrogacao(s, t, c):
    if t == 32:
        s.grade(11, 8, ['..######..', '.##....##.', '.##....##.', '......##..', '.....##...', '....##....', '....##....', '..........', '....##....', '....##....'], {'#': c})
    else:
        s.grade(5, 3, ['.####.', '##..##', '....##', '...##.', '..##..', '......', '..##..'], {'#': c})


def sinal_info(s, t, c):
    if t == 32:
        s.grade(13, 8, ['..##..', '..##..', '......', '.###..', '..##..', '..##..', '..##..', '..##..', '.####.'], {'#': c})
    else:
        s.grade(7, 2, ['.#', '..', '##', '.#', '.#', '##'], {'#': c})


def ajuda(t):
    return balao(t, sinal_interrogacao)


# As mensagens só existem no tamanho grande (as caixas de diálogo), como no tema do PC.
def msg_pergunta(t):
    return balao(t, sinal_interrogacao) if t == 32 else None


def msg_info(t):
    return balao(t, sinal_info, BR, AZUL2) if t == 32 else None


def msg_erro(t):
    """O pare: o octógono vermelho com a borda clara e o "x" branco."""
    s = Tela(t)
    if t != 32:
        return None
    a = 9
    pts = [(a, 1), (31 - a, 1), (31, a), (31, 31 - a), (31 - a, 31), (a, 31), (1, 31 - a), (1, a)]
    s.poligono(pts, VERM)
    s.contorno()
    s.poligono([(a + 1, 3), (29 - a, 3), (29, a + 1), (29, 29 - a), (29 - a, 29), (a + 1, 29), (3, 29 - a), (3, a + 1)], VERM3)
    s.poligono([(a + 1, 4), (28 - a, 4), (28, a + 1), (28, 28 - a), (28 - a, 28), (a + 1, 28), (4, 28 - a), (4, a + 1)], VERM)
    for i in range(-5, 6):
        for dx in (0, 1):
            s.ponto(16 + i + dx - 1, 16 + i, BR)
            s.ponto(16 - i + dx - 1, 16 + i, BR)
    return s


def msg_aviso(t):
    """O cuidado: o triângulo amarelo com o ponto de exclamação."""
    s = Tela(t)
    if t != 32:
        return None
    s.poligono([(16, 2), (31, 29), (1, 29)], AMAR)
    s.contorno()
    s.poligono([(16, 6), (27, 26), (5, 26)], AMAR3)
    s.poligono([(16, 7), (26, 25), (6, 25)], AMAR)
    s.ret(15, 11, 17, 19, K)
    s.ret(15, 22, 17, 24, K)
    return s


def localizar(t):
    """O Localizar: a lupa, com o vidro azul-claro e o cabo escuro."""
    s = Tela(t)
    if t == 32:
        s.elipse(13, 13, 11, 11, K)
        s.elipse(13, 13, 9, 9, AZUL3)
        s.elipse(10.5, 10.5, 3.5, 3.5, BR)
        cabo = Tela(32)
        cabo.poligono([(20, 23), (23, 20), (31, 28), (28, 31)], MARROM2)
        cabo.contorno()
        cabo.linha(23, 22, 29, 28, MARROM3)
        s.colar(cabo, 0, 0)
    else:
        s.elipse(6.5, 6.5, 6, 6, K)
        s.elipse(6.5, 6.5, 4.5, 4.5, AZUL3)
        s.ponto(4, 4, BR)
        s.ponto(5, 4, BR)
        s.ponto(4, 5, BR)
        s.poligono([(10, 12), (12, 10), (16, 14), (14, 16)], MARROM2)
    return s


def calculadora(t):
    """A Calculadora: a caixa cinza com o visor verde e as teclas."""
    s = Tela(t)
    if t == 32:
        s.ret(6, 2, 25, 29, C2)
        s.contorno()
        s.relevo(7, 3, 24, 28, BR, C5)
        s.ret(9, 5, 22, 10, K)
        s.ret(10, 6, 21, 9, cor('aaccaa'))
        s.hlinha(15, 20, 8, C8)
        for j in range(4):
            for i in range(4):
                x, y = 9 + i * 4, 13 + j * 4
                cc = LARANJA if i == 3 else C1
                s.ret(x, y, x + 2, y + 2, cc)
                s.hlinha(x, x + 2, y + 2, C6)
                s.vlinha(x + 2, y, y + 2, C6)
    else:
        s.ret(3, 1, 12, 14, C2)
        s.contorno()
        s.ret(5, 3, 10, 5, cor('aaccaa'))
        for j in range(3):
            for i in range(3):
                s.ret(5 + i * 2, 7 + j * 2, 5 + i * 2, 7 + j * 2, C6)
    return s


def desligar(t):
    """O Desligar: o botão redondo com o símbolo da energia."""
    s = Tela(t)
    if t == 32:
        s.elipse(16, 16, 14, 14, C3)
        s.contorno()
        s.elipse(15, 15, 11, 11, C1)
        s.elipse(16, 16, 11, 11, C3)
        # O anel de 14 pontos, no meio da largura, e a haste de 2 pontos acima dele: o conjunto, da
        # ponta da haste ao pé do anel (das linhas 8 a 23), fica no meio do botão.
        anel = Tela(32)
        anel.elipse(16, 17, 7, 7, K)
        anel.elipse(16, 17, 4.5, 4.5, (0, 0, 0, 0))
        for y in range(10, 15):
            for x in range(12, 20):
                anel.ponto(x, y, (0, 0, 0, 0))
        anel.ret(15, 8, 16, 16, K)
        s.colar(anel, 0, 0)
    else:
        # Em 16 pontos, o círculo de 16 desenhado à mão (a elipse ficava oitavada), com a luz em cima,
        # à esquerda, a sombra embaixo, à direita, e o símbolo de 8 × 8 (a haste de 2 pontos) bem no meio.
        s.grade(0, 0, [
            ".....KKKKKK.....",
            "...KKBBBBBBKK...",
            "..KBBccccccBBK..",
            ".KBccccccccccsK.",
            ".KBccccKKccccsK.",
            "KBcccKcKKcKcccsK",
            "KBccKccKKccKccsK",
            "KBccKccKKccKccsK",
            "KBccKccccccKccsK",
            "KBccKccccccKccsK",
            "KBcccKccccKcccsK",
            ".KBcccKKKKcccsK.",
            ".KBccccccccccsK.",
            "..KssccccccssK..",
            "...KKssssssKK...",
            ".....KKKKKK.....",
        ], {'K': K, 'B': BR, 'c': C3, 's': C5})
    return s


def assistente(t):
    """O Claude: o balão de conversa lavanda de cantos arredondados, com as reticências (desenho próprio, sem marcas)."""
    s = Tela(t)
    if t == 32:
        s.poligono([(5, 4), (27, 4), (30, 7), (30, 20), (27, 23), (15, 23), (8, 29), (9, 23), (5, 23), (2, 20), (2, 7)], P2)
        s.contorno()
        s.hlinha(5, 26, 5, P1)
        s.vlinha(3, 7, 19, P1)
        s.hlinha(6, 26, 21, P4)
        s.vlinha(28, 8, 20, P4)
        for x in (9, 15, 21):
            s.ret(x, 12, x + 2, 14, P6)
            s.hlinha(x + 1, x + 3, 15, P1)
    else:
        s.poligono([(2, 2), (14, 2), (15, 3), (15, 10), (14, 11), (7, 11), (4, 14), (5, 11), (2, 11), (1, 10), (1, 3)], P2)
        s.contorno()
        for x in (4, 7, 10):
            s.ponto(x, 6, P6)
            s.ponto(x + 1, 6, P6)
    return s


def removivel(t):
    """O disco removível: o disquete de 3,5 polegadas, com a janela de metal e a etiqueta."""
    s = Tela(t)
    if t == 32:
        s.poligono([(3, 3), (27, 3), (29, 5), (29, 29), (3, 29)], C7)
        s.contorno()
        s.relevo(4, 4, 27, 27, C6, C8)
        s.ret(9, 4, 22, 12, C3)
        s.relevo(9, 4, 22, 12, BR, C5)
        s.ret(18, 6, 20, 10, C7)
        s.ret(7, 16, 25, 27, BR)
        s.relevo(7, 16, 25, 27, BR, C4)
        for y in (19, 22, 25):
            s.hlinha(9, 23, y, C4)
    else:
        s.poligono([(1, 1), (13, 1), (14, 2), (14, 14), (1, 14)], C7)
        s.contorno()
        s.ret(4, 2, 10, 5, C3)
        s.ret(8, 3, 9, 4, C7)
        s.ret(3, 8, 12, 12, BR)
    return s


def discos(t):
    """O programa Discos: o disco rígido com o disquete (o disco removível) na frente, embaixo à direita."""
    s = disco(t)
    if t == 32:
        s.colar(removivel(16), 16, 16)
    else:
        s.grade(8, 8, [
            'KKKKKKK.',
            'KAcccAKK',
            'KAcAcAAK',
            'KAcccAAK',
            'KAAAAAAK',
            'KAWWWWAK',
            'KAWWWWAK',
            'KKKKKKKK',
        ], {'K': K, 'A': C7, 'c': C3, 'W': BR})
    return s


def caixa_programas(t):
    """A Loja de programas: a caixa de papelão aberta, de três quartos, com as abas para fora e o
    disquete cinza saindo dela (como os instaladores da época), e a etiqueta na frente. A frente é
    clara, o lado é médio e o fundo da caixa, por dentro, é escuro."""
    s = Tela(t)
    creme = cor('f2d6a8')  # o lado de dentro das abas, com a luz

    def lado(x0, x1, alto, baixo, k):
        # O lado direito, coluna a coluna, subindo com a profundidade.
        for x in range(x0, x1 + 1):
            d = (x - x0) * k
            s.vlinha(x, round(alto - d), round(baixo - d), MARROM)

    if t == 32:
        s.poligono([(9, 13), (29, 13), (31, 6), (12, 6)], creme)  # a aba de trás
        s.poligono([(3, 17), (10, 12), (6, 8), (0, 13)], creme)  # a aba da esquerda
        s.poligono([(3, 17), (10, 12), (29, 12), (22, 17)], MARROM2)  # o fundo, por dentro
        s.ret(10, 2, 21, 15, C7)  # o disquete
        s.ret(3, 16, 22, 29, MARROM3)  # a frente
        lado(22, 28, 16, 29, 4 / 6)
        s.contorno()
        # As arestas de cima, o disquete por cima delas e as da frente.
        s.linha(3, 16, 9, 12, K)
        s.hlinha(9, 28, 12, K)
        s.linha(22, 16, 28, 12, K)
        s.ret(10, 2, 21, 15, K)
        s.ret(11, 3, 20, 15, C7)
        s.ret(13, 3, 18, 7, C3)  # a janela de metal
        s.relevo(13, 3, 18, 7, BR, C5)
        s.ret(16, 4, 17, 6, C7)
        s.ret(12, 10, 19, 15, BR)  # a etiqueta do disquete
        s.hlinha(13, 18, 12, C4)
        s.hlinha(13, 18, 14, C4)
        s.hlinha(3, 22, 16, K)
        s.vlinha(22, 16, 29, K)
        s.relevo(4, 17, 21, 28, creme, MARROM)
        # A fita que fecha a caixa e a etiqueta de papel.
        s.ret(15, 17, 17, 27, creme)
        s.ret(6, 20, 12, 25, BR)
        s.relevo(6, 20, 12, 25, BR, C4)
        s.hlinha(7, 11, 22, C5)
        s.hlinha(7, 10, 24, C5)
    else:
        # No pequeno, ponto a ponto: sem a aba da esquerda, que viraria pontos soltos.
        s.grade(0, 0, [
            '................',
            '....KKKKKKK.....',
            '....KABBBAK.....',
            '....KABBBAKKKK..',
            '....KAAAAAKcccK.',
            '....KWWWWWKccK..',
            '..KKKWWWWWKKKKK.',
            '.KEEKWWWWWKEEEK.',
            'KKKKKKKKKKKFFFK.',
            'KcccccccccKFFFK.',
            'KcWWWWGGGFKFFFK.',
            'KcWDDWGGGFKFFFK.',
            'KcWWWWGGGFKFFK..',
            'KcGGGGGGGFKFFK..',
            'KFFFFFFFFFKFK...',
            'KKKKKKKKKKKK....',
        ], {'K': K, 'A': C7, 'B': C3, 'W': BR, 'D': C5, 'c': creme, 'G': MARROM3, 'F': MARROM, 'E': MARROM2})
    return s


def relogio(t):
    """O relógio: o mostrador branco com a moldura cinza e os ponteiros."""
    s = Tela(t)
    if t == 32:
        s.elipse(16, 16, 14, 14, C3)
        s.contorno()
        s.elipse(16, 16, 11, 11, K)
        s.elipse(16, 16, 10, 10, BR)
        for a, b in ((16, 7), (25, 16), (16, 25), (7, 16)):
            s.ponto(a, b, K)
        s.linha(16, 16, 16, 9, K)
        s.linha(16, 16, 21, 19, K)
        s.ponto(16, 16, VERM)
    else:
        s.elipse(8, 8, 7.5, 7.5, K)
        s.elipse(8, 8, 6.2, 6.2, BR)
        s.linha(8, 8, 8, 4, K)
        s.linha(8, 8, 11, 9, K)
    return s


# ---------- A lista ----------

def especiais():
    d = {}
    for nome in ('pasta-mesa', 'pasta-imagens', 'pasta-musicas', 'pasta-videos', 'pasta-programas', 'pasta-recebidos', 'pasta-capturas', 'pasta-diario', 'pasta-dos', 'painel'):
        d[nome] = pasta_especial(nome)
    return d


ICONES = {
    'pasta': pasta,
    'configuracoes': pasta_especial('painel'),
    'pasta-aberta': lambda t: pasta(t, aberta=True),
    'documentos': documentos,
    **especiais(),
    'computador': computador,
    'disco': disco,
    'removivel': removivel,
    'discos': discos,
    'lixeira': lixeira,
    'lixeira-cheia': lambda t: lixeira(t, cheia=True),
    'arquivo': lambda t: doc(t),
    'texto': lambda t: doc(t, linhas=True),
    'documento': lambda t: doc(t, linhas=True, faixa=(AZUL3, AZUL)),
    'imagem': lambda t: doc(t, em_imagem),
    'som': lambda t: doc(t, em_som),
    'video': lambda t: doc(t, em_video),
    'compactado': lambda t: doc(t, em_compactado),
    'html': lambda t: doc(t, em_html),
    'pdf': lambda t: doc(t, em_texto_tipo('PDF', BR, VERM), linhas=True, faixa=(VERM, VERM2)),
    'planilha': lambda t: doc(t, em_planilha),
    'apresentacao': lambda t: doc(t, em_apresentacao),
    'codigo': lambda t: doc(t, em_codigo),
    'json': lambda t: doc(t, em_texto_tipo('JSON', K, AMAR), linhas=True, faixa=(AMAR, AMAR2)),
    'python': lambda t: doc(t, em_texto_tipo('PY', BR, AZUL), linhas=True, faixa=(AZUL, AZUL2)),
    'shell': lambda t: doc(t, em_shell),
    'markdown': lambda t: doc(t, em_markdown),
    'fonte': lambda t: doc(t, em_fonte),
    'calendario-arq': lambda t: doc(t, em_calendario),
    'executavel': programa,
    'programa': programa,
    'navegador': navegador,
    'internet': navegador,
    'correio': correio,
    'bloco': bloco,
    'prompt': prompt,
    'ajuda': ajuda,
    'msg-pergunta': msg_pergunta,
    'msg-info': msg_info,
    'msg-erro': msg_erro,
    'msg-aviso': msg_aviso,
    'localizar': localizar,
    'calculadora': calculadora,
    'desligar': desligar,
    'claude': assistente,
    'relogio': relogio,
    'programas-caixa': caixa_programas,
}


def fechar_contorno(im):
    """A borda de fora sempre escura, como nos ícones da época: o ponto aceso e claro que encosta no
    vazio (uma sombra ou uma luz desenhada por cima do contorno) volta a ser preto."""
    px = im.load()
    w, h = im.size
    vazio = lambda x, y: not (0 <= x < w and 0 <= y < h) or px[x, y][3] == 0
    claros = [(x, y) for y in range(h) for x in range(w)
              if px[x, y][3] and sum(px[x, y][:3]) >= 300 and any(vazio(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for x, y in claros:
        px[x, y] = K
    return im


def gerar():
    feitos = {16: {}, 32: {}}
    for nome, f in ICONES.items():
        for t in (32, 16):
            s = f(t)
            if s is None:
                continue
            feitos[t][nome] = fechar_contorno(s.im)
    for t in (16, 32):
        pasta_t = os.path.join(DESTINO, str(t))
        os.makedirs(pasta_t, exist_ok=True)
        for nome, im in feitos[t].items():
            im.save(os.path.join(pasta_t, nome + '.png'), optimize=True)
    nomes = sorted(f'{t}/{n}' for t in (16, 32) for n in feitos[t])
    with open(LISTA, 'w', encoding='utf-8') as arq:
        arq.write('// Gerado por ferramentas/icones-mac.py: os ícones que o tema Mac tem (tamanho/nome).\n')
        arq.write('export const ICONES_MAC = new Set([\n')
        for n in nomes:
            arq.write(f"  '{n}',\n")
        arq.write(']);\n')
    return feitos


def folha_previa(feitos, saida, esc=4):
    """A folha de prévia: cada ícone ampliado, no fundo do tema e no branco, com o pequeno ao lado."""
    nomes = sorted(feitos[32])
    cols = 6
    cw, ch = 32 * esc * 2 + 16 * esc + 30, 32 * esc + 24
    im = Image.new('RGB', (cols * cw, ((len(nomes) + cols - 1) // cols) * ch), (221, 221, 221))
    d = ImageDraw.Draw(im)
    for i, n in enumerate(nomes):
        x, y = (i % cols) * cw + 6, (i // cols) * ch + 4
        for k, fundo in enumerate(((106, 106, 168), (255, 255, 255))):
            bx = x + k * (32 * esc + 4)
            d.rectangle([bx, y, bx + 32 * esc - 1, y + 32 * esc - 1], fill=fundo)
            a = feitos[32][n].resize((32 * esc, 32 * esc), Image.NEAREST)
            im.paste(a, (bx, y), a)
        if n in feitos[16]:
            bx = x + 2 * (32 * esc + 4)
            d.rectangle([bx, y, bx + 16 * esc - 1, y + 16 * esc - 1], fill=(106, 106, 168))
            b = feitos[16][n].resize((16 * esc, 16 * esc), Image.NEAREST)
            im.paste(b, (bx, y), b)
        d.text((x, y + 32 * esc + 4), n, fill=(0, 0, 0))
    im.save(saida)


if __name__ == '__main__':
    if '--mapa' in sys.argv:
        for linha in mapa_do_geojson(sys.argv[sys.argv.index('--mapa') + 1]):
            print("    '%s'" % linha)
        sys.exit(0)
    f = gerar()
    if '--folha' in sys.argv:
        folha_previa(f, sys.argv[sys.argv.index('--folha') + 1])
    print('ícones do tema Mac:', len(f[32]), '(32)', len(f[16]), '(16)')
