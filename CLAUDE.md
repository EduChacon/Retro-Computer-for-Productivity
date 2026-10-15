# CLAUDE.md — Retro Computer

O guia completo para agentes está em [AGENTS.md](AGENTS.md) (estrutura, como rodar, testar e compilar, regras e preferências do dono). Ele é importado aqui:

@AGENTS.md

Em resumo, as regras que mais pesam:
- Código, comentários, commits e documentação em português do Brasil, com acentos; a interface também em inglês e espanhol (todo texto por `tr()`, com tradução em `src/sistema/idiomas/`); o `README.md` e as notas dos lançamentos em inglês.
- Nada da Microsoft nem da Apple (ícones, fontes, sons): só SerenityOS (BSD-2) ou desenhos próprios, com crédito em ATRIBUICOES.md.
- Os Craft vêm do lançamento oficial na hora da instalação; não entram no repositório.
- O disco nunca apaga sem pedido do usuário (Lixeira e versões).
- Não apagar arquivos do repositório: o que sair vai para `_to_delete/`.
- Olhar as capturas (`testes/capturas.mjs`) antes de dar por pronto.
