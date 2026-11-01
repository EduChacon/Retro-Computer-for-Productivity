# Atalho próprio do teste: os dados são lidos como JSON, nunca executados como comandos.
param([string]$Especificacao)
$ErrorActionPreference = 'Stop'
$e = Get-Content -Raw -Encoding UTF8 $Especificacao | ConvertFrom-Json
$shell = New-Object -ComObject WScript.Shell
$s = $shell.CreateShortcut($e.atalho)
$s.TargetPath = $e.arquivo
$s.Arguments = $e.argumentos
$s.Save()
$l = $shell.CreateShortcut($e.atalho)
@{ target = $l.TargetPath; args = $l.Arguments } | ConvertTo-Json -Compress
