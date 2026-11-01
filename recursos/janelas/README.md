O auxiliar de Acessibilidade do Mac é compilado por `ferramentas/preparar-janelas.cjs`
na instalação das dependências e antes de empacotar. O executável é ignorado pelo
Git e incluído nos recursos do aplicativo. O fonte fica em
`src/principal/nativo/janelas-mac.swift`. No Windows os fontes C# e PowerShell
ficam fora do ASAR para o .NET do sistema carregá-los.
