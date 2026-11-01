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
  [STAThread] public static void Main(string[] args) {
    SetProcessDpiAwarenessContext(new IntPtr(-4));
    var form=new Form { Text="Programa de teste do Retro",Left=90,Top=90,Width=640,Height=420,StartPosition=FormStartPosition.Manual };
    var campo=new TextBox { Left=20,Top=25,Width=400,Text="Documento preservado" };
    form.Controls.Add(campo); int tentativas=0;
    form.FormClosing+=(s,e)=> { if(e.CloseReason==CloseReason.UserClosing) { tentativas++; e.Cancel=true; } };
    var timer=new System.Windows.Forms.Timer { Interval=80 };
    timer.Tick+=(s,e)=> { try { File.WriteAllText(args[0],"{\"pid\":"+Process.GetCurrentProcess().Id+",\"hwnd\":\""+form.Handle.ToInt64().ToString("x")+"\",\"parent\":"+GetParent(form.Handle).ToInt64()+",\"style\":"+GetLong(form.Handle,-16).ToInt64()+",\"x\":"+form.Left+",\"y\":"+form.Top+",\"w\":"+form.Width+",\"h\":"+form.Height+",\"fechamentos\":"+tentativas+"}",new UTF8Encoding(false)); } catch { } };
    timer.Start(); Application.Run(form);
  }
}
