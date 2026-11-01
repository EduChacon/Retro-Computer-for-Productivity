param([string]$Relatorio, [string]$Saida)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$r = Get-Content -Raw $Relatorio | ConvertFrom-Json
$imagem = New-Object System.Drawing.Bitmap ([int]$r.w),([int]$r.h)
$g = [System.Drawing.Graphics]::FromImage($imagem)
try {
  $g.CopyFromScreen([int]$r.sx,[int]$r.sy,0,0,$imagem.Size)
  $imagem.Save($Saida,[System.Drawing.Imaging.ImageFormat]::Png)
} finally { $g.Dispose(); $imagem.Dispose() }
