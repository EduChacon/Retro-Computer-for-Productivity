// ShellExecute respeita o atalho original; o processo que cria a janela pode ser um descendente.
using System;
using System.IO;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

public static partial class RetroJanelas {
  [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct EXECUTAR {
    public int Tamanho; public uint Mascara; public IntPtr Dono;
    [MarshalAs(UnmanagedType.LPWStr)] public string Verbo,Arquivo,Parametros,Pasta;
    public int Mostrar; public IntPtr Instancia,Lista;
    [MarshalAs(UnmanagedType.LPWStr)] public string Classe;
    public IntPtr Chave; public uint Atalho; public IntPtr Icone,Processo;
  }
  [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct PROCESSO {
    public uint Tamanho,Usos,Id; public IntPtr Heap; public uint Modulo,Threads,Pai; public int Prioridade; public uint Flags;
    [MarshalAs(UnmanagedType.ByValTStr,SizeConst=260)] public string Arquivo;
  }
  [DllImport("shell32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool ShellExecuteEx(ref EXECUTAR e);
  [DllImport("kernel32.dll")] static extern uint GetProcessId(IntPtr h);
  [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(uint acesso,bool herdar,uint pid);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern bool QueryFullProcessImageName(IntPtr h,uint flags,StringBuilder s,ref uint tamanho);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
  [DllImport("kernel32.dll")] static extern IntPtr CreateToolhelp32Snapshot(uint flags,uint pid);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern bool Process32First(IntPtr h,ref PROCESSO p);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern bool Process32Next(IntPtr h,ref PROCESSO p);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern int GetApplicationUserModelId(IntPtr h,ref uint tamanho,StringBuilder id);
  [StructLayout(LayoutKind.Sequential)] struct CHAVE { public Guid Formato; public uint Id; }
  [StructLayout(LayoutKind.Explicit,Size=24)] struct VALOR { [FieldOffset(0)] public ushort Tipo; [FieldOffset(8)] public IntPtr Texto; }
  [ComImport,Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface Propriedades {
    [PreserveSig] int GetCount(out uint n); [PreserveSig] int GetAt(uint i,out CHAVE k); [PreserveSig] int GetValue(ref CHAVE k,out VALOR v); [PreserveSig] int SetValue(ref CHAVE k,ref VALOR v); [PreserveSig] int Commit();
  }
  [DllImport("shell32.dll",PreserveSig=true)] static extern int SHGetPropertyStoreForWindow(IntPtr h,ref Guid iid,out Propriedades p);
  [DllImport("ole32.dll")] static extern int PropVariantClear(ref VALOR v);
  class Abertura { public string Id,Arquivo,AppId,Esperado; public IntPtr Handle; public DateTime Desde; public HashSet<uint> Familia=new HashSet<uint>(); public List<IntPtr> Descendentes=new List<IntPtr>(); }
  static Dictionary<string,Abertura> aberturas=new Dictionary<string,Abertura>();
  static string Imagem(uint pid) {
    var h=OpenProcess(0x1000,false,pid); if(h==IntPtr.Zero) return null;
    try { var b=new StringBuilder(32768); uint n=(uint)b.Capacity; return QueryFullProcessImageName(h,0,b,ref n)?b.ToString():null; } finally { CloseHandle(h); }
  }
  static string AppIdDaJanela(IntPtr h,uint pid) {
    Propriedades p=null;
    try {
      Guid iid=typeof(Propriedades).GUID; var k=new CHAVE { Formato=new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"),Id=5 };
      if(SHGetPropertyStoreForWindow(h,ref iid,out p)==0 && p!=null) {
        VALOR v; if(p.GetValue(ref k,out v)==0) { try { if(v.Tipo==31 && v.Texto!=IntPtr.Zero) { string texto=Marshal.PtrToStringUni(v.Texto); if(!String.IsNullOrEmpty(texto)) return texto; } } finally { PropVariantClear(ref v); } }
      }
    } catch { } finally { if(p!=null) Marshal.ReleaseComObject(p); }
    var processo=OpenProcess(0x1000,false,pid); if(processo==IntPtr.Zero) return null;
    try { uint n=0; GetApplicationUserModelId(processo,ref n,null); if(n==0 || n>2048) return null; var b=new StringBuilder((int)n); return GetApplicationUserModelId(processo,ref n,b)==0?b.ToString():null; } finally { CloseHandle(processo); }
  }
  public static string AbrirPrograma(string atalho,string arquivo,string appId,string esperado) {
    if(String.IsNullOrEmpty(atalho) || !Path.IsPathRooted(atalho) || !File.Exists(atalho)) throw new Exception("programa");
    var a=new Abertura { Id=Guid.NewGuid().ToString(),Arquivo=String.IsNullOrEmpty(arquivo)?null:Path.GetFullPath(arquivo),AppId=appId,Esperado=String.IsNullOrEmpty(esperado)?null:Path.GetFileName(esperado),Desde=DateTime.UtcNow.AddSeconds(-1) };
    var e=new EXECUTAR { Tamanho=Marshal.SizeOf(typeof(EXECUTAR)),Mascara=0x40|0x100,Verbo="open",Arquivo=atalho,Mostrar=1 };
    if(!ShellExecuteEx(ref e)) throw new Exception("abrir");
    a.Handle=e.Processo;
    uint pid=GetProcessId(a.Handle); string imagem=Imagem(pid), nome=Path.GetFileName(imagem ?? "");
    // Um intermediário genérico não autoriza capturar todas as janelas que ele já possui.
    if(pid!=0 && !String.IsNullOrEmpty(imagem) && !String.Equals(nome,"explorer.exe",StringComparison.OrdinalIgnoreCase) && !String.Equals(nome,"ApplicationFrameHost.exe",StringComparison.OrdinalIgnoreCase)) a.Familia.Add(pid);
    UI(()=> { aberturas.Add(a.Id,a); }); return a.Id;
  }
  static void Descendentes(Abertura a) {
    if(a.Familia.Count==0) return;
    var h=CreateToolhelp32Snapshot(2,0); if(h==new IntPtr(-1)) return;
    var lista=new List<PROCESSO>();
    try { var p=new PROCESSO { Tamanho=(uint)Marshal.SizeOf(typeof(PROCESSO)) }; if(Process32First(h,ref p)) do { lista.Add(p); } while(Process32Next(h,ref p)); } finally { CloseHandle(h); }
    bool mudou;
    do { mudou=false; foreach(var p in lista) if(!a.Familia.Contains(p.Id) && a.Familia.Contains(p.Pai)) {
      IntPtr processo=OpenProcess(0x1000,false,p.Id); if(processo==IntPtr.Zero) continue;
      try { if(Process.GetProcessById((int)p.Id).StartTime.ToUniversalTime()>=a.Desde) { a.Familia.Add(p.Id); a.Descendentes.Add(processo); processo=IntPtr.Zero; mudou=true; } } catch { }
      finally { if(processo!=IntPtr.Zero) CloseHandle(processo); }
    } } while(mudou);
  }
  public static Janela[] ListarAbertura(string id) {
    var lista=new List<Janela>(); var relacionadas=new List<Janela>(); UI(()=> {
      Abertura a; if(!aberturas.TryGetValue(id,out a)) throw new Exception("sessao"); Descendentes(a);
      EnumWindows((h,p)=> {
        try {
          if(!JanelaDePrograma(h)) return true;
          uint pid; GetWindowThreadProcessId(h,out pid); if(pid==processoPai || pid==Process.GetCurrentProcess().Id) return true;
          bool relacionada=a.Familia.Contains(pid);
          string imagem=null;
          if(!String.IsNullOrEmpty(a.Esperado)) {
            imagem=Imagem(pid); if(!String.Equals(Path.GetFileName(imagem ?? ""),a.Esperado,StringComparison.OrdinalIgnoreCase)) return true;
          }
          bool coincide=relacionada || (String.IsNullOrEmpty(a.Esperado) && !String.IsNullOrEmpty(a.Arquivo) && String.Equals(imagem ?? Imagem(pid),a.Arquivo,StringComparison.OrdinalIgnoreCase));
          if(!coincide && !String.IsNullOrEmpty(a.Esperado) && !String.IsNullOrEmpty(a.Arquivo)) coincide=(imagem ?? "").StartsWith(Path.GetDirectoryName(a.Arquivo)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase);
          if(!coincide && !String.IsNullOrEmpty(a.AppId)) coincide=String.Equals(AppIdDaJanela(h,pid),a.AppId,StringComparison.OrdinalIgnoreCase);
          if(!coincide) return true;
          RECT r; GetWindowRect(h,out r); if(r.R-r.L<80 || r.B-r.T<40) return true;
          var texto=new StringBuilder(512); GetWindowText(h,texto,512); if(texto.Length==0) return true;
          Item item=null; foreach(var x in itens.Values) if(x.H==h && Valido(x)) { item=x; break; }
          if(item==null) { var processo=Process.GetProcessById((int)pid); item=new Item { Id=Guid.NewGuid().ToString(),H=h,Pid=pid,Inicio=processo.StartTime.ToUniversalTime().Ticks }; itens.Add(item.Id,item); }
          var janela=new Janela { id=item.Id,titulo=texto.ToString() };
          if(relacionada) relacionadas.Add(janela); else if(lista.Count<50) lista.Add(janela);
        } catch { } return relacionadas.Count<50;
      },IntPtr.Zero);
    }); return relacionadas.Count>0?relacionadas.ToArray():lista.ToArray();
  }
  static void Liberar(Abertura a) { if(a.Handle!=IntPtr.Zero) CloseHandle(a.Handle); foreach(var h in a.Descendentes) CloseHandle(h); }
  public static void LiberarAbertura(string id) { UI(()=> { Abertura a; if(aberturas.TryGetValue(id,out a)) { Liberar(a); aberturas.Remove(id); } }); }
  public static void LiberarAberturas() { foreach(var a in aberturas.Values) Liberar(a); aberturas.Clear(); }
}
