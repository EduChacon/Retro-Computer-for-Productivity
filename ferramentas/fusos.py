#!/usr/bin/env python3
"""
As coordenadas da cidade de referência de cada fuso horário, para as trocas pelo sol (o esquema de
cores da noite e a luz noturna do pôr ao nascer do sol, pelo fuso do computador): da base de fusos
horários (a tz database, de domínio público), pelos arquivos zone1970.tab e zone.tab, mais os outros
nomes de cada fuso (as linhas "L" de tzdata.zi).

    python3 -I ferramentas/fusos.py [PASTA_DO_ZONEINFO]

PASTA_DO_ZONEINFO é /usr/share/zoneinfo por padrão. Grava src/sistema/js/fusos-dados.js.
"""
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def graus(texto):
    """Um número da ISO 6709 (±GGMM ou ±GGMMSS, com dois ou três dígitos de graus) em graus."""
    sinal = -1 if texto[0] == '-' else 1
    d = texto[1:]
    n = 3 if len(d) in (5, 7) else 2
    g, m, s = int(d[:n]), int(d[n:n + 2]), int(d[n + 2:n + 4] or 0)
    return sinal * (g + m / 60 + s / 3600)


def ler_tab(arquivo, fusos):
    with open(arquivo, encoding='utf-8') as f:
        for linha in f:
            if linha.startswith('#') or not linha.strip():
                continue
            partes = linha.rstrip('\n').split('\t')
            m = re.fullmatch(r'([+-]\d{4}(?:\d{2})?)([+-]\d{5}(?:\d{2})?)', partes[1])
            if m:
                fusos.setdefault(partes[2], (round(graus(m.group(1)), 1), round(graus(m.group(2)), 1)))


def main():
    pasta = sys.argv[1] if len(sys.argv) > 1 else '/usr/share/zoneinfo'
    fusos = {}
    ler_tab(os.path.join(pasta, 'zone1970.tab'), fusos)
    ler_tab(os.path.join(pasta, 'zone.tab'), fusos)
    versao = ''
    apelidos = []
    with open(os.path.join(pasta, 'tzdata.zi'), encoding='utf-8') as f:
        for linha in f:
            if linha.startswith('# version '):
                versao = linha.split()[2]
            elif linha.startswith('L '):
                _, alvo, nome = linha.split()
                apelidos.append((alvo, nome))
    # Um nome antigo fica com a cidade do fuso para onde aponta (se não tiver a própria).
    for alvo, nome in apelidos:
        if nome not in fusos and alvo in fusos:
            fusos[nome] = fusos[alvo]
    texto = (
        '// GERADO por ferramentas/fusos.py: a latitude e a longitude da cidade de referência de cada fuso\n'
        f'// horário, da base de fusos horários (tz database {versao}, de domínio público), para as trocas pelo sol.\n'
        f"export const VERSAO = '{versao}';\n"
        'export const FUSOS = {\n'
        + ''.join(f"  '{k}': [{a}, {b}],\n" for k, (a, b) in sorted(fusos.items()))
        + '};\n'
    )
    with open(os.path.join(RAIZ, 'src', 'sistema', 'js', 'fusos-dados.js'), 'w', encoding='utf-8') as f:
        f.write(texto)
    print(f'{len(fusos)} fusos (tz {versao})')


if __name__ == '__main__':
    main()
