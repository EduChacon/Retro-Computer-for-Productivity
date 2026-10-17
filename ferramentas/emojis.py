#!/usr/bin/env python3
"""
Os emojis do painel (Logotipo+.): os desenhos do SerenityOS (BSD-2-Clause, Base/res/emoji) numa
folha só e a lista com os nomes e as palavras de busca em português, inglês e espanhol, dos dados
do Unicode CLDR pelo pacote emojibase-data (MIT).

    python3 -I ferramentas/emojis.py PASTA_DO_SERENITY PASTA_DO_EMOJIBASE

PASTA_DO_SERENITY é a raiz de um clone do SerenityOS (com Base/res/emoji); PASTA_DO_EMOJIBASE é a
pasta "package" do emojibase-data (npm pack emojibase-data). Grava src/sistema/emojis/emojis.png
(uma casa de 10 × 10 pontos por emoji, o desenho no meio) e src/sistema/js/emojis-dados.js.
Só entram os emojis que o SerenityOS desenha e que o Unicode tem (os de uso privado ficam de fora),
sem os tons de pele (as variações) e sem os componentes.
"""
import json
import os
import sys

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CASA = 10
COLUNAS = 32
MAX_PALAVRAS = 8


def chave(codigos):
    """Os pontos de código sem o seletor de variação (FE0F), que o SerenityOS não põe no nome."""
    return '-'.join(c.upper() for c in codigos if c.upper() != 'FE0F')


def uso_privado(codigos):
    for c in codigos:
        n = int(c, 16)
        if 0xE000 <= n <= 0xF8FF or n >= 0xF0000:
            return True
    return False


def ler_serenity(pasta):
    desenhos = {}
    for nome in os.listdir(pasta):
        if not nome.startswith('U+') or not nome.endswith('.png'):
            continue
        codigos = [p[2:] for p in nome[:-4].split('_')]
        if uso_privado(codigos):
            continue
        im = Image.open(os.path.join(pasta, nome)).convert('RGBA')
        if im.width > CASA or im.height > CASA:
            continue
        desenhos[chave(codigos)] = im
    return desenhos


def ler_idioma(pasta, idioma):
    with open(os.path.join(pasta, idioma, 'compact.json'), encoding='utf-8') as f:
        return {chave(e['hexcode'].split('-')): e for e in json.load(f)}


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    desenhos = ler_serenity(os.path.join(sys.argv[1], 'Base', 'res', 'emoji'))
    dados = {i: ler_idioma(sys.argv[2], i) for i in ('pt', 'en', 'es')}
    lista = []
    for k, e in dados['en'].items():
        # Os componentes (o grupo 2: os tons de pele, os cabelos) e os sem grupo ficam de fora.
        if k not in desenhos or e.get('group') in (None, 2) or 'order' not in e:
            continue
        rotulos = [dados[i].get(k, e).get('label', e['label']) for i in ('pt', 'en', 'es')]
        palavras = []
        for i in ('pt', 'en', 'es'):
            for p in (dados[i].get(k) or {}).get('tags', [])[:MAX_PALAVRAS]:
                p = p.lower()
                if p not in palavras:
                    palavras.append(p)
        lista.append((e['order'], e['unicode'], e['group'], rotulos, ' '.join(palavras), desenhos[k]))
    lista.sort(key=lambda x: x[0])

    linhas = (len(lista) + COLUNAS - 1) // COLUNAS
    folha = Image.new('RGBA', (COLUNAS * CASA, linhas * CASA), (0, 0, 0, 0))
    for i, (_, _, _, _, _, im) in enumerate(lista):
        x = (i % COLUNAS) * CASA + (CASA - im.width) // 2
        y = (i // COLUNAS) * CASA + (CASA - im.height) // 2
        folha.alpha_composite(im, (x, y))
    pasta = os.path.join(RAIZ, 'src', 'sistema', 'emojis')
    os.makedirs(pasta, exist_ok=True)
    folha.save(os.path.join(pasta, 'emojis.png'), optimize=True)

    itens = [[u, g, r[0], r[1], r[2], p] for (_, u, g, r, p, _) in lista]
    texto = (
        '// GERADO por ferramentas/emojis.py: os emojis do painel (os desenhos do SerenityOS, BSD-2-Clause,\n'
        '// em emojis/emojis.png, na mesma ordem; os nomes e as palavras do Unicode CLDR, pelo emojibase-data, MIT).\n'
        '// Cada item: [o caractere, o grupo, o nome em português, em inglês, em espanhol, as palavras de busca].\n'
        f'export const COLUNAS = {COLUNAS};\nexport const CASA = {CASA};\n'
        'export const EMOJIS = [\n'
        + ''.join('  ' + json.dumps(i, ensure_ascii=False) + ',\n' for i in itens)
        + '];\n'
    )
    with open(os.path.join(RAIZ, 'src', 'sistema', 'js', 'emojis-dados.js'), 'w', encoding='utf-8') as f:
        f.write(texto)
    print(f'{len(itens)} emojis; folha de {folha.width} × {folha.height}')


if __name__ == '__main__':
    main()
