#!/usr/bin/env python3
"""
Os emojis do Retro Computer: a fonte Noto Color Emoji (do Google, SIL Open Font License 1.1), nas
fatias COLRv1 que o Google Fonts entrega ao Chromium, e a lista do painel (Logotipo+.) com os nomes
e as palavras de busca em português, inglês e espanhol, dos dados do Unicode CLDR pelo pacote
emojibase-data (MIT).

    python3 -I ferramentas/emojis.py PASTA_DA_FONTE PASTA_DO_EMOJIBASE

PASTA_DA_FONTE tem o noto.css e as fatias, baixados assim (o Google Fonts escolhe o formato pelo
navegador; o do Chrome é o COLRv1, que o Chromium desenha):

    curl -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" \\
      "https://fonts.googleapis.com/css2?family=Noto+Color+Emoji" -o noto.css
    grep -o "https://fonts.gstatic.com[^)]*" noto.css | xargs -n1 curl -sSO

PASTA_DO_EMOJIBASE é a pasta "package" do emojibase-data (npm pack emojibase-data). Grava as fatias,
sem modificação, em src/sistema/fontes/emoji/, as regras @font-face no bloco "emojis" do estilo.css
e a lista em src/sistema/js/emojis-dados.js: só os emojis que a fonte desenha, sem os tons de pele
(as variações) e sem os componentes.
"""
import json
import os
import re
import shutil
import sys

from fontTools.ttLib import TTFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_PALAVRAS = 8
FAMILIA = 'Retro Emoji'
INICIO = '/* emojis: início (gerado por ferramentas/emojis.py) */'
FIM = '/* emojis: fim */'


def chave(codigos):
    """Os pontos de código sem o seletor de variação (FE0F)."""
    return '-'.join(c.upper() for c in codigos if c.upper() != 'FE0F')


def ler_fatias(pasta):
    """As fatias do noto.css, na ordem: (o arquivo, a faixa do unicode-range, a fonte aberta)."""
    with open(os.path.join(pasta, 'noto.css'), encoding='utf-8') as f:
        css = f.read()
    fatias = []
    for url, faixa in re.findall(r"src: url\(([^)]+)\) format\('woff2'\);\s*unicode-range: ([^;]+);", css):
        arquivo = os.path.join(pasta, os.path.basename(url))
        fonte = TTFont(arquivo)
        if 'COLR' not in fonte or fonte['COLR'].version != 1:
            sys.exit(f'{os.path.basename(url)} não é COLRv1 (baixe o noto.css com o navegador Chrome)')
        fatias.append((arquivo, re.sub(r'\s+', '', faixa), fonte))
    if not fatias:
        sys.exit('o noto.css não tem as fatias')
    return fatias


def ligaduras(fonte):
    """As sequências de glifos que viram um glifo só (as do GSUB: as famílias, as bandeiras, os tons)."""
    seqs = set()
    for lookup in fonte['GSUB'].table.LookupList.Lookup:
        for sub in lookup.SubTable:
            if lookup.LookupType == 7:
                sub = sub.ExtSubTable
            if getattr(sub, 'LookupType', lookup.LookupType) != 4:
                continue
            for primeiro, ligs in sub.ligatures.items():
                for lig in ligs:
                    seqs.add((primeiro, *lig.Component))
    return seqs


def desenha(fatias, codigos):
    """A fonte desenha o emoji? Um ponto de código pelo cmap; uma sequência, por uma ligadura (com ou sem o FE0F)."""
    pontos = [int(c, 16) for c in codigos]
    sem_fe0f = [p for p in pontos if p != 0xFE0F]
    for _, _, fonte, cmap, ligs in fatias:
        if len(sem_fe0f) == 1:
            if sem_fe0f[0] in cmap:
                return True
            continue
        for seq in (pontos, sem_fe0f):
            if all(p in cmap for p in seq) and tuple(cmap[p] for p in seq) in ligs:
                return True
    return False


def ler_idioma(pasta, idioma):
    with open(os.path.join(pasta, idioma, 'compact.json'), encoding='utf-8') as f:
        return {chave(e['hexcode'].split('-')): e for e in json.load(f)}


def gravar_css(fatias):
    regras = [INICIO]
    for i, (_, faixa, *_resto) in enumerate(fatias):
        regras.append(f"@font-face {{ font-family: '{FAMILIA}'; src: url('fontes/emoji/emoji-{i}.woff2') format('woff2'); "
                      f'font-display: swap; unicode-range: {faixa}; }}')
    regras.append(FIM)
    arq = os.path.join(RAIZ, 'src', 'sistema', 'estilo.css')
    with open(arq, encoding='utf-8') as f:
        css = f.read()
    a, b = css.find(INICIO), css.find(FIM)
    if a < 0 or b < a:
        sys.exit('o estilo.css não tem as marcas do bloco "emojis"')
    css = css[:a] + '\n'.join(regras) + css[b + len(FIM):]
    with open(arq, 'w', encoding='utf-8') as f:
        f.write(css)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    fatias = [(a, faixa, f, f.getBestCmap(), ligaduras(f)) for a, faixa, f in ler_fatias(sys.argv[1])]
    destino = os.path.join(RAIZ, 'src', 'sistema', 'fontes', 'emoji')
    os.makedirs(destino, exist_ok=True)
    for i, (arquivo, *_resto) in enumerate(fatias):
        shutil.copyfile(arquivo, os.path.join(destino, f'emoji-{i}.woff2'))
    gravar_css(fatias)

    dados = {i: ler_idioma(sys.argv[2], i) for i in ('pt', 'en', 'es')}
    lista = []
    fora = []
    for k, e in dados['en'].items():
        # Os componentes (o grupo 2: os tons de pele, os cabelos) e os sem grupo ficam de fora.
        if e.get('group') in (None, 2) or 'order' not in e:
            continue
        if not desenha(fatias, e['hexcode'].split('-')):
            fora.append(e['hexcode'])
            continue
        rotulos = [dados[i].get(k, e).get('label', e['label']) for i in ('pt', 'en', 'es')]
        palavras = []
        for i in ('pt', 'en', 'es'):
            for p in (dados[i].get(k) or {}).get('tags', [])[:MAX_PALAVRAS]:
                p = p.lower()
                if p not in palavras:
                    palavras.append(p)
        lista.append((e['order'], e['unicode'], e['group'], rotulos, ' '.join(palavras)))
    lista.sort(key=lambda x: x[0])

    itens = [[u, g, r[0], r[1], r[2], p] for (_, u, g, r, p) in lista]
    versao = fatias[0][2]['name'].getDebugName(5).split(';')[0]
    texto = (
        '// GERADO por ferramentas/emojis.py: os emojis do painel (desenhados pela fonte Noto Color Emoji,\n'
        f'// {versao}, SIL OFL 1.1, em fontes/emoji/; os nomes e as palavras do Unicode CLDR, pelo emojibase-data, MIT).\n'
        '// Cada item: [o caractere, o grupo, o nome em português, em inglês, em espanhol, as palavras de busca].\n'
        f"export const FONTE = '{FAMILIA}';\n"
        'export const EMOJIS = [\n'
        + ''.join('  ' + json.dumps(i, ensure_ascii=False) + ',\n' for i in itens)
        + '];\n'
    )
    with open(os.path.join(RAIZ, 'src', 'sistema', 'js', 'emojis-dados.js'), 'w', encoding='utf-8') as f:
        f.write(texto)
    tam = sum(os.path.getsize(os.path.join(destino, n)) for n in os.listdir(destino) if n.endswith('.woff2'))
    print(f'{len(itens)} emojis ({len(fora)} que a fonte não desenha: {" ".join(fora[:10])}); {len(fatias)} fatias, {tam // 1024} KiB')


if __name__ == '__main__':
    main()
