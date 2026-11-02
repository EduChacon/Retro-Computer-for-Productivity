# Confere a janela física e a barra do Retro; não altera janelas nem a barra global do Windows.
param([string]$Dados)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class RetroConferencia {
  [StructLayout(LayoutKind.Sequential)] public struct Ponto { public int X,Y; }
  [StructLayout(LayoutKind.Sequential)] public struct Ret { public int L,T,R,B; }
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h,out Ret r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h,ref Ponto p);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(Ponto p);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr h,uint flags);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder s,int n);
}
'@
$d = Get-Content -Raw $Dados | ConvertFrom-Json
$pai = [IntPtr][Convert]::ToInt64($d.pai,16)
$r = New-Object RetroConferencia+Ret
[RetroConferencia]::GetClientRect($pai,[ref]$r) | Out-Null
$origem = New-Object RetroConferencia+Ponto
[RetroConferencia]::ClientToScreen($pai,[ref]$origem) | Out-Null
$p = New-Object RetroConferencia+Ponto
$p.X = $origem.X + [int](($d.ret.x + $d.ret.w / 2) * ($r.R - $r.L) / $d.viewport.w)
$p.Y = $origem.Y + [int](($d.ret.y + $d.ret.h / 2) * ($r.B - $r.T) / $d.viewport.h)
$alvo = [RetroConferencia]::GetAncestor([RetroConferencia]::WindowFromPoint($p),2)
if ($alvo -eq $pai -or $alvo -eq [IntPtr]::Zero) { throw 'O aplicativo integrado ficou encoberto ou invisivel.' }
$p.X = $origem.X + [int]($d.barra.x * ($r.R - $r.L) / $d.viewport.w)
$p.Y = $origem.Y + [int]($d.barra.y * ($r.B - $r.T) / $d.viewport.h)
$barra = [RetroConferencia]::GetAncestor([RetroConferencia]::WindowFromPoint($p),2)
if ($barra -ne $pai) {
  $classe = New-Object System.Text.StringBuilder 128
  [RetroConferencia]::GetClassName($barra,$classe,128) | Out-Null
  throw ('A barra do Retro esta coberta: ' + $classe.ToString() + ' em ' + $p.X + ',' + $p.Y)
}
Write-Output 'Aplicativo visivel e barra do Retro acessivel.'
