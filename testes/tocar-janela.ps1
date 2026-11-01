# Entrada real somente na janela WinForms criada pelo teste, em coordenadas lidas do seu relatorio.
param([string]$Relatorio, [switch]$Mover, [string]$Texto = 'OK_RETRO')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class RetroEntradaTeste {
  [StructLayout(LayoutKind.Sequential)] public struct Ponto { public int X,Y; }
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(Ponto p);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
  [DllImport("user32.dll")] static extern bool AttachThreadInput(uint a,uint b,bool v);
  [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
  public static void Focar(IntPtr h) {
    uint pid, atual=GetCurrentThreadId(), frente=GetWindowThreadProcessId(GetForegroundWindow(),out pid), alvo=GetWindowThreadProcessId(h,out pid);
    bool a=atual!=frente && AttachThreadInput(atual,frente,true), b=atual!=alvo && frente!=alvo && AttachThreadInput(atual,alvo,true);
    try { SetForegroundWindow(h); } finally { if(b)AttachThreadInput(atual,alvo,false); if(a)AttachThreadInput(atual,frente,false); }
  }
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
$raiz = if ($r.parent) { [IntPtr]$r.parent } else { [IntPtr][Convert]::ToInt64($r.hwnd,16) }
[RetroEntradaTeste]::Focar($raiz)
[System.Threading.Thread]::Sleep(150)
if (-not [RetroEntradaTeste]::SetCursorPos(($r.cx + 20), ($r.cy + 10))) { throw 'O desktop do teste recusou o ponteiro.' }
$ponto = New-Object RetroEntradaTeste+Ponto
$ponto.X = $r.cx + 20; $ponto.Y = $r.cy + 10
if ([RetroEntradaTeste]::WindowFromPoint($ponto).ToInt64() -ne [Convert]::ToInt64($r.campo,16)) { throw 'O controle de teste esta coberto por outra janela.' }
[RetroEntradaTeste]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
[RetroEntradaTeste]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
[System.Threading.Thread]::Sleep(100)
[System.Windows.Forms.SendKeys]::SendWait($Texto)
