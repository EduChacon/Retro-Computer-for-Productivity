param([string]$Pai, [int]$ProcessoPai)
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -Path @((Join-Path $PSScriptRoot 'janelas-windows.cs'), (Join-Path $PSScriptRoot 'janelas-windows-abertura.cs')) -ReferencedAssemblies System.Windows.Forms,System.Drawing,System.Core
[RetroJanelas]::Iniciar([Convert]::ToInt64($Pai, 16), $ProcessoPai)
try {
  while ($null -ne ($linha = [Console]::ReadLine())) {
    $r = $null
    try {
      if ($linha.Length -gt 65536) { throw 'programa' }
      $r = $linha | ConvertFrom-Json
      $dados = switch ($r.acao) {
        'estado' { @{ permitido = $true } }
        'listar' { ,@([RetroJanelas]::Listar([string]$r.arquivo)) }
        'abrirPrograma' { @{ abertura = [RetroJanelas]::AbrirPrograma([string]$r.atalho, [string]$r.arquivo, [string]$r.appId, [string]$r.processoEsperado) } }
        'listarAbertura' { ,@([RetroJanelas]::ListarAbertura([string]$r.abertura)) }
        'liberarAbertura' { [RetroJanelas]::LiberarAbertura([string]$r.abertura); @{ ok = $true } }
        'ocultar' { [RetroJanelas]::Ocultar(); @{ ok = $true } }
        'associar' { [RetroJanelas]::Associar([string]$r.janela); [RetroJanelas]::Posicionar([string]$r.janela, $r.ret.x, $r.ret.y, $r.ret.w, $r.ret.h, $r.viewport.w, $r.viewport.h, $r.visivel); @{ ok = $true } }
        'posicionar' { [RetroJanelas]::Posicionar([string]$r.janela, $r.ret.x, $r.ret.y, $r.ret.w, $r.ret.h, $r.viewport.w, $r.viewport.h, $r.visivel); @{ ok = $true } }
        'consultar' { @{ aberta = [RetroJanelas]::Aberta([string]$r.janela); embutida = [RetroJanelas]::Embutida([string]$r.janela) } }
        'soltar' { [RetroJanelas]::Soltar([string]$r.janela); @{ ok = $true } }
        'focar' { [RetroJanelas]::Focar([string]$r.janela); @{ ok = $true } }
        'minimizar' { [RetroJanelas]::Esconder([string]$r.janela); @{ ok = $true } }
        'fechar' { [RetroJanelas]::Fechar([string]$r.janela); @{ ok = $true } }
        default { throw 'programa' }
      }
      [Console]::WriteLine((@{ id = $r.id; dados = $dados } | ConvertTo-Json -Depth 8 -Compress))
    } catch {
      # Nunca repassa mensagens do SO, caminhos ou dados de outros processos à página.
      $codigo = if ($r.acao -eq 'soltar') { 'restaurar' } elseif ($r.acao -eq 'associar') { 'incompativel' } else { 'sessao' }
      [Console]::WriteLine((@{ id = $r.id; erro = $codigo } | ConvertTo-Json -Compress))
    }
  }
} finally { [RetroJanelas]::Encerrar(); [RetroJanelas]::LiberarAberturas() }
