#requires -Version 5.1
[CmdletBinding()]
param(
    [ValidateSet('install', 'update', 'uninstall')][string] $Action = 'update',
    [string] $Source
)
$ErrorActionPreference = 'Stop'
# Use this PowerShell's built-ins even when a Node/Bun caller inherited PSModulePath.
Import-Module (Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Utility\Microsoft.PowerShell.Utility.psd1') -ErrorAction Stop
$productRoot = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Programs\vida-agent'
$binRoot = Join-Path $productRoot 'bin'
$command = Join-Path $binRoot 'vida-agent.exe'
$receiptPath = Join-Path $binRoot 'installation.json'
$pending = Join-Path $binRoot 'vida-agent.pending'
$backup = Join-Path $binRoot 'vida-agent.previous'
$lockPath = Join-Path $binRoot 'installation.lock'
$lock = $null
$published = $false
$committed = $false
$candidateHash = $null
$priorHash = $null
$stage = $null
$pathChanged = $false
$uninstallStaged = $false
$oldUserPath = [Environment]::GetEnvironmentVariable('Path','User')
$writtenUserPath = $null

function Assert-SafePath([string] $Path) {
    $cursor = [IO.Path]::GetFullPath($Path)
    while ($cursor) {
        if (Test-Path -LiteralPath $cursor) {
            $item = Get-Item -LiteralPath $cursor -Force
            if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or $item.LinkType) {
                throw 'Input or installation path is linked.'
            }
        }
        $cursor = [IO.Path]::GetDirectoryName($cursor)
    }
}
function Get-FileDigest([string] $Path) {
    Assert-SafePath $Path
    $item = Get-Item -LiteralPath $Path -Force
    if ($item.PSIsContainer -or $item.Length -lt 1 -or $item.Length -gt 268435456) { throw 'Invalid input or installation file.' }
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}
function Copy-Limited([IO.Stream] $InputStream, [IO.Stream] $OutputStream, [long] $MaximumBytes) {
    $buffer = New-Object byte[] 65536
    $total = 0L
    while (($count = $InputStream.Read($buffer,0,$buffer.Length)) -gt 0) {
        $total += $count
        if ($total -gt $MaximumBytes) { throw 'Input exceeds its byte bound.' }
        $OutputStream.Write($buffer,0,$count)
    }
    return $total
}
# Validate the small release ZIP directory before .NET allocates its entries.
# Layout: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT sections 4.3.12/4.3.16.
function Assert-BuildZip([string] $Path) {
    $file = [IO.File]::OpenRead($Path)
    try {
        if ($file.Length -lt 22) { throw 'ZIP footer is missing.' }
        [void]$file.Seek(-22,[IO.SeekOrigin]::End)
        $footer = New-Object byte[] 22
        if ($file.Read($footer,0,22) -ne 22 -or [BitConverter]::ToUInt32($footer,0) -ne 101010256 -or [BitConverter]::ToUInt16($footer,20) -ne 0) { throw 'Use a standard release ZIP without archive comments.' }
        $count = [BitConverter]::ToUInt16($footer,10)
        $size = [BitConverter]::ToUInt32($footer,12)
        [long]$offset = [BitConverter]::ToUInt32($footer,16)
        if ($count -lt 1 -or $count -gt 6 -or $size -gt 65536 -or $offset + $size -ne $file.Length - 22 -or [BitConverter]::ToUInt16($footer,4) -ne 0 -or [BitConverter]::ToUInt16($footer,6) -ne 0 -or [BitConverter]::ToUInt16($footer,8) -ne $count) { throw 'Unsupported release ZIP directory.' }
        [void]$file.Seek($offset,[IO.SeekOrigin]::Begin)
        $directory = New-Object byte[] $size
        $read = 0
        while ($read -lt $size) {
            $part = $file.Read($directory,$read,$size-$read)
            if ($part -eq 0) { throw 'Incomplete ZIP directory.' }
            $read += $part
        }
        $position = 0
        for ($index=0; $index -lt $count; $index++) {
            if ($position + 46 -gt $size -or [BitConverter]::ToUInt32($directory,$position) -ne 33639248) { throw 'Invalid ZIP directory record.' }
            $nameBytes = [BitConverter]::ToUInt16($directory,$position+28)
            if ($nameBytes -lt 1 -or $nameBytes -gt 128) { throw 'ZIP member name exceeds its bound.' }
            $position += 46 + $nameBytes + [BitConverter]::ToUInt16($directory,$position+30) + [BitConverter]::ToUInt16($directory,$position+32)
            if ($position -gt $size) { throw 'ZIP directory record exceeds its bound.' }
        }
        if ($position -ne $size) { throw 'Unexpected ZIP directory data.' }
    } finally { $file.Dispose() }
}
function Invoke-Native([string] $Arguments) {
    $start = New-Object Diagnostics.ProcessStartInfo
    $start.FileName = $command
    $start.Arguments = $Arguments
    $start.WorkingDirectory = $stage
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    foreach ($name in @('NODE_OPTIONS','BUN_OPTIONS','VIDA_STANDALONE_ROOT','VIDA_STANDALONE_EXECUTABLE','BUN_BE_BUN')) { $start.EnvironmentVariables.Remove($name) }
    $child = New-Object Diagnostics.Process
    $child.StartInfo = $start
    try {
        if (-not $child.Start()) { throw 'Native command did not start.' }
        $output = $child.StandardOutput.ReadToEndAsync()
        $errors = $child.StandardError.ReadToEndAsync()
        if (-not $child.WaitForExit(30000)) { $child.Kill(); [void]$child.WaitForExit(5000); throw "Native command timed out: $Arguments" }
        if (-not $output.Wait(5000) -or -not $errors.Wait(5000)) { throw 'Native output did not close; outcome is UNKNOWN.' }
        $body = $output.GetAwaiter().GetResult()
        if ($child.ExitCode -ne 0 -or $errors.GetAwaiter().GetResult().Trim()) { throw "Native command failed: $Arguments" }
        return ($body | ConvertFrom-Json)
    } finally { $child.Dispose() }
}

try {
    Assert-SafePath $binRoot
    [void][IO.Directory]::CreateDirectory($binRoot)
    Assert-SafePath $lockPath
    $lock = [IO.File]::Open($lockPath, 'OpenOrCreate', 'ReadWrite', 'None')
    foreach ($path in @($pending, $backup)) {
        if (Test-Path -LiteralPath $path) { throw 'Earlier installation is incomplete. Inspect recovery files before retry.' }
    }
    $priorReceipt = $null
    if (Test-Path -LiteralPath $receiptPath) {
        $priorReceiptHash = Get-FileDigest $receiptPath
        $priorReceipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
        if ($priorReceipt.path -cne $command -or $priorReceipt.sha256 -notmatch '^[A-Fa-f0-9]{64}$' -or $priorReceipt.path_added -isnot [bool]) { throw 'Invalid installation receipt.' }
    }
    $exists = Test-Path -LiteralPath $command
    if ($Action -eq 'install' -and $exists) { throw 'Already installed. Use -Action update.' }
    if ($Action -ne 'install' -and -not $exists) { throw 'Not installed. Use -Action install.' }
    if ($exists) {
        $priorHash = Get-FileDigest $command
        if ($priorReceipt -and $priorReceipt.sha256 -ine $priorHash) { throw 'Installed file differs from its receipt.' }
    }
    $stage = Join-Path $binRoot ('install-' + [Guid]::NewGuid().ToString('N'))
    [void][IO.Directory]::CreateDirectory($stage)
    $receiptPrevious = Join-Path $stage 'installation.previous.json'
    if ($Action -eq 'uninstall') {
        if (-not $priorReceipt) { throw 'No installer ownership receipt. Update with this installer before uninstall.' }
        $oldUserPath = [Environment]::GetEnvironmentVariable('Path','User')
        if ($priorReceipt.path_added -and @($oldUserPath -split ';' | Where-Object { $_.TrimEnd('\') -ieq $binRoot }).Count -gt 1) { throw 'Duplicate user PATH entries make ownership ambiguous. No uninstall performed.' }
        [IO.File]::Move($command, $backup)
        $uninstallStaged = $true
        if ((Get-FileDigest $backup) -ine $priorHash) { throw 'Moved executable differs from the installer-owned bytes.' }
        if ($priorReceipt.path_added) {
            $removed = $false
            $remaining = @(foreach ($part in ($oldUserPath -split ';')) {
                if (-not $removed -and $part.TrimEnd('\') -ieq $binRoot) { $removed = $true }
                else { $part }
            })
            $writtenUserPath = $remaining -join ';'
            $pathChanged = $true
            [Environment]::SetEnvironmentVariable('Path', $writtenUserPath, 'User')
        }
        [IO.File]::Move($receiptPath, $receiptPrevious)
        $committed = $true
        Remove-Item -LiteralPath $backup
        Assert-SafePath $stage
        Remove-Item -LiteralPath $stage -Recurse -Force
        $stage = $null
        Write-Output 'Uninstalled vida-agent. Project data and configuration are preserved.'
        return
    }
    if (-not $Source) { throw '-Source requires a local EXE/ZIP path or a direct HTTPS URL.' }
    $uri = $null
    if ([Uri]::TryCreate($Source, [UriKind]::Absolute, [ref] $uri) -and $uri.Scheme -in @('http','https')) {
        if ($uri.Scheme -ne 'https' -or $uri.UserInfo) { throw 'Use a direct HTTPS URL without credentials.' }
        $inputPath = Join-Path $stage 'download'
        $request = [Net.HttpWebRequest]::Create($uri)
        $request.AllowAutoRedirect = $false
        $request.Timeout = 60000
        $request.ReadWriteTimeout = 60000
        $response = $request.GetResponse()
        try {
            if ([int]$response.StatusCode -ne 200 -or $response.ContentLength -gt 268435456) { throw 'Invalid download response.' }
            $stream = $response.GetResponseStream()
            $target = [IO.File]::Open($inputPath, 'CreateNew', 'Write', 'None')
            try {
                $buffer = New-Object byte[] 65536
                $total = 0L
                while (($count = $stream.Read($buffer,0,$buffer.Length)) -gt 0) {
                    $total += $count
                    if ($total -gt 268435456) { throw 'Download exceeds 256 MiB.' }
                    $target.Write($buffer,0,$count)
                }
            } finally { $target.Dispose(); $stream.Dispose() }
        } finally { $response.Dispose() }
    } else { $inputPath = (Resolve-Path -LiteralPath $Source).Path }
    $inputHash = Get-FileDigest $inputPath
    $header = [IO.File]::OpenRead($inputPath)
    try { $isZip = $header.ReadByte() -eq 80 -and $header.ReadByte() -eq 75 } finally { $header.Dispose() }
    $manifest = $null
    $hasManifest = $false
    if ($isZip) {
        Assert-BuildZip $inputPath
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [IO.Compression.ZipFile]::OpenRead($inputPath)
        try {
            $names = @{}
            foreach ($entry in $zip.Entries) {
                $name = $entry.FullName
                if ($name -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*$' -or $names.ContainsKey($name) -or (($entry.ExternalAttributes -shr 16) -band 61440) -eq 40960) { throw 'ZIP has duplicate, linked or non-flat entries.' }
                $names[$name] = $entry
            }
            $native = $names['vida-agent-bun-windows-x64.exe']
            if (-not $native -or $native.FullName -cne 'vida-agent-bun-windows-x64.exe' -or $native.Length -lt 1 -or $native.Length -gt 251658240) { throw 'ZIP requires the Windows x64 native executable.' }
            $nativeStream = $native.Open()
            $nativeOutput = [IO.File]::Open($pending, 'CreateNew', 'Write', 'None')
            try {
                if ((Copy-Limited $nativeStream $nativeOutput $native.Length) -ne $native.Length) { throw 'Native ZIP length differs.' }
            } finally { $nativeOutput.Dispose(); $nativeStream.Dispose() }
            if ($names.ContainsKey('manifest.json')) {
                $hasManifest = $true
                $entry = $names['manifest.json']
                if ($entry.Length -gt 1048576 -or $entry.FullName -cne 'manifest.json') { throw 'Invalid manifest entry.' }
                $manifestStream = $entry.Open()
                $manifestBuffer = New-Object IO.MemoryStream
                try {
                    if ((Copy-Limited $manifestStream $manifestBuffer $entry.Length) -ne $entry.Length) { throw 'Manifest ZIP length differs.' }
                    $manifest = [Text.Encoding]::UTF8.GetString($manifestBuffer.ToArray()) | ConvertFrom-Json
                } finally { $manifestBuffer.Dispose(); $manifestStream.Dispose() }
            }
        } finally { $zip.Dispose() }
    } else {
        $localInput = [IO.File]::OpenRead($inputPath)
        $localOutput = [IO.File]::Open($pending, 'CreateNew', 'Write', 'None')
        try { [void](Copy-Limited $localInput $localOutput 268435456) }
        finally { $localOutput.Dispose(); $localInput.Dispose() }
        $adjacent = Join-Path ([IO.Path]::GetDirectoryName($inputPath)) 'manifest.json'
        if (Test-Path -LiteralPath $adjacent) {
            $hasManifest = $true
            [void](Get-FileDigest $adjacent)
            if ((Get-Item -LiteralPath $adjacent).Length -gt 1048576) { throw 'Manifest exceeds 1 MiB.' }
            $localManifest = [IO.File]::OpenRead($adjacent)
            $manifestBuffer = New-Object IO.MemoryStream
            try {
                [void](Copy-Limited $localManifest $manifestBuffer 1048576)
                $manifest = [Text.Encoding]::UTF8.GetString($manifestBuffer.ToArray()) | ConvertFrom-Json
            } finally { $manifestBuffer.Dispose(); $localManifest.Dispose() }
        }
    }
    if ((Get-FileDigest $inputPath) -ine $inputHash) { throw 'Input changed during preparation.' }
    $candidateHash = Get-FileDigest $pending
    if (-not $isZip -and $candidateHash -ine $inputHash) { throw 'Copied executable differs from the selected input.' }
    if ($hasManifest -and ($manifest -isnot [pscustomobject] -or $manifest.asset -isnot [pscustomobject] -or $manifest.schema -cne 'VidaStandaloneBuild/v1' -or $manifest.target -cne 'bun-windows-x64' -or $manifest.asset.file -cne 'vida-agent-bun-windows-x64.exe' -or $manifest.asset.sha256 -ine $candidateHash -or $manifest.asset.bytes -ne (Get-Item -LiteralPath $pending).Length)) { throw 'Native bytes differ from the manifest.' }
    if ($exists) {
        if ((Get-FileDigest $command) -ine $priorHash) { throw 'Installed file changed before replacement.' }
        [IO.File]::Replace($pending, $command, $backup)
    } else { [IO.File]::Move($pending, $command) }
    $published = $true
    $version = Invoke-Native 'version'
    if ($hasManifest -and $version.version -cne $manifest.version) { throw 'Installed version differs from the selected manifest.' }
    if ($version.schema -cne 'VidaAgentPackage/v1' -or $version.name -cne 'vida-agent' -or (Get-FileDigest $command) -ine $candidateHash) { throw 'Installed native postcheck failed.' }
    $userPath = [Environment]::GetEnvironmentVariable('Path','User')
    $pathAdded = $priorReceipt -and $priorReceipt.path_added
    if (-not (@($userPath -split ';') | Where-Object { $_.TrimEnd('\') -ieq $binRoot })) {
        $oldUserPath = $userPath
        $writtenUserPath = $binRoot + ';' + $userPath
        $pathChanged = $true
        [Environment]::SetEnvironmentVariable('Path', $writtenUserPath, 'User')
        $pathAdded = $true
    }
    $receipt = @{ path=$command; sha256=$candidateHash; path_added=[bool]$pathAdded } | ConvertTo-Json
    $receiptTemporary = Join-Path $stage 'installation.json'
    [IO.File]::WriteAllText($receiptTemporary, $receipt)
    if ($priorReceipt) { [IO.File]::Replace($receiptTemporary, $receiptPath, $receiptPrevious) }
    else { [IO.File]::Move($receiptTemporary, $receiptPath) }
    $committed = $true
    if ($exists) { Remove-Item -LiteralPath $backup }
    $env:Path = $binRoot + ';' + $env:Path
    Assert-SafePath $stage
    Remove-Item -LiteralPath $stage -Recurse -Force
    $stage = $null
    Write-Output (@{ schema='VidaNativeInstallationResult/v1'; action=$Action; path=$command; version=$version.version; bytes=(Get-Item -LiteralPath $command).Length; sha256=$candidateHash; path_added=[bool]$pathAdded; cleanup_complete=$true; runtime_accepted=$false } | ConvertTo-Json -Compress)
} catch {
    $failure = $_
    if ($committed) { Write-Warning 'Native operation committed; cleanup is incomplete. Retain files and inspect before retry.' }
    else { Write-Warning 'Operation did not commit. Retain pending, previous and staging files; inspect before retry.' }
    if ($pathChanged -and -not $committed) {
        try {
            if ([Environment]::GetEnvironmentVariable('Path','User') -cne $writtenUserPath) { throw 'User PATH drifted.' }
            [Environment]::SetEnvironmentVariable('Path', $oldUserPath, 'User')
        } catch { Write-Warning 'User PATH restoration is UNKNOWN; do not overwrite a drifted value.' }
    }
    if ($uninstallStaged -and -not $committed) {
        try {
            if ((Test-Path -LiteralPath $command) -or (Get-FileDigest $backup) -ine $priorHash) { throw 'Uninstall target drifted.' }
            [IO.File]::Move($backup, $command)
            if (-not (Test-Path -LiteralPath $receiptPath)) {
                if ((Get-FileDigest $receiptPrevious) -ine $priorReceiptHash) { throw 'Uninstall receipt drifted.' }
                [IO.File]::Move($receiptPrevious, $receiptPath)
            } elseif ((Get-FileDigest $receiptPath) -ine $priorReceiptHash) { throw 'Uninstall receipt drifted.' }
            Write-Warning 'Uninstall rolled back; inspect retained staging before retry.'
        } catch { Write-Warning 'Uninstall recovery is UNKNOWN. Retain all files.' }
    }
    if ($published -and -not $committed) {
        try {
            if ((Get-FileDigest $command) -ine $candidateHash) { throw 'Target drifted; preserve recovery files.' }
            if ($exists -and (Get-FileDigest $backup) -ieq $priorHash) { [IO.File]::Replace($backup, $command, $pending) }
            elseif (-not $exists) { [IO.File]::Move($command, $pending) }
            else { throw 'Prior file differs; preserve recovery files.' }
            Write-Warning 'Native replacement rolled back. Inspect retained files before retry.'
        } catch { Write-Warning 'Recovery is UNKNOWN. Retain all installation files and inspect before retry.' }
    }
    if ($stage -and (Test-Path -LiteralPath $stage)) {
        try { [IO.File]::WriteAllText((Join-Path $stage 'failure.operator-only.txt'), ($failure | Out-String)) } catch { }
    }
    Write-Error 'Operation failed. Inspect installer-created staging and recovery files; do not retry blindly.'
    exit 1
} finally { if ($lock) { $lock.Dispose() } }
