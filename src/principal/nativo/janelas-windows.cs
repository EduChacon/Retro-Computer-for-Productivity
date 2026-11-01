// A janela hospedeira vive neste processo, não no Electron. Ao sair, devolve o programa intacto.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

public static partial class RetroJanelas {
  [StructLayout(LayoutKind.Sequential)] struct RECT { public int L,T,R,B; }
  [StructLayout(LayoutKind.Sequential)] struct POINT { public int X,Y; }
  [StructLayout(LayoutKind.Sequential)] struct PLACEMENT { public int Length,Flags,Show; public POINT Min,Max; public RECT Normal; }
  delegate bool EnumProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr p);
  [DllImport("user32.dll")] static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder t, int n);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder t, int n);
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
  [DllImport("user32.dll")] static extern bool AttachThreadInput(uint a,uint b,bool ligar);
  [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] static extern bool PostMessage(IntPtr h,uint msg,IntPtr w,IntPtr l);
  [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr context);
  [DllImport("kernel32.dll")] static extern void SetLastError(uint e);
  [DllImport("advapi32.dll",SetLastError=true)] static extern bool OpenProcessToken(IntPtr h,uint acesso,out IntPtr token);
  [DllImport("advapi32.dll",SetLastError=true)] static extern bool GetTokenInformation(IntPtr token,int classe,out int valor,int tamanho,out int necessario);
  [ComImport,Guid("602D4995-B13A-429b-A66E-1935E44F4317"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface BarraDeTarefas {
    void HrInit(); void AddTab(IntPtr h); void DeleteTab(IntPtr h); void ActivateTab(IntPtr h); void SetActiveAlt(IntPtr h);
    void MarkFullscreenWindow(IntPtr h,[MarshalAs(UnmanagedType.Bool)] bool cheia);
  }
  public class Janela { public string id; public string titulo; }
  class Hospedeira:Form { protected override bool ShowWithoutActivation { get { return true; } } }
  class Item { public string Id; public IntPtr H,Parent,Style,Ex; public uint Pid; public long Inicio; public PLACEMENT Lugar; public Hospedeira Host; public bool Visivel,Cheia; public Rectangle Recorte; public double X,Y,W,Hh,Vw,Vh; }
  static Dictionary<string,Item> itens = new Dictionary<string,Item>();
  static readonly HashSet<string> classesDoSistema=new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Progman","WorkerW","Shell_TrayWnd","Shell_SecondaryTrayWnd","#32769" };
  static Control fila; static Thread thread; static IntPtr pai; static int processoPai; static System.Windows.Forms.Timer timer; static bool encerrando,elevouRetro;
  static BarraDeTarefas barra;
  static void UI(Action f) { if (fila.InvokeRequired) fila.Invoke(f); else f(); }
  static bool Valido(Item i) { uint p; GetWindowThreadProcessId(i.H,out p); try { return IsWindow(i.H) && p==i.Pid && Process.GetProcessById((int)p).StartTime.ToUniversalTime().Ticks==i.Inicio; } catch { return false; } }
  static Item Obter(string id) { Item i; if (!itens.TryGetValue(id,out i) || !Valido(i)) throw new Exception("sessao"); return i; }
  static bool JanelaDePrograma(IntPtr h) {
    if(!IsWindowVisible(h) || GetWindow(h,4)!=IntPtr.Zero || h==pai) return false;
    var classe=new StringBuilder(128); GetClassName(h,classe,128);
    // O Explorer também hospeda a mesa e a barra do Windows; elas nunca são um programa a incorporar.
    return !classesDoSistema.Contains(classe.ToString());
  }
  public static void Iniciar(long h,int pid) {
    if (IntPtr.Size!=8) throw new Exception("plataforma");
    pai=new IntPtr(h); processoPai=pid; uint p; GetWindowThreadProcessId(pai,out p); if (p!=pid || !IsWindow(pai)) throw new Exception("pai");
    try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch { }
    var pronta=new ManualResetEvent(false);
    thread=new Thread(()=> { fila=new Control(); var handle=fila.Handle;
      try { barra=(BarraDeTarefas)Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("56FDF344-FD6D-11d0-958A-006097C9A090"))); barra.HrInit(); } catch { barra=null; }
      timer=new System.Windows.Forms.Timer(); timer.Interval=50; timer.Tick+=(s,e)=>Vigiar(); timer.Start(); pronta.Set(); Application.Run();
      if(barra!=null) Marshal.ReleaseComObject(barra); fila.Dispose(); });
    thread.SetApartmentState(ApartmentState.STA); thread.Start(); pronta.WaitOne();
  }
  public static Janela[] Listar(string arquivo) {
    var lista=new List<Janela>(); UI(()=> {
      EnumWindows((h,p)=> {
        try {
          if (!JanelaDePrograma(h)) return true;
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
    if(Elevado(i.Pid) && !Elevado((uint)Process.GetCurrentProcess().Id)) throw new Exception("retro-elevado");
    i.Parent=GetParent(i.H); i.Style=GetLong(i.H,-16); i.Ex=GetLong(i.H,-20); i.Lugar=new PLACEMENT(); i.Lugar.Length=Marshal.SizeOf(typeof(PLACEMENT)); if(!GetWindowPlacement(i.H,ref i.Lugar)) throw new Exception("incompativel");
    i.Host=new Hospedeira { FormBorderStyle=FormBorderStyle.None,ShowInTaskbar=false,StartPosition=FormStartPosition.Manual,BackColor=Color.Black };
    var host=i.Host.Handle;
    try {
      ShowWindow(i.H,0); SetLong(i.H,-16,new IntPtr((i.Style.ToInt64() & ~0x80CF0000L) | 0x40000000L));
      SetLastError(0); SetParent(i.H,host); if(GetParent(i.H)!=host) throw new Exception("incompativel");
      SetWindowPos(i.H,IntPtr.Zero,0,0,400,300,0x0034); ShowWindow(i.H,5);
    } catch { Restaurar(i); throw; }
  }); }
  static bool Elevado(uint pid) {
    var processo=OpenProcess(0x1000,false,pid); if(processo==IntPtr.Zero) return false;
    IntPtr token=IntPtr.Zero;
    try { int valor,n; return OpenProcessToken(processo,8,out token) && GetTokenInformation(token,20,out valor,4,out n) && valor!=0; }
    finally { if(token!=IntPtr.Zero) CloseHandle(token); CloseHandle(processo); }
  }
  static void TelaCheia(Item i,bool mostrar) {
    RECT r; GetWindowRect(pai,out r); var tela=Screen.FromHandle(pai).Bounds;
    bool cheia=mostrar && !IsIconic(pai) && r.L<=tela.Left && r.T<=tela.Top && r.R>=tela.Right && r.B>=tela.Bottom;
    if(i.Cheia==cheia) return;
    // O hospedeiro representa o conteúdo do Retro em tela cheia. Não escondemos a barra globalmente,
    // nem tornamos o hospedeiro uma janela possuída: destruir o Retro deve preservar o aplicativo.
    try { if(barra!=null) { barra.MarkFullscreenWindow(i.Host.Handle,cheia); i.Cheia=cheia; } } catch { }
  }
  static void OrdemDoRetro() {
    bool usar=false;
    if(!encerrando && IsWindow(pai) && !IsIconic(pai)) {
      var f=GetForegroundWindow(); RECT r; GetWindowRect(pai,out r); var tela=Screen.FromHandle(pai).Bounds;
      bool cheia=r.L<=tela.Left && r.T<=tela.Top && r.R>=tela.Right && r.B>=tela.Bottom;
      if(cheia) foreach(var i in itens.Values) if(i.Host!=null && i.Visivel && Valido(i) && (f==pai || IsChild(pai,f) || f==i.Host.Handle || IsChild(i.Host.Handle,f))) { usar=true; break; }
    }
    // O Electron perde a precedência sobre a barra ao focar outro processo. A ordem só vale
    // durante esta integração em tela cheia; Alt+Tab, ocultar e devolver restauram o estado.
    bool jaNoTopo=IsWindow(pai) && (GetLong(pai,-20).ToInt64() & 8)!=0;
    if(usar) { if(SetWindowPos(pai,new IntPtr(-1),0,0,0,0,0x0013) && !jaNoTopo) elevouRetro=true; }
    if(!usar && elevouRetro) { if(IsWindow(pai)) SetWindowPos(pai,new IntPtr(-2),0,0,0,0,0x0013); elevouRetro=false; }
  }
  public static void Posicionar(string id,double x,double y,double w,double h,double vw,double vh,bool visivel) { UI(()=> {
    var i=Obter(id); if(i.Host==null || vw<=0 || vh<=0) throw new Exception("sessao");
    if(!visivel) { i.Visivel=false; TelaCheia(i,false); i.Host.Hide(); OrdemDoRetro(); return; }
    i.X=x; i.Y=y; i.W=w; i.Hh=h; i.Vw=vw; i.Vh=vh; i.Visivel=true; OrdemDoRetro(); Mover(i); Visibilidade(i);
  }); }
  static void Mover(Item i) {
    if(i.Host==null || !i.Visivel || i.Vw<=0 || i.Vh<=0) return;
    RECT r; GetClientRect(pai,out r); var p=new POINT(); ClientToScreen(pai,ref p);
    double sx=(r.R-r.L)/i.Vw, sy=(r.B-r.T)/i.Vh;
    int x=(int)Math.Round(i.X*sx), y=(int)Math.Round(i.Y*sy), w=Math.Max(1,(int)Math.Round(i.W*sx)), h=Math.Max(1,(int)Math.Round(i.Hh*sy));
    bool topo=(GetLong(pai,-20).ToInt64() & 8)!=0, hostNoTopo=(GetLong(i.Host.Handle,-20).ToInt64() & 8)!=0;
    // Mudar a ordem pelo Form.TopMost pode ativá-lo e roubar de volta o foco de outro programa.
    if(hostNoTopo!=topo) SetWindowPos(i.Host.Handle,new IntPtr(topo?-1:-2),0,0,0,0,0x0013);
    // O shell também verifica o tamanho da janela ativa. O HWND acompanha o Retro inteiro,
    // mas a região só deixa aparecer e receber cliques na área do aplicativo.
    var recorte=new Rectangle(x,y,w,h);
    if(i.Host.Region==null || i.Recorte!=recorte) {
      var anterior=i.Host.Region; i.Host.Region=new Region(recorte); i.Recorte=recorte;
      if(anterior!=null) anterior.Dispose();
    }
    RECT antes; GetWindowRect(i.Host.Handle,out antes);
    if(antes.L!=p.X || antes.T!=p.Y || antes.R-antes.L!=r.R-r.L || antes.B-antes.T!=r.B-r.T) SetWindowPos(i.Host.Handle,IntPtr.Zero,p.X,p.Y,r.R-r.L,r.B-r.T,0x0014);
    GetWindowRect(i.H,out antes);
    if(antes.L!=p.X+x || antes.T!=p.Y+y || antes.R-antes.L!=w || antes.B-antes.T!=h) SetWindowPos(i.H,IntPtr.Zero,x,y,w,h,0x0034);
  }
  static void Visibilidade(Item i) {
    if(i.Host==null) return; var f=GetForegroundWindow(); uint pid; GetWindowThreadProcessId(f,out pid);
    bool mostrar=i.Visivel && !IsIconic(pai) && (f==pai || IsChild(pai,f) || f==i.Host.Handle || IsChild(i.Host.Handle,f) || pid==i.Pid);
    TelaCheia(i,mostrar);
    if(mostrar) { if(!i.Host.Visible) i.Host.Show(); SetWindowPos(i.Host.Handle,IntPtr.Zero,0,0,0,0,0x0013); } else if(i.Host.Visible) i.Host.Hide();
  }
  public static bool Aberta(string id) { bool aberta=false; UI(()=> { Item i; aberta=itens.TryGetValue(id,out i) && Valido(i); }); return aberta; }
  public static bool Embutida(string id) { bool embutida=false; UI(()=> { Item i; embutida=itens.TryGetValue(id,out i) && Valido(i) && i.Host!=null && GetParent(i.H)==i.Host.Handle; }); return embutida; }
  public static bool Visivel(string id) { bool v=false; UI(()=> { Item i; v=itens.TryGetValue(id,out i) && Valido(i) && i.Host!=null && IsWindowVisible(i.Host.Handle); }); return v; }
  public static void Focar(string id) { UI(()=> {
    var i=Obter(id); uint p; uint atual=GetCurrentThreadId(), destino=GetWindowThreadProcessId(i.H,out p), frente=GetWindowThreadProcessId(GetForegroundWindow(),out p);
    // SetParent já liga as filas do hospedeiro e do programa; não desfazer essa ligação implícita.
    bool b=frente!=atual && frente!=destino && AttachThreadInput(atual,frente,true);
    try { if(i.Host!=null) { i.Visivel=true; OrdemDoRetro(); Mover(i); TelaCheia(i,true); i.Host.Show(); SetForegroundWindow(i.Host.Handle); OrdemDoRetro(); Mover(i); } else { ShowWindow(i.H,9); SetForegroundWindow(i.H); } SetFocus(i.H); }
    finally { if(b) AttachThreadInput(atual,frente,false); }
  }); }
  public static void Esconder(string id) { UI(()=> { var i=Obter(id); i.Visivel=false; if(i.Host!=null) { TelaCheia(i,false); i.Host.Hide(); } OrdemDoRetro(); }); }
  public static void Ocultar() { UI(()=> { foreach(var i in itens.Values) { i.Visivel=false; if(i.Host!=null) { TelaCheia(i,false); i.Host.Hide(); } } OrdemDoRetro(); }); }
  public static void Fechar(string id) { UI(()=> {
    var i=Obter(id);
    // O fechamento volta ao contexto original, inclusive os avisos de salvar do aplicativo.
    Restaurar(i); Focar(id); PostMessage(i.H,0x0112,new IntPtr(0xF060),IntPtr.Zero);
  }); }
  static void Restaurar(Item i) {
    if(i.Host==null) return;
    TelaCheia(i,false);
    if(Valido(i)) {
      ShowWindow(i.H,0); SetParent(i.H,i.Parent); if(GetParent(i.H)==i.Host.Handle) throw new Exception("restaurar");
      SetLong(i.H,-16,i.Style); SetLong(i.H,-20,i.Ex); SetWindowPos(i.H,IntPtr.Zero,0,0,0,0,0x0037); SetWindowPlacement(i.H,ref i.Lugar); ShowWindow(i.H,i.Lugar.Show==2?9:i.Lugar.Show);
    }
    i.Host.Dispose(); i.Host=null; OrdemDoRetro();
  }
  public static void Soltar(string id) { UI(()=> { Item i; if(itens.TryGetValue(id,out i)) { Restaurar(i); itens.Remove(id); } }); }
  static void Vigiar() {
    uint pidPai; GetWindowThreadProcessId(pai,out pidPai);
    bool vivo=IsWindow(pai) && pidPai==processoPai; try { vivo=vivo && !Process.GetProcessById(processoPai).HasExited; } catch { vivo=false; }
    OrdemDoRetro();
    foreach(var i in new List<Item>(itens.Values)) {
      try { if(!vivo || encerrando || !Valido(i)) { Restaurar(i); itens.Remove(i.Id); } else { Mover(i); Visibilidade(i); } } catch { }
    }
    if((!vivo || encerrando) && itens.Count==0) { timer.Stop(); Application.ExitThread(); }
  }
  public static void Encerrar() { encerrando=true; UI(()=>Vigiar()); thread.Join(); }
}
