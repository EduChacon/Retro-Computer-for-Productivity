"""Os símbolos que faltam na Csilla (a fonte do Prompt de comando) e que o Claude Code usa:
as aspas curvas, o marcador das mensagens (⏺), o recuo das respostas das ferramentas (⎿), as
setas, o certo e o errado, as estrelinhas da espera e os sinais dos modos (⏵, ⏸, ❯).

Desenhos próprios, ponto a ponto, na grade da Csilla de 10 pontos: 7 de largura, 10 de altura, a
linha de base embaixo da linha 8 (as linhas 8 e 9 são as das letras que descem). "#" é um ponto
aceso. O negrito sai de cada desenho com o ponto repetido à direita, como na Csilla Bold.
Lido por ferramentas/fonte-serenity.py (--proprios).
"""

GLIFOS = {
    # “ e ”: dois ‘ e dois ’ lado a lado.
    0x201C: ['..#..#.', '.#..#..', '.##.##.'],
    0x201D: ['.##.##.', '..#..#.', '.#..#..'],
    # • e o ponto grande (● e o ⏺ das mensagens do Claude).
    0x2022: ['', '', '', '', '..###..', '..###..', '..###..'],
    0x25CF: ['', '', '..###..', '.#####.', '.#####.', '.#####.', '..###..'],
    0x23FA: ['', '', '..###..', '.#####.', '.#####.', '.#####.', '..###..'],
    # ⎿: o canto que recua as respostas das ferramentas.
    0x23BF: ['..#....', '..#....', '..#....', '..#....', '..#....', '..#####'],
    # As setas (a ↑ já vem na Csilla).
    0x2190: ['', '', '', '..#....', '.#.....', '#######', '.#.....', '..#....'],
    0x2192: ['', '', '', '....#..', '.....#.', '#######', '.....#.', '....#..'],
    0x2193: ['', '...#...', '...#...', '...#...', '...#...', '.#.#.#.', '..###..', '...#...'],
    # O certo e o errado (os cheios, ✔ e ✘, saem engrossados).
    0x2713: ['', '', '', '......#', '.....#.', '#...#..', '.#.#...', '..#....'],
    0x2717: ['', '', '', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.'],
    # As estrelinhas da espera do Claude e o "portanto".
    0x2722: ['', '', '...#...', '...#...', '.##.##.', '...#...', '...#...'],
    0x2733: ['', '', '#..#..#', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '#..#..#'],
    0x2736: ['', '', '...#...', '..###..', '#######', '.#####.', '#######', '..###..', '...#...'],
    0x273B: ['', '', '.##.##.', '.##.##.', '...#...', '.##.##.', '.##.##.'],
    0x273D: ['', '...#...', '.#.#.#.', '..###..', '###.###', '..###..', '.#.#.#.', '...#...'],
    0x2234: ['', '', '', '', '...#...', '', '', '.#...#.'],
    # Os sinais dos modos: ⏵ (aceitar as edições), ⏸ (o plano) e ❯ (a seta da entrada).
    0x23F5: ['', '', '.#.....', '.##....', '.###...', '.####..', '.###...', '.##....', '.#.....'],
    0x23F8: ['', '', '.##.##.', '.##.##.', '.##.##.', '.##.##.', '.##.##.', '.##.##.', '.##.##.'],
    0x276F: ['', '', '.##....', '..##...', '...##..', '....##.', '...##..', '..##...', '.##....'],
}

# Os cheios: o mesmo desenho engrossado (o ponto repetido à direita).
GROSSOS = {0x2714: 0x2713, 0x2718: 0x2717}

LARGURA = 7
ALTURA = 10


def linhas(desenho):
    """As 10 linhas do desenho como números (o bit x é a coluna x), como nas fontes do SerenityOS."""
    rows = []
    for i in range(ALTURA):
        s = desenho[i] if i < len(desenho) else ''
        assert len(s) in (0, LARGURA), f'linha com {len(s)} pontos: {s!r}'
        rows.append(sum(1 << x for x, c in enumerate(s) if c == '#'))
    return rows


def engrossar(rows, largura=LARGURA):
    """O negrito da Csilla: cada ponto aceso acende também o da direita (dentro da largura), menos
    quando isso o juntaria ao próximo (as reticências e as aspas continuam separadas)."""
    cheio = (1 << largura) - 1
    return [(r | ((r << 1) & ~(r >> 1))) & cheio for r in rows]


def proprios(negrito=False):
    """{código: (largura, linhas)} dos desenhos, no formato de fonte-serenity.ler()."""
    g = {}
    for c, d in GLIFOS.items():
        rows = linhas(d)
        g[c] = (LARGURA, engrossar(rows) if negrito else rows)
    for c, base in GROSSOS.items():
        g[c] = (LARGURA, engrossar(linhas(GLIFOS[base])))
    return g
