// Reproduz um atualizador/lançador que sai e deixa a janela em outro executável.
using System;
using System.Diagnostics;
public class LancadorDeTeste {
  [STAThread] public static void Main(string[] args) {
    Process.Start(new ProcessStartInfo { FileName=args[0],Arguments=args[1],UseShellExecute=false });
  }
}
