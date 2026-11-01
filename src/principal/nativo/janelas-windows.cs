// A janela hospedeira vive neste processo, não no Electron. Ao sair, devolve o programa intacto.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

public static class RetroJanelas {
  [StructLayout(LayoutKind.Sequential)] struct RECT { public int L,T,R,B; }
  [StructLayout(LayoutKind.Sequential)] struct POINT { public int X,Y; }
  [StructLayout(LayoutKind.Sequential)] struct PLACEMENT { public int Length,Flags,Show; public POINT Min,Max; public RECT Normal; }
  delegate bool EnumProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr p);
  [DllImport("user32.dll")] static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder t, int n);
  [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint cmd);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool IsChild(IntPtr parent, IntPtr child);
  [DllImport("user32.dll", SetLastError=true)] static extern IntPtr SetParent(IntPtr h, IntPtr p);
  [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] static extern IntPtr GetLong(IntPtr h,int i);
  [DllImport("user32.dll", EntryPoint="SetWindowLongPtrW", SetLastError=true)] static extern IntPtr SetLong(IntPtr h,int i,IntPtr v);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h,out RECT r);
  [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr h,out RECT r);
  [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr h,ref POINT p);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int w,int a,uint flags);
  [DllImport("user32.dll")] static extern bool GetWindowPlacement(IntPtr h,ref PLACEMENT p);
  [DllImport("user32.dll")] static extern bool SetWindowPlacement(IntPtr h,ref PLACEMENT p);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h,int cmd);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr SetFocus(IntPtr h);
  [DllImport("user32.dll")] static extern bool PostMessage(IntPtr h,uint msg,IntPtr w,IntPtr l);
  [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr context);
  [DllImport("kernel32.dll")] static extern void SetLastError(uint e);
  public class Janela { public string id; public string titulo; }
  class Hospedeira:Form { protected override bool ShowWithoutActivation { get { return true; } } }
  class Item { public string Id; public IntPtr H,Parent,Style,Ex; public uint Pid; public long Inicio; public PLACEMENT Lugar; public Hospedeira Host; public bool Visivel; }
  static Dictionary<string,Item> itens = new Dictionary<string,Item>();
  static Control fila; static Thread thread; static IntPtr pai; static int processoPai; static System.Windows.Forms.Timer timer; static bool encerrando;
  static void UI(Action f) { if (fila.InvokeRequired) fila.Invoke(f); else f(); }
  static bool Valido(Item i) { uint p; GetWindowThreadProcessId(i.H,out p); try { return IsWindow(i.H) && p==i.Pid && Process.GetProcessById((int)p).StartTime.ToUniversalTime().Ticks==i.Inicio; } catch { return false; } }
  static Item Obter(string id) { Item i; if (!itens.TryGetValue(id,out i) || !Valido(i)) throw new Exception("sessao"); return i; }
  public static void Iniciar(long h,int pid) {
    if (IntPtr.Size!=8) throw new Exception("plataforma");
    pai=new IntPtr(h); processoPai=pid; uint p; GetWindowThreadProcessId(pai,out p); if (p!=pid || !IsWindow(pai)) throw new Exception("pai");
    try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch { }
    var pronta=new ManualResetEvent(false);
    thread=new Thread(()=> { fila=new Control(); var handle=fila.Handle; timer=new System.Windows.Forms.Timer(); timer.Interval=150; timer.Tick+=(s,e)=>Vigiar(); timer.Start(); pronta.Set(); Application.Run(); fila.Dispose(); });
    thread.SetApartmentState(ApartmentState.STA); thread.Start(); pronta.WaitOne();
  }
  public static Janela[] Listar(string arquivo) {
    var lista=new List<Janela>(); UI(()=> {
      EnumWindows((h,p)=> {
        try {
          if (!IsWindowVisible(h) || GetWindow(h,4)!=IntPtr.Zero || h==pai) return true;
          uint pid; GetWindowThreadProcessId(h,out pid); if (pid==processoPai || pid==Process.GetCurrentProcess().Id) return true;
          var processo=Process.GetProcessById((int)pid);
          if (!String.Equals(processo.MainModule.FileName,arquivo,StringComparison.OrdinalIgnoreCase)) return true;
          RECT r; GetWindowRect(h,out r); if (r.R-r.L<80 || r.B-r.T<40) return true;
          var texto=new StringBuilder(512); GetWindowText(h,texto,512); if (texto.Length==0) return true;
          Item item=null; foreach (var x in itens.Values) if (x.H==h && Valido(x)) { item=x; break; }
          if (item==null) { item=new Item { Id=Guid.NewGuid().ToString(),H=h,Pid=pid,Inicio=processo.StartTime.ToUniversalTime().Ticks }; itens.Add(item.Id,item); }
          lista.Add(new Janela { id=item.Id,titulo=texto.ToString() });
        } catch { } return lista.Count<50;
      },IntPtr.Zero);
    }); return lista.ToArray();
  }
  public static void Associar(string id) { UI(()=> {
    var i=Obter(id); if (i.Host!=null || GetParent(i.H)!=IntPtr.Zero) throw new Exception("incompativel");
    i.Parent=GetParent(i.H); i.Style=GetLong(i.H,-16); i.Ex=GetLong(i.H,-20); i.Lugar=new PLACEMENT(); i.Lugar.Length=Marshal.SizeOf(typeof(PLACEMENT)); if(!GetWindowPlacement(i.H,ref i.Lugar)) throw new Exception("incompativel");
    i.Host=new Hospedeira { FormBorderStyle=FormBorderStyle.None,ShowInTaskbar=false,StartPosition=FormStartPosition.Manual,BackColor=Color.Black };
    var host=i.Host.Handle;
    try {
      ShowWindow(i.H,0); SetLastError(0); SetParent(i.H,host); if(GetParent(i.H)!=host) throw new Exception("incompativel");
      SetLong(i.H,-16,new IntPtr((i.Style.ToInt64() & ~0x80CF0000L) | 0x40000000L));
      SetWindowPos(i.H,IntPtr.Zero,0,0,400,300,0x0034); ShowWindow(i.H,5);
    } catch { Restaurar(i); throw; }
  }); }
  public static void Posicionar(string id,double x,double y,double w,double h,double vw,double vh,bool visivel) { UI(()=> {
    var i=Obter(id); if(i.Host==null || vw<=0 || vh<=0) throw new Exception("sessao");
    RECT r; GetClientRect(pai,out r); var p=new POINT(); ClientToScreen(pai,ref p);
    double sx=(r.R-r.L)/vw, sy=(r.B-r.T)/vh; int ww=Math.Max(1,(int)Math.Round(w*sx)), hh=Math.Max(1,(int)Math.Round(h*sy));
    i.Visivel=visivel; SetWindowPos(i.Host.Handle,IntPtr.Zero,p.X+(int)Math.Round(x*sx),p.Y+(int)Math.Round(y*sy),ww,hh,0x0014);
    SetWindowPos(i.H,IntPtr.Zero,0,0,ww,hh,0x0034); Visibilidade(i);
  }); }
  static void Visibilidade(Item i) {
    if(i.Host==null) return; var f=GetForegroundWindow(); uint pid; GetWindowThreadProcessId(f,out pid);
    bool mostrar=i.Visivel && (f==pai || IsChild(pai,f) || f==i.Host.Handle || IsChild(i.Host.Handle,f) || pid==i.Pid);
    if(mostrar) { if(!i.Host.Visible) i.Host.Show(); SetWindowPos(i.Host.Handle,IntPtr.Zero,0,0,0,0,0x0013); } else if(i.Host.Visible) i.Host.Hide();
  }
  public static bool Aberta(string id) { bool aberta=false; UI(()=> { Item i; aberta=itens.TryGetValue(id,out i) && Valido(i); }); return aberta; }
  public static void Focar(string id) { UI(()=> { var i=Obter(id); if(i.Host!=null) { i.Visivel=true; i.Host.Show(); SetForegroundWindow(i.Host.Handle); } else ShowWindow(i.H,9); SetForegroundWindow(i.H); SetFocus(i.H); }); }
  public static void Esconder(string id) { UI(()=> { var i=Obter(id); i.Visivel=false; if(i.Host!=null) i.Host.Hide(); }); }
  public static void Ocultar() { UI(()=> { foreach(var i in itens.Values) { i.Visivel=false; if(i.Host!=null) i.Host.Hide(); } }); }
  public static void Fechar(string id) { UI(()=> { var i=Obter(id); Focar(id); PostMessage(i.H,0x0010,IntPtr.Zero,IntPtr.Zero); }); }
  static void Restaurar(Item i) {
    if(i.Host==null) return;
    if(Valido(i)) {
      ShowWindow(i.H,0); SetParent(i.H,i.Parent); if(GetParent(i.H)==i.Host.Handle) throw new Exception("restaurar");
      SetLong(i.H,-16,i.Style); SetLong(i.H,-20,i.Ex); SetWindowPos(i.H,IntPtr.Zero,0,0,0,0,0x0037); SetWindowPlacement(i.H,ref i.Lugar); ShowWindow(i.H,i.Lugar.Show==2?9:i.Lugar.Show);
    }
    i.Host.Dispose(); i.Host=null;
  }
  public static void Soltar(string id) { UI(()=> { Item i; if(itens.TryGetValue(id,out i)) { Restaurar(i); itens.Remove(id); } }); }
  static void Vigiar() {
    bool vivo=IsWindow(pai); try { vivo=vivo && !Process.GetProcessById(processoPai).HasExited; } catch { vivo=false; }
    foreach(var i in new List<Item>(itens.Values)) {
      try { if(!vivo || encerrando || !Valido(i)) { Restaurar(i); itens.Remove(i.Id); } else Visibilidade(i); } catch { }
    }
    if((!vivo || encerrando) && itens.Count==0) { timer.Stop(); Application.ExitThread(); }
  }
  public static void Encerrar() { encerrando=true; UI(()=>Vigiar()); thread.Join(); }
}
