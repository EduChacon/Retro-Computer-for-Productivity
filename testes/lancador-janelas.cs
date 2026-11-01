// Reproduz um atualizador/lançador que sai e deixa a janela em outro executável.
using System;
using System.Diagnostics;
using System.Windows.Forms;
public class LancadorDeTeste {
  [STAThread] public static void Main(string[] args) {
    var form=new Form { Text="Atualizando o programa de teste",Width=320,Height=150 };
    var timer=new Timer { Interval=800 };
    timer.Tick+=(s,e)=> { timer.Stop(); Process.Start(new ProcessStartInfo { FileName=args[2],Arguments=args[3],UseShellExecute=false }); form.Close(); };
    timer.Start(); Application.Run(form);
  }
}
