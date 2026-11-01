# Entrada real somente na janela WinForms criada pelo teste, em coordenadas lidas do seu relatorio.
param([string]$Relatorio)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class RetroEntradaTeste {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint x,uint y,uint dados,UIntPtr extra);
}
'@
$r = Get-Content -Raw $Relatorio | ConvertFrom-Json
[RetroEntradaTeste]::SetCursorPos(($r.sx + 40), ($r.sy + 35)) | Out-Null
[RetroEntradaTeste]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
[RetroEntradaTeste]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
[System.Threading.Thread]::Sleep(100)
[System.Windows.Forms.SendKeys]::SendWait('^a')
[System.Windows.Forms.SendKeys]::SendWait('OK_RETRO')
