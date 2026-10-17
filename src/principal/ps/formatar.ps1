# Formata um pendrive ou cartão no Windows. O Retro Computer roda este arquivo como administrador (a
# confirmação do próprio Windows, o UAC) e lê o resultado no arquivo -Saida. Só um disco USB ou um
# cartão (o MMC, o eMMC soldado na placa, fica de fora), nunca o do sistema. Com -Letra, só aquela
# partição; com -Inteiro (ou com -Disco, o número do disco, para o pendrive sem letra), o disco inteiro
# volta a ter uma partição só: o pendrive que recebeu uma imagem .iso, por exemplo, e ficou com um
# pedaço só à vista, ou nenhum.
param(
    [string]$Letra = '',
    [int]$Disco = -1,
    [Parameter(Mandatory = $true)][ValidateSet('exFAT', 'FAT32', 'NTFS')][string]$Sistema,
    [string]$Rotulo = '',
    [switch]$Inteiro,
    [Parameter(Mandatory = $true)][string]$Saida
)
$ErrorActionPreference = 'Stop'

function Fim($o) {
    $o | ConvertTo-Json -Compress | Set-Content -LiteralPath $Saida -Encoding UTF8
    exit 0
}

try {
    if ($Letra) {
        $part = Get-Partition -DriveLetter $Letra
        $d = Get-Disk -Number $part.DiskNumber
        $tamanho = [int64]$part.Size
    } else {
        $d = Get-Disk -Number $Disco
        $Inteiro = $true
    }
    if ($d.IsBoot -or $d.IsSystem -or ([string]$d.BusType -notin @('USB', 'SD'))) { Fim @{ ok = $false; erro = 'disco' } }
    if ($Inteiro) { $tamanho = [int64]$d.Size }
    # O Windows não formata em FAT32 um volume de mais de 32 GB.
    if ($Sistema -eq 'FAT32' -and $tamanho -gt 32GB) { Fim @{ ok = $false; fat32Grande = $true } }
    $rot = @{}
    if ($Rotulo) { $rot.NewFileSystemLabel = $Rotulo }
    if (-not $Inteiro) {
        Format-Volume -DriveLetter $Letra -FileSystem $Sistema @rot -Force -Confirm:$false | Out-Null
        Fim @{ ok = $true; letra = $Letra }
    }
    if ([string]$d.PartitionStyle -ne 'RAW') { Clear-Disk -Number $d.Number -RemoveData -RemoveOEM -Confirm:$false }
    Initialize-Disk -Number $d.Number -PartitionStyle MBR -ErrorAction SilentlyContinue
    $tipo = 'IFS'
    if ($Sistema -eq 'FAT32') { $tipo = 'FAT32' }
    $nova = $null
    if ($Letra) {
        try { $nova = New-Partition -DiskNumber $d.Number -UseMaximumSize -MbrType $tipo -DriveLetter $Letra } catch { $nova = $null }
    }
    if (-not $nova) { $nova = New-Partition -DiskNumber $d.Number -UseMaximumSize -MbrType $tipo -AssignDriveLetter }
    Format-Volume -Partition $nova -FileSystem $Sistema @rot -Force -Confirm:$false | Out-Null
    $l = [string](Get-Partition -DiskNumber $d.Number -PartitionNumber $nova.PartitionNumber).DriveLetter
    if ($l -notmatch '^[A-Za-z]$') { $l = '' }
    Fim @{ ok = $true; letra = $l }
} catch {
    Fim @{ ok = $false; erro = $_.Exception.Message }
}
