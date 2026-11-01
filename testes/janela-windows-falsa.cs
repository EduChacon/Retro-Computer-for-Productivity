// Programa próprio para exercitar janelas reais no CI. Nenhum aplicativo pessoal é usado.
using System;
using System.IO;
using System.Text;
using System.Diagnostics;
using System.Windows.Forms;
using System.Runtime.InteropServices;
public class JanelaDeTeste {
  [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr h);
  [DllImport("user32.dll",EntryPoint="GetWindowLongPtrW")] static extern IntPtr GetLong(IntPtr h,int i);
  [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr c);
  [StructLayout(LayoutKind.Sequential)] struct RECT { public int X,Y,R,B; }
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h,out RECT r);
  [STAThread] public static void Main(string[] args) {
    SetProcessDpiAwarenessContext(new IntPtr(-4));
    var form=new Form { Text="Programa de teste do Retro",Left=90,Top=90,Width=640,Height=420,StartPosition=FormStartPosition.Manual };
    if(args.Length>1) form.Location=new System.Drawing.Point(300,230);
    var campo=new TextBox { Left=20,Top=25,Width=400,Text="Documento preservado" };
    form.Controls.Add(campo); int tentativas=0;
    form.FormClosing+=(s,e)=> { if(e.CloseReason==CloseReason.UserClosing) { tentativas++; e.Cancel=true; } };
    var timer=new System.Windows.Forms.Timer { Interval=80 };
    timer.Tick+=(s,e)=> { try {
      RECT r; GetWindowRect(form.Handle,out r);
      var ponto=campo.PointToScreen(System.Drawing.Point.Empty);
      string texto=campo.Text.Replace("\\","\\\\").Replace("\"","\\\"").Replace("\r","\\r").Replace("\n","\\n").Replace("\t","\\t");
      File.WriteAllText(args[0]+".tmp","{\"pid\":"+Process.GetCurrentProcess().Id+",\"hwnd\":\""+form.Handle.ToInt64().ToString("x")+"\",\"campo\":\""+campo.Handle.ToInt64().ToString("x")+"\",\"parent\":"+GetParent(form.Handle).ToInt64()+",\"style\":"+GetLong(form.Handle,-16).ToInt64()+",\"x\":"+form.Left+",\"y\":"+form.Top+",\"w\":"+form.Width+",\"h\":"+form.Height+",\"sx\":"+r.X+",\"sy\":"+r.Y+",\"cx\":"+ponto.X+",\"cy\":"+ponto.Y+",\"foco\":"+(campo.Focused?"true":"false")+",\"texto\":\""+texto+"\",\"fechamentos\":"+tentativas+"}",new UTF8Encoding(false));
      if(File.Exists(args[0])) File.Replace(args[0]+".tmp",args[0],null); else File.Move(args[0]+".tmp",args[0]);
    } catch { } };
    timer.Start(); Application.Run(form);
  }
}
