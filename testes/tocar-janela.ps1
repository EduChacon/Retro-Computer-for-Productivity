# Entrada real somente na janela WinForms criada pelo teste, em coordenadas lidas do seu relatorio.
param([string]$Relatorio, [switch]$Mover)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class RetroEntradaTeste {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint x,uint y,uint dados,UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h,int x,int y,int w,int a,bool pintar);
}
'@
$r = Get-Content -Raw $Relatorio | ConvertFrom-Json
if ($Mover) {
  [RetroEntradaTeste]::MoveWindow([IntPtr][Convert]::ToInt64($r.hwnd,16), ($r.x + 100), ($r.y + 60), $r.w, $r.h, $true) | Out-Null
  exit 0
}
[RetroEntradaTeste]::SetCursorPos(($r.cx + 20), ($r.cy + 10)) | Out-Null
[RetroEntradaTeste]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
[RetroEntradaTeste]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
[System.Threading.Thread]::Sleep(100)
[System.Windows.Forms.SendKeys]::SendWait('^a')
[System.Windows.Forms.SendKeys]::SendWait('OK_RETRO')
