# Grava uma imagem (.iso ou .img) num pendrive ou cartão inteiro e confere a cópia, no Windows. O Retro
# Computer roda este arquivo como administrador (a confirmação do próprio Windows, o UAC), acompanha o
# andamento no arquivo "andamento" da -Pasta (a fase e os bytes) e lê o resultado no -Saida. Um arquivo
# "parar" na -Pasta interrompe. Só um disco USB ou um cartão, nunca o do sistema.
#
# O primeiro MiB (com a tabela de partições) é zerado antes e gravado só no fim, depois de conferido o
# resto: assim o Windows não monta o pendrive no meio da cópia (nem grava nada nele).
param(
    [int]$Disco = -1,
    [Parameter(Mandatory = $true)][string]$Imagem,
    [Parameter(Mandatory = $true)][string]$Pasta,
    [Parameter(Mandatory = $true)][string]$Saida,
    # Para os testes: um arquivo comum no lugar do disco.
    [string]$ArquivoTeste = ''
)
$ErrorActionPreference = 'Stop'

function Fim($o) {
    $o | ConvertTo-Json -Compress | Set-Content -LiteralPath $Saida -Encoding UTF8
    exit 0
}

$codigo = @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public static class RetroGravar
{
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern SafeFileHandle CreateFileW(string nome, uint acesso, uint partilha, IntPtr seguranca, uint criacao, uint opcoes, IntPtr modelo);

    const int BLOCO = 4 << 20;
    const int INICIO = 1 << 20;

    // O disco inteiro, para ler e gravar (GENERIC_READ | GENERIC_WRITE, OPEN_EXISTING, FILE_FLAG_WRITE_THROUGH).
    public static FileStream AbrirDisco(int numero)
    {
        SafeFileHandle h = CreateFileW(@"\\.\PhysicalDrive" + numero, 0xC0000000, 3, IntPtr.Zero, 3, 0x80000000, IntPtr.Zero);
        if (h.IsInvalid) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
        return new FileStream(h, FileAccess.ReadWrite, 1, false);
    }

    static void Andar(string arquivo, string fase, long feito)
    {
        try { File.WriteAllText(arquivo, fase + " " + feito); } catch (IOException) { }
    }

    static int LerTudo(Stream s, byte[] buf, int n)
    {
        int lidos = 0;
        while (lidos < n)
        {
            int k = s.Read(buf, lidos, n - lidos);
            if (k <= 0) break;
            lidos += k;
        }
        return lidos;
    }

    // Grava (ou confere) o trecho [de, ate) da imagem no mesmo lugar do disco, em blocos de 4 MiB. O disco
    // só aceita setores inteiros: o último bloco é completado com zeros. 0 = certo, 1 = parado, 2 = diferente.
    static int Trecho(FileStream img, Stream disco, long de, long ate, int setor, byte[] buf, byte[] lido, bool conferir, string andamento, string parar, string fase)
    {
        DateTime proximo = DateTime.MinValue;
        long pos = de;
        while (pos < ate)
        {
            if (DateTime.UtcNow >= proximo)
            {
                if (parar != null && File.Exists(parar)) return 1;
                Andar(andamento, fase, pos);
                proximo = DateTime.UtcNow.AddMilliseconds(500);
            }
            int n = (int)Math.Min((long)BLOCO, ate - pos);
            img.Position = pos;
            if (LerTudo(img, buf, n) != n) throw new IOException("imagem");
            int m = (n + setor - 1) / setor * setor;
            disco.Position = pos;
            if (conferir)
            {
                if (LerTudo(disco, lido, m) < n) return 2;
                for (int i = 0; i < n; i++) if (buf[i] != lido[i]) return 2;
            }
            else
            {
                if (m > n) Array.Clear(buf, n, m - n);
                disco.Write(buf, 0, m);
            }
            pos += n;
        }
        Andar(andamento, fase, ate);
        return 0;
    }

    static void Descarregar(Stream s)
    {
        FileStream f = s as FileStream;
        if (f != null) f.Flush(true); else s.Flush();
    }

    public static string Gravar(string imagem, Stream disco, long total, int setor, string andamento, string parar)
    {
        byte[] buf = new byte[BLOCO];
        byte[] lido = new byte[BLOCO];
        using (FileStream img = new FileStream(imagem, FileMode.Open, FileAccess.Read, FileShare.Read, 1 << 16))
        {
            long inicio = Math.Min((long)INICIO, total);
            Andar(andamento, "preparar", 0);
            Array.Clear(buf, 0, INICIO);
            disco.Position = 0;
            disco.Write(buf, 0, INICIO);
            Descarregar(disco);
            int r = Trecho(img, disco, inicio, total, setor, buf, lido, false, andamento, parar, "gravar");
            if (r == 0) { Descarregar(disco); r = Trecho(img, disco, inicio, total, setor, buf, lido, true, andamento, parar, "conferir"); }
            if (r == 0) r = Trecho(img, disco, 0, inicio, setor, buf, lido, false, andamento, null, "inicio");
            if (r == 0) { Descarregar(disco); r = Trecho(img, disco, 0, inicio, setor, buf, lido, true, andamento, null, "inicio"); }
            return r == 0 ? "ok" : r == 1 ? "parado" : "diferente";
        }
    }
}
'@

try {
    Add-Type -TypeDefinition $codigo -Language CSharp
    $total = [int64](Get-Item -LiteralPath $Imagem).Length
    $andamento = Join-Path $Pasta 'andamento'
    $parar = Join-Path $Pasta 'parar'
    if ($ArquivoTeste) {
        $setor = 512
        $alvo = [System.IO.File]::Open($ArquivoTeste, 'OpenOrCreate', 'ReadWrite', 'None')
    } else {
        $d = Get-Disk -Number $Disco
        if ($d.IsBoot -or $d.IsSystem -or ([string]$d.BusType -notin @('USB', 'SD'))) { Fim @{ ok = $false; erro = 'disco' } }
        if ([int64]$d.Size -lt $total) { Fim @{ ok = $false; pequeno = $true } }
        $setor = [int]$d.LogicalSectorSize
        if ($setor -lt 512) { $setor = 512 }
        # Sem partições, o Windows solta os volumes do pendrive (e deixa gravar no disco inteiro).
        if ([string]$d.PartitionStyle -ne 'RAW') { Clear-Disk -Number $Disco -RemoveData -RemoveOEM -Confirm:$false }
        $alvo = [RetroGravar]::AbrirDisco($Disco)
    }
    try {
        $estado = [RetroGravar]::Gravar($Imagem, $alvo, $total, $setor, $andamento, $parar)
    } finally {
        $alvo.Dispose()
    }
    # O Windows lê a tabela de partições nova.
    if (-not $ArquivoTeste) { Update-Disk -Number $Disco -ErrorAction SilentlyContinue }
    Fim @{ ok = ($estado -eq 'ok'); estado = $estado }
} catch {
    Fim @{ ok = $false; erro = $_.Exception.Message }
}
