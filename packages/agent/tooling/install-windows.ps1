$ErrorActionPreference = 'Stop'
$script:effectStarted = $false
$script:operationId = 'unavailable'
$script:createdPaths = New-Object System.Collections.Generic.List[string]

$nativeSource = @"
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Win32.SafeHandles;

public static class VidaAgentInstallWin32V1 {
    public const uint InvalidFileAttributes = 0xffffffff;
    public const uint FileAttributeDirectory = 0x10;
    public const uint FileAttributeReparsePoint = 0x400;
    public const uint ReadAttributes = 0x80;
    public const uint GenericRead = 0x80000000;
    public const uint ShareRead = 0x1;
    public const uint ShareAll = 0x7;
    public const uint OpenExisting = 3;
    public const uint OpenReparsePoint = 0x00200000;
    public const uint BackupSemantics = 0x02000000;

    [StructLayout(LayoutKind.Sequential)]
    public struct NativeFileTime {
        public uint Low;
        public uint High;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct ByHandleFileInformation {
        public uint FileAttributes;
        public NativeFileTime CreationTime;
        public NativeFileTime LastAccessTime;
        public NativeFileTime LastWriteTime;
        public uint VolumeSerialNumber;
        public uint FileSizeHigh;
        public uint FileSizeLow;
        public uint NumberOfLinks;
        public uint FileIndexHigh;
        public uint FileIndexLow;
        public ulong Length { get { return (((ulong)FileSizeHigh) << 32) | FileSizeLow; } }
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "CreateFileW")]
    public static extern SafeFileHandle CreateFile(string path, uint access, uint share, IntPtr security, uint creation, uint flags, IntPtr template);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool GetFileInformationByHandle(SafeFileHandle handle, out ByHandleFileInformation information);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern uint GetFileAttributesW(string path);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CreateDirectoryW(string path, IntPtr security);

    public sealed class BoundedOutput {
        public string Text { get; set; }
        public bool Exceeded { get; set; }
    }

    public static async Task<BoundedOutput> ReadBoundedTextAsync(StreamReader reader, int maximumCharacters) {
        var text = new StringBuilder();
        var buffer = new char[4096];
        var exceeded = false;
        while (true) {
            var count = await reader.ReadAsync(buffer, 0, buffer.Length).ConfigureAwait(false);
            if (count == 0) break;
            if (exceeded || text.Length > maximumCharacters - count) {
                exceeded = true;
                continue;
            }
            text.Append(buffer, 0, count);
        }
        return new BoundedOutput { Text = text.ToString(), Exceeded = exceeded };
    }
}
"@

try {
    if (-not ('VidaAgentInstallWin32V1' -as [type])) {
        Add-Type -TypeDefinition $nativeSource -ErrorAction Stop
    }

    function Get-NativeInfo([Microsoft.Win32.SafeHandles.SafeFileHandle] $Handle) {
        $information = New-Object VidaAgentInstallWin32V1+ByHandleFileInformation
        if (-not [VidaAgentInstallWin32V1]::GetFileInformationByHandle($Handle, [ref] $information)) {
            $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
            throw "Windows file metadata is unavailable (Win32 $code)."
        }
        return $information
    }

    function Get-PathInfo([string] $Path) {
        $handle = [VidaAgentInstallWin32V1]::CreateFile(
            $Path,
            [VidaAgentInstallWin32V1]::ReadAttributes,
            [VidaAgentInstallWin32V1]::ShareAll,
            [IntPtr]::Zero,
            [VidaAgentInstallWin32V1]::OpenExisting,
            [VidaAgentInstallWin32V1]::OpenReparsePoint -bor [VidaAgentInstallWin32V1]::BackupSemantics,
            [IntPtr]::Zero
        )
        if ($handle.IsInvalid) {
            $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
            $handle.Dispose()
            if ($code -eq 2 -or $code -eq 3) { return $null }
            throw "Cannot inspect path metadata: $Path (Win32 $code)."
        }
        try { return (Get-NativeInfo $handle) }
        finally { $handle.Dispose() }
    }

    function Assert-NoReparseDirectoryChain([string] $Path, [switch] $AllowMissing) {
        $full = [IO.Path]::GetFullPath($Path)
        if ([string]::IsNullOrWhiteSpace($full) -or $full -match '[\r\n\0]') {
            throw 'A valid absolute filesystem path is required.'
        }
        $root = [IO.Path]::GetPathRoot($full)
        if ([string]::IsNullOrWhiteSpace($root)) { throw 'Filesystem path root is unavailable.' }
        $current = $root
        $rootInfo = Get-PathInfo $current
        if ($null -eq $rootInfo -or ($rootInfo.FileAttributes -band [VidaAgentInstallWin32V1]::FileAttributeDirectory) -eq 0 -or ($rootInfo.FileAttributes -band [VidaAgentInstallWin32V1]::FileAttributeReparsePoint) -ne 0) {
            throw 'Filesystem root is absent or linked.'
        }
        $tail = $full.Substring($root.Length).Trim([char] '\', [char] '/')
        foreach ($part in ($tail -split '[\\/]' | Where-Object { $_.Length -gt 0 })) {
            $current = [IO.Path]::Combine($current, $part)
            $info = Get-PathInfo $current
            if ($null -eq $info) {
                if ($AllowMissing) { return }
                throw "Required directory is absent: $current"
            }
            if (($info.FileAttributes -band [VidaAgentInstallWin32V1]::FileAttributeDirectory) -eq 0 -or ($info.FileAttributes -band [VidaAgentInstallWin32V1]::FileAttributeReparsePoint) -ne 0) {
                throw "Directory component is not a regular directory: $current"
            }
        }
    }

    function Get-FileIdentity($Information) {
        return [string]::Join(':', @(
            $Information.VolumeSerialNumber,
            $Information.FileIndexHigh,
            $Information.FileIndexLow,
            $Information.FileSizeHigh,
            $Information.FileSizeLow,
            $Information.NumberOfLinks,
            $Information.FileAttributes
        ))
    }

    function Open-CheckedReadFile([string] $Path, [long] $MaximumBytes) {
        $handle = [VidaAgentInstallWin32V1]::CreateFile(
            $Path,
            [VidaAgentInstallWin32V1]::GenericRead,
            [VidaAgentInstallWin32V1]::ShareRead,
            [IntPtr]::Zero,
            [VidaAgentInstallWin32V1]::OpenExisting,
            [VidaAgentInstallWin32V1]::OpenReparsePoint,
            [IntPtr]::Zero
        )
        if ($handle.IsInvalid) {
            $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
            $handle.Dispose()
            throw "Cannot open regular input file: $Path (Win32 $code)."
        }
        try {
            $information = Get-NativeInfo $handle
            if (($information.FileAttributes -band [VidaAgentInstallWin32V1]::FileAttributeDirectory) -ne 0 -or ($information.FileAttributes -band [VidaAgentInstallWin32V1]::FileAttributeReparsePoint) -ne 0 -or $information.NumberOfLinks -ne 1 -or $information.Length -gt $MaximumBytes) {
                throw "Input file is linked, non-regular or oversized: $Path"
            }
            $stream = [IO.FileStream]::new($handle, [IO.FileAccess]::Read)
            return [pscustomobject]@{ Stream = $stream; Before = $information; Identity = (Get-FileIdentity $information) }
        } catch {
            $handle.Dispose()
            throw
        }
    }

    function Read-CheckedBytes([string] $Path, [long] $MaximumBytes) {
        $opened = Open-CheckedReadFile $Path $MaximumBytes
        $memory = [IO.MemoryStream]::new()
        try {
            $buffer = New-Object byte[] 65536
            [long] $total = 0
            while (($read = $opened.Stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
                $total += $read
                if ($total -gt $MaximumBytes) { throw "Input file exceeded its read bound: $Path" }
                $memory.Write($buffer, 0, $read)
            }
            $after = Get-NativeInfo $opened.Stream.SafeFileHandle
            if ($total -ne $opened.Before.Length -or (Get-FileIdentity $after) -cne $opened.Identity) {
                throw "Input file changed during read: $Path"
            }
            $bytes = $memory.ToArray()
            $sha = [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($bytes)).Replace('-', '').ToLowerInvariant()
            return [pscustomobject]@{ Bytes = $bytes; Length = $total; Sha256 = $sha }
        } finally {
            $memory.Dispose()
            $opened.Stream.Dispose()
        }
    }

    function Get-CheckedFileHash([string] $Path, [long] $MaximumBytes) {
        $opened = Open-CheckedReadFile $Path $MaximumBytes
        $algorithm = [Security.Cryptography.SHA256]::Create()
        try {
            $digest = [BitConverter]::ToString($algorithm.ComputeHash($opened.Stream)).Replace('-', '').ToLowerInvariant()
            $after = Get-NativeInfo $opened.Stream.SafeFileHandle
            if ((Get-FileIdentity $after) -cne $opened.Identity) { throw "Input file changed during hash: $Path" }
            return [pscustomobject]@{ Length = [long] $opened.Before.Length; Sha256 = $digest }
        } finally {
            $algorithm.Dispose()
            $opened.Stream.Dispose()
        }
    }

    function New-ExclusiveDirectory([string] $Path) {
        $parent = [IO.Path]::GetDirectoryName($Path)
        Assert-NoReparseDirectoryChain $parent
        if ($null -ne (Get-PathInfo $Path)) { throw "Existing destination directory requires inspection: $Path" }
        if (-not [VidaAgentInstallWin32V1]::CreateDirectoryW($Path, [IntPtr]::Zero)) {
            $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
            throw "Exclusive directory creation failed: $Path (Win32 $code)."
        }
        $script:createdPaths.Add($Path)
        Assert-NoReparseDirectoryChain $Path
    }

    function Copy-CheckedFile([string] $Source, [string] $Destination, [long] $MaximumBytes, [long] $ExpectedLength, [string] $ExpectedSha256) {
        Assert-NoReparseDirectoryChain ([IO.Path]::GetDirectoryName($Destination))
        if ($null -ne (Get-PathInfo $Destination)) { throw "Existing file destination requires inspection: $Destination" }
        $opened = Open-CheckedReadFile $Source $MaximumBytes
        $destinationStream = $null
        try {
            $destinationStream = [IO.FileStream]::new($Destination, [IO.FileMode]::CreateNew, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
            $script:createdPaths.Add($Destination)
            $destinationInfo = Get-NativeInfo $destinationStream.SafeFileHandle
            if (($destinationInfo.FileAttributes -band [VidaAgentInstallWin32V1]::FileAttributeDirectory) -ne 0 -or ($destinationInfo.FileAttributes -band [VidaAgentInstallWin32V1]::FileAttributeReparsePoint) -ne 0 -or $destinationInfo.NumberOfLinks -ne 1) {
                throw "Created destination is linked or non-regular: $Destination"
            }
            $buffer = New-Object byte[] 65536
            [long] $total = 0
            while (($read = $opened.Stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
                $total += $read
                if ($total -gt $MaximumBytes) { throw "Source exceeded its copy bound: $Source" }
                $destinationStream.Write($buffer, 0, $read)
            }
            if ($total -ne $ExpectedLength -or $total -ne $opened.Before.Length) { throw "Source length changed during copy: $Source" }
            $sourceAfter = Get-NativeInfo $opened.Stream.SafeFileHandle
            if ((Get-FileIdentity $sourceAfter) -cne $opened.Identity) { throw "Source identity changed during copy: $Source" }
            $destinationStream.Flush($true)
            $destinationStream.Position = 0
            $algorithm = [Security.Cryptography.SHA256]::Create()
            try { $actualSha256 = [BitConverter]::ToString($algorithm.ComputeHash($destinationStream)).Replace('-', '').ToLowerInvariant() }
            finally { $algorithm.Dispose() }
            if ($actualSha256 -cne $ExpectedSha256) { throw "Copied file bytes differ: $Destination" }
            $destinationAfter = Get-NativeInfo $destinationStream.SafeFileHandle
            if ($destinationAfter.Length -ne $ExpectedLength -or $destinationAfter.NumberOfLinks -ne 1 -or ($destinationAfter.FileAttributes -band [VidaAgentInstallWin32V1]::FileAttributeReparsePoint) -ne 0) {
                throw "Copied destination identity differs: $Destination"
            }
        } finally {
            if ($null -ne $destinationStream) { $destinationStream.Dispose() }
            $opened.Stream.Dispose()
        }
        Assert-NoReparseDirectoryChain ([IO.Path]::GetDirectoryName($Destination))
        $written = Get-CheckedFileHash $Destination $MaximumBytes
        if ($written.Length -ne $ExpectedLength -or $written.Sha256 -cne $ExpectedSha256) { throw "Destination changed after copy: $Destination" }
    }

    function Invoke-InstalledCommand([string] $Executable, [string] $Argument, [string] $WorkingDirectory) {
        $start = New-Object System.Diagnostics.ProcessStartInfo
        $start.FileName = $Executable
        $start.Arguments = $Argument
        $start.WorkingDirectory = $WorkingDirectory
        $start.UseShellExecute = $false
        $start.CreateNoWindow = $true
        $start.RedirectStandardOutput = $true
        $start.RedirectStandardError = $true
        foreach ($name in @('NODE_OPTIONS', 'BUN_OPTIONS', 'VIDA_STANDALONE_ROOT', 'VIDA_STANDALONE_EXECUTABLE', 'BUN_BE_BUN')) {
            [void] $start.EnvironmentVariables.Remove($name)
        }
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $start
        try {
            if (-not $process.Start()) { throw "Could not start installed command: $Argument" }
            $stdoutTask = [VidaAgentInstallWin32V1]::ReadBoundedTextAsync($process.StandardOutput, 65536)
            $stderrTask = [VidaAgentInstallWin32V1]::ReadBoundedTextAsync($process.StandardError, 65536)
            if (-not $process.WaitForExit(30000)) {
                try { $process.Kill() } catch { }
                if (-not $process.WaitForExit(5000)) { throw "Installed command terminal outcome is UNKNOWN: $Argument" }
                throw "Installed command exceeded its 30000ms bound: $Argument"
            }
            $process.WaitForExit()
            if (-not $stdoutTask.Wait(5000) -or -not $stderrTask.Wait(5000)) { throw "Installed command output did not close within its 5000ms bound: $Argument" }
            $stdout = $stdoutTask.GetAwaiter().GetResult()
            $stderr = $stderrTask.GetAwaiter().GetResult()
            if ($stdout.Exceeded -or $stderr.Exceeded) { throw "Installed command output exceeded its 65536-character bound: $Argument" }
            if ($process.ExitCode -ne 0 -or -not [string]::IsNullOrWhiteSpace($stderr.Text)) { throw "Installed command failed: $Argument (exit $($process.ExitCode))." }
            return $stdout.Text
        } finally { $process.Dispose() }
    }

    $artifactRoot = [IO.Path]::GetFullPath($PSScriptRoot)
    Assert-NoReparseDirectoryChain $artifactRoot
    $artifactNames = @('vida-agent-0.1.2.tgz', 'vida-agent-bun-windows-x64.exe', 'manifest.json', 'candidate.json', 'native-build.result.json', 'install-windows.ps1')
    $actualNames = @([IO.Directory]::GetFileSystemEntries($artifactRoot) | ForEach-Object { [IO.Path]::GetFileName($_) } | Sort-Object)
    $expectedNames = @($artifactNames | Sort-Object)
    if ($actualNames.Count -ne $expectedNames.Count -or [string]::Join("`n", $actualNames) -cne [string]::Join("`n", $expectedNames)) {
        throw 'The selected native artifact does not contain the exact six flat files.'
    }
    $selfPath = $MyInvocation.MyCommand.Path
    [void] (Read-CheckedBytes $selfPath (1 * 1024 * 1024))
    $candidateFile = Read-CheckedBytes (Join-Path $artifactRoot 'candidate.json') (8 * 1024 * 1024)
    $manifestFile = Read-CheckedBytes (Join-Path $artifactRoot 'manifest.json') (8 * 1024 * 1024)
    $receiptFile = Read-CheckedBytes (Join-Path $artifactRoot 'native-build.result.json') (1 * 1024 * 1024)
    $candidate = [Text.Encoding]::UTF8.GetString($candidateFile.Bytes) | ConvertFrom-Json -ErrorAction Stop
    $manifest = [Text.Encoding]::UTF8.GetString($manifestFile.Bytes) | ConvertFrom-Json -ErrorAction Stop
    $receipt = [Text.Encoding]::UTF8.GetString($receiptFile.Bytes) | ConvertFrom-Json -ErrorAction Stop
    $script:operationId = [string] $candidate.operation_id
    if ($script:operationId -cnotmatch '^[a-z0-9][a-z0-9-]{0,95}$') { throw 'Candidate operation identity is invalid.' }
    if ($candidate.version -cne '0.1.2' -or $candidate.source_binding -cnotmatch '^[a-f0-9]{64}$' -or $candidate.manifest_sha256 -cne $manifestFile.Sha256) {
        throw 'Candidate version or Source binding differs.'
    }
    if ($manifest.schema -cne 'VidaStandaloneBuild/v1' -or $manifest.version -cne '0.1.2' -or $manifest.pin -cne '1.4.2' -or $manifest.target -cne 'bun-windows-x64' -or $manifest.payloadId -cnotmatch '^[a-f0-9]{64}$' -or @($manifest.inputs).Count -lt 1) {
        throw 'Standalone manifest identity differs.'
    }
    $manifestProperties = @($manifest.PSObject.Properties.Name | Sort-Object)
    $expectedManifestProperties = @('asset', 'inputs', 'payloadId', 'pin', 'schema', 'target', 'version')
    $manifestAssetProperties = @($manifest.asset.PSObject.Properties.Name | Sort-Object)
    if ([string]::Join(',', $manifestProperties) -cne [string]::Join(',', $expectedManifestProperties) -or [string]::Join(',', $manifestAssetProperties) -cne 'bytes,file,sha256') {
        throw 'Standalone manifest fields differ from the supported schema.'
    }
    if ($manifest.asset.file -cne 'vida-agent-bun-windows-x64.exe' -or [long] $manifest.asset.bytes -le 0 -or [long] $manifest.asset.bytes -gt (240L * 1024 * 1024) -or $manifest.asset.sha256 -cnotmatch '^[a-f0-9]{64}$' -or $candidate.manifest.asset.sha256 -cne $manifest.asset.sha256 -or [long] $candidate.manifest.asset.bytes -ne [long] $manifest.asset.bytes) {
        throw 'Native asset identity differs.'
    }
    $candidateManifestProperties = @($candidate.manifest.PSObject.Properties.Name | Sort-Object)
    $candidateAssetProperties = @($candidate.manifest.asset.PSObject.Properties.Name | Sort-Object)
    if ([string]::Join(',', $candidateManifestProperties) -cne [string]::Join(',', $expectedManifestProperties) -or [string]::Join(',', $candidateAssetProperties) -cne 'bytes,file,sha256' -or $candidate.manifest.schema -cne $manifest.schema -or $candidate.manifest.version -cne $manifest.version -or $candidate.manifest.pin -cne $manifest.pin -or $candidate.manifest.target -cne $manifest.target -or $candidate.manifest.payloadId -cne $manifest.payloadId -or $candidate.manifest.inputs.Count -ne $manifest.inputs.Count -or $candidate.manifest.asset.file -cne $manifest.asset.file -or [long] $candidate.manifest.asset.bytes -ne [long] $manifest.asset.bytes -or $candidate.manifest.asset.sha256 -cne $manifest.asset.sha256) {
        throw 'Candidate and standalone manifest differ.'
    }
    for ($index = 0; $index -lt @($manifest.inputs).Count; $index++) {
        $manifestInput = $manifest.inputs[$index]
        $candidateInput = $candidate.manifest.inputs[$index]
        if ([string] $candidateInput.path -cne [string] $manifestInput.path -or [long] $candidateInput.bytes -ne [long] $manifestInput.bytes -or [string] $candidateInput.sha256 -cne [string] $manifestInput.sha256) {
            throw 'Candidate and standalone manifest inputs differ.'
        }
    }
    if (@($candidate.pack_metadata).Count -ne 1) { throw 'Candidate archive inventory is incomplete.' }
    $pack = $candidate.pack_metadata[0]
    if ($pack.name -cne 'vida-agent' -or $pack.version -cne '0.1.2' -or $pack.filename -cne 'vida-agent-0.1.2.tgz' -or $candidate.archive_sha256 -cnotmatch '^[a-f0-9]{64}$') {
        throw 'Candidate package identity differs.'
    }
    $manifestEntries = @($pack.files | Where-Object { $_.path -ceq 'dist/standalone/manifest.json' })
    $assetEntries = @($pack.files | Where-Object { $_.path -ceq ('dist/standalone/' + $manifest.asset.file) })
    if ($manifestEntries.Count -ne 1 -or [long] $manifestEntries[0].size -ne $manifestFile.Length -or $assetEntries.Count -ne 1 -or [long] $assetEntries[0].size -ne [long] $manifest.asset.bytes) {
        throw 'Candidate package file inventory differs.'
    }
    $receiptNames = @($receipt.PSObject.Properties.Name | Sort-Object)
    $expectedReceiptNames = @('archive_sha256', 'phase', 'request_id', 'run_attempt', 'run_id', 'schema', 'source_binding', 'status' | Sort-Object)
    if ([string]::Join(',', $receiptNames) -cne [string]::Join(',', $expectedReceiptNames) -or $receipt.schema -cne 'VidaCIPhaseResult/v1' -or $receipt.phase -cne 'native-build' -or $receipt.status -cne 'passed' -or $receipt.archive_sha256 -cne $candidate.archive_sha256 -or $receipt.source_binding -cne $candidate.source_binding -or $receipt.request_id -cnotmatch '^[A-Za-z0-9][A-Za-z0-9-]{0,95}$' -or $receipt.run_id -cnotmatch '^\d+$' -or [long] $receipt.run_attempt -lt 1) {
        throw 'Native-build receipt is not a successful exact formation receipt.'
    }
    $archive = Get-CheckedFileHash (Join-Path $artifactRoot $pack.filename) (240L * 1024 * 1024)
    if ($archive.Sha256 -cne $candidate.archive_sha256) { throw 'Native archive bytes differ from candidate.' }
    $assetSource = Join-Path $artifactRoot $manifest.asset.file
    $asset = Get-CheckedFileHash $assetSource (240L * 1024 * 1024)
    if ($asset.Length -ne [long] $manifest.asset.bytes -or $asset.Sha256 -cne $manifest.asset.sha256) { throw 'Native executable bytes differ from manifest.' }

    $localAppData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
    $environmentLocalAppData = [Environment]::GetEnvironmentVariable('LOCALAPPDATA')
    if ([string]::IsNullOrWhiteSpace($localAppData) -or [string]::IsNullOrWhiteSpace($environmentLocalAppData) -or [IO.Path]::GetFullPath($localAppData) -ine [IO.Path]::GetFullPath($environmentLocalAppData)) {
        throw 'Current-user LOCALAPPDATA location is unavailable or redirected.'
    }
    Assert-NoReparseDirectoryChain $localAppData
    $productRoot = Join-Path $localAppData 'Programs\vida-agent'
    Assert-NoReparseDirectoryChain (Join-Path $localAppData 'Programs') -AllowMissing
    if ($null -ne (Get-PathInfo $productRoot)) { throw 'Existing native destination requires inspection; this adapter is first-install only.' }
    $releaseRoot = Join-Path (Join-Path $productRoot 'releases') ('0.1.2-' + $script:operationId)
    $packageRoot = Join-Path $releaseRoot 'package'
    $standaloneRoot = Join-Path (Join-Path $packageRoot 'dist') 'standalone'
    $binRoot = Join-Path $productRoot 'bin'
    $pathCommand = Join-Path $binRoot 'vida-agent.exe'
    $checkRoot = Join-Path (Join-Path $productRoot 'checks') ('first-install-' + $script:operationId)
    foreach ($destination in @($productRoot, (Join-Path $productRoot 'releases'), $releaseRoot, $packageRoot, (Join-Path $packageRoot 'dist'), $standaloneRoot, $binRoot, (Join-Path $productRoot 'checks'), $checkRoot)) {
        Assert-NoReparseDirectoryChain $destination -AllowMissing
        if ($null -ne (Get-PathInfo $destination)) { throw "Unexpected prior destination requires inspection: $destination" }
    }
    foreach ($destinationFile in @((Join-Path $standaloneRoot 'manifest.json'), (Join-Path $standaloneRoot $manifest.asset.file), $pathCommand)) {
        Assert-NoReparseDirectoryChain ([IO.Path]::GetDirectoryName($destinationFile)) -AllowMissing
        if ($null -ne (Get-PathInfo $destinationFile)) { throw "Unexpected prior file requires inspection: $destinationFile" }
    }

    $script:effectStarted = $true
    $programsRoot = Join-Path $localAppData 'Programs'
    if ($null -eq (Get-PathInfo $programsRoot)) { New-ExclusiveDirectory $programsRoot }
    New-ExclusiveDirectory $productRoot
    New-ExclusiveDirectory (Join-Path $productRoot 'releases')
    New-ExclusiveDirectory $releaseRoot
    New-ExclusiveDirectory $packageRoot
    New-ExclusiveDirectory (Join-Path $packageRoot 'dist')
    New-ExclusiveDirectory $standaloneRoot
    New-ExclusiveDirectory $binRoot
    New-ExclusiveDirectory (Join-Path $productRoot 'checks')
    New-ExclusiveDirectory $checkRoot
    Copy-CheckedFile (Join-Path $artifactRoot 'manifest.json') (Join-Path $standaloneRoot 'manifest.json') (8L * 1024 * 1024) $manifestFile.Length $manifestFile.Sha256
    Copy-CheckedFile $assetSource (Join-Path $standaloneRoot $manifest.asset.file) (240L * 1024 * 1024) ([long] $manifest.asset.bytes) $manifest.asset.sha256
    Copy-CheckedFile $assetSource $pathCommand (240L * 1024 * 1024) ([long] $manifest.asset.bytes) $manifest.asset.sha256
    Assert-NoReparseDirectoryChain $standaloneRoot
    Assert-NoReparseDirectoryChain $binRoot

    $versionOutput = Invoke-InstalledCommand $pathCommand 'version' $checkRoot
    $versionResult = $versionOutput | ConvertFrom-Json -ErrorAction Stop
    $versionProperties = @($versionResult.PSObject.Properties.Name | Sort-Object)
    if ([string]::Join(',', $versionProperties) -cne 'name,schema,version' -or $versionResult.schema -cne 'VidaAgentPackage/v1' -or $versionResult.name -cne 'vida-agent' -or $versionResult.version -cne '0.1.2') {
        throw 'Installed native version postcheck differs.'
    }
    $helpOutput = Invoke-InstalledCommand $pathCommand '--help' $checkRoot
    $helpResult = $helpOutput | ConvertFrom-Json -ErrorAction Stop
    $expectedCommands = @('run', 'init', 'install', 'reconcile-artifacts', 'documentation-clear', 'scope', 'development-controller', 'instructions', 'version')
    $actualCommands = @($helpResult.commands | ForEach-Object { [string] $_ })
    if ($helpResult.schema -cne 'VidaAgentCommandResult/v1' -or $helpResult.status -cne 'help' -or $actualCommands.Count -ne $expectedCommands.Count -or [string]::Join("`n", $actualCommands) -cne [string]::Join("`n", $expectedCommands)) {
        throw 'Installed native help postcheck differs.'
    }

    [Console]::Out.WriteLine('First install completed for vida-agent 0.1.2.')
    [Console]::Out.WriteLine('Command: ' + $pathCommand)
    [Console]::Out.WriteLine('Persistent user PATH was not changed. Add this directory to your user PATH if desired: ' + $binRoot)
    [Console]::Out.WriteLine('This first-install adapter does not upgrade an existing native installation or establish release qualification or Runtime acceptance.')
} catch {
    if ($script:effectStarted) {
        [Console]::Error.WriteLine('First-install status: PARTIAL/UNKNOWN for operation ' + $script:operationId + '. Retain created files and directories, inspect them before any retry, and do not delete or overwrite them automatically.')
        foreach ($createdPath in $script:createdPaths) { [Console]::Error.WriteLine('Created path: ' + $createdPath) }
    } else {
        [Console]::Error.WriteLine('First-install status: BLOCKED before mutation. No installation path was intentionally changed.')
    }
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
