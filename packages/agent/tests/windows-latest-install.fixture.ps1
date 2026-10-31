#requires -Version 5.1
[CmdletBinding()]
param([string] $Installer)
$ErrorActionPreference = 'Stop'
if (-not $PSBoundParameters.ContainsKey('Installer')) { $Installer = Join-Path $PSScriptRoot '../tooling/install-windows.ps1' }
Import-Module (Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Utility\Microsoft.PowerShell.Utility.psd1') -ErrorAction Stop
$tokens = $null
$parseErrors = $null
$scriptAst = [Management.Automation.Language.Parser]::ParseFile((Resolve-Path -LiteralPath $Installer), [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw ($parseErrors | Out-String) }
foreach ($name in @('Assert-SafePath', 'Get-FileDigest', 'Copy-Limited', 'New-HttpsRequest', 'Save-HttpsFile', 'Get-LatestNativeRelease')) {
    $definitions = @($scriptAst.FindAll({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -ceq $name }, $true))
    if ($definitions.Count -ne 1) { throw "Expected one maintained function: $name" }
    . ([scriptblock]::Create($definitions[0].Extent.Text))
}

class FixtureResponse {
    [int] $StatusCode
    [long] $ContentLength
    [hashtable] $Headers
    [byte[]] $Bytes
    FixtureResponse([int] $status, [byte[]] $bytes, [string] $location) {
        $this.StatusCode = $status
        $this.Bytes = $bytes
        $this.ContentLength = $bytes.Length
        $this.Headers = @{ Location = $location }
    }
    [IO.Stream] GetResponseStream() { return [IO.MemoryStream]::new($this.Bytes, $false) }
    [void] Dispose() { }
}
class SlowFixtureStream : IO.MemoryStream {
    [Diagnostics.Stopwatch] $Clock
    [int] $Reads
    SlowFixtureStream([byte[]] $bytes, [Diagnostics.Stopwatch] $clock) : base($bytes, $false) { $this.Clock = $clock }
    [int] Read([byte[]] $buffer, [int] $offset, [int] $count) {
        $this.Reads++
        if ($this.Reads -eq 2) {
            $this.Clock.Start()
            [Threading.Thread]::Sleep(30)
        }
        return ([IO.MemoryStream]$this).Read($buffer, $offset, 1)
    }
}
class FixtureRequest {
    [bool] $AllowAutoRedirect
    [int] $Timeout
    [int] $ReadWriteTimeout
    [string] $UserAgent
    [FixtureResponse] $Response
    FixtureRequest([FixtureResponse] $response) { $this.Response = $response }
    [FixtureResponse] GetResponse() { return $this.Response }
}
$script:responses = [Collections.Generic.Queue[object]]::new()
$script:requests = [Collections.Generic.List[object]]::new()
function Queue-Response([string] $Url, [int] $Status, [byte[]] $Body, [string] $Location = '') {
    $script:responses.Enqueue(@{ Url = $Url; Response = [FixtureResponse]::new($Status, $Body, $Location) })
}
function New-HttpsRequest([Uri] $Uri) {
    if ($script:responses.Count -eq 0) { throw "Unexpected request $Uri" }
    $next = $script:responses.Dequeue()
    if ($Uri.AbsoluteUri -cne $next.Url) { throw "Unexpected request $Uri" }
    $request = [FixtureRequest]::new($next.Response)
    $script:requests.Add($request)
    return $request
}
function Expect-Failure([scriptblock] $Action, [string] $Pattern) {
    $failed = $false
    try { & $Action } catch {
        if ($Pattern -and $_.Exception.Message -notmatch $Pattern) { throw }
        $failed = $true
    }
    if (-not $failed) { throw 'Expected operation to fail.' }
}
function Hash([byte[]] $Bytes) {
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($algorithm.ComputeHash($Bytes))).Replace('-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose() }
}
function Utf8([string] $Text) { return ,([Text.Encoding]::UTF8.GetBytes($Text)) }

$root = Join-Path ([IO.Path]::GetTempPath()) ('vida-latest-fixture-' + [Guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($root)
$completed = $false
try {
    $tag = 'v1.2.3'
    $release = 'https://github.com/pomazanbohdan/vida-stack-lite/releases/download/' + $tag
    $latest = 'https://api.github.com/repos/pomazanbohdan/vida-stack-lite/releases/latest'
    $native = Utf8 'inert executable bytes; not executed'
    $manifest = Utf8 ('{"schema":"VidaStandaloneBuild/v1","version":"1.2.3","target":"bun-windows-x64","asset":{"file":"vida-agent-bun-windows-x64.exe","sha256":"' + (Hash $native) + '","bytes":' + $native.Length + '}}')
    $sums = Utf8 ((Hash $manifest) + "  vida-agent-bun-windows-x64.manifest.json`n" + (Hash $native) + "  vida-agent-bun-windows-x64.exe`n")
    Queue-Response $latest 200 (Utf8 '{"tag_name":"v1.2.3","draft":false,"prerelease":false}')
    Queue-Response ($release + '/SHA256SUMS-windows-x64') 302 ([byte[]]@()) 'https://release-assets.githubusercontent.com/sums'
    Queue-Response 'https://release-assets.githubusercontent.com/sums' 200 $sums
    Queue-Response ($release + '/vida-agent-bun-windows-x64.manifest.json') 200 $manifest
    Queue-Response ($release + '/vida-agent-bun-windows-x64.exe') 200 $native
    $result = Get-LatestNativeRelease $root
    if ($result.Version -cne '1.2.3' -or $result.InputPath -cne (Join-Path $root 'download')) { throw 'Selected release differs.' }
    if ((Hash ([IO.File]::ReadAllBytes($result.InputPath))) -cne (Hash $native)) { throw 'Native bytes differ.' }
    if ((Hash ([IO.File]::ReadAllBytes((Join-Path $root 'manifest.json')))) -cne (Hash $manifest)) { throw 'Manifest bytes differ.' }
    if ($script:responses.Count -ne 0 -or $script:requests.Count -ne 5) { throw 'Latest selection or download count differs.' }
    foreach ($request in $script:requests) {
        if ($request.AllowAutoRedirect -or $request.Timeout -ne 60000 -or $request.ReadWriteTimeout -ne 60000 -or -not $request.UserAgent) { throw 'Request timeout or redirect contract differs.' }
    }
    $unsafe = Join-Path $root 'unsafe'
    Queue-Response 'https://example.test/start' 302 ([byte[]]@()) 'http://example.test/unsafe'
    Expect-Failure { Save-HttpsFile ([Uri]'https://example.test/start') $unsafe 1024 5 } 'HTTPS'
    if (Test-Path -LiteralPath $unsafe) { throw 'Unsafe redirect wrote a file.' }
    Queue-Response 'https://example.test/credential' 302 ([byte[]]@()) 'https://user:secret@example.test/file'
    Expect-Failure { Save-HttpsFile ([Uri]'https://example.test/credential') $unsafe 1024 5 } 'credentials'
    Queue-Response 'https://example.test/direct' 302 ([byte[]]@()) 'https://example.test/target'
    Expect-Failure { Save-HttpsFile ([Uri]'https://example.test/direct') $unsafe 1024 0 } 'redirect'
    for ($i = 0; $i -lt 6; $i++) { Queue-Response 'https://example.test/loop' 302 ([byte[]]@()) 'https://example.test/loop' }
    Expect-Failure { Save-HttpsFile ([Uri]'https://example.test/loop') $unsafe 1024 5 } 'redirect'
    $oversized = Join-Path $root 'oversized'
    Queue-Response 'https://example.test/large' 200 (Utf8 '0123456789')
    Expect-Failure { Save-HttpsFile ([Uri]'https://example.test/large') $oversized 4 5 } 'Invalid download response'
    $streamed = Join-Path $root 'streamed'
    Queue-Response 'https://example.test/streamed' 200 (Utf8 '0123456789')
    $script:responses.Peek().Response.ContentLength = -1
    Expect-Failure { Save-HttpsFile ([Uri]'https://example.test/streamed') $streamed 4 5 } 'Input exceeds'
    foreach ($badTag in @('v1.2.03', 'v1.2.3/other')) {
        $invalid = Join-Path $root ([Guid]::NewGuid().ToString('N'))
        [void][IO.Directory]::CreateDirectory($invalid)
        Queue-Response $latest 200 (Utf8 ('{"tag_name":"' + $badTag + '","draft":false,"prerelease":false}'))
        Expect-Failure { Get-LatestNativeRelease $invalid } 'Latest release identity'
    }
    $bad = Join-Path $root 'bad'
    [void][IO.Directory]::CreateDirectory($bad)
    Queue-Response $latest 200 (Utf8 '{"tag_name":"v1.2.3","draft":false,"prerelease":false}')
    Queue-Response ($release + '/SHA256SUMS-windows-x64') 200 (Utf8 ('0' * 64 + "  vida-agent-bun-windows-x64.exe`n"))
    Expect-Failure { Get-LatestNativeRelease $bad } 'checksums are incomplete'
    $tampered = Join-Path $root 'tampered'
    [void][IO.Directory]::CreateDirectory($tampered)
    Queue-Response $latest 200 (Utf8 '{"tag_name":"v1.2.3","draft":false,"prerelease":false}')
    Queue-Response ($release + '/SHA256SUMS-windows-x64') 200 $sums
    Queue-Response ($release + '/vida-agent-bun-windows-x64.manifest.json') 200 $manifest
    Queue-Response ($release + '/vida-agent-bun-windows-x64.exe') 200 (Utf8 'changed executable')
    Expect-Failure { Get-LatestNativeRelease $tampered } 'Release bytes differ'
    $wrongVersion = Join-Path $root 'wrong-version'
    [void][IO.Directory]::CreateDirectory($wrongVersion)
    $wrongManifest = Utf8 ([Text.Encoding]::UTF8.GetString($manifest).Replace('1.2.3', '1.2.4'))
    $wrongSums = Utf8 ((Hash $wrongManifest) + "  vida-agent-bun-windows-x64.manifest.json`n" + (Hash $native) + "  vida-agent-bun-windows-x64.exe`n")
    Queue-Response $latest 200 (Utf8 '{"tag_name":"v1.2.3","draft":false,"prerelease":false}')
    Queue-Response ($release + '/SHA256SUMS-windows-x64') 200 $wrongSums
    Queue-Response ($release + '/vida-agent-bun-windows-x64.manifest.json') 200 $wrongManifest
    Queue-Response ($release + '/vida-agent-bun-windows-x64.exe') 200 $native
    Expect-Failure { Get-LatestNativeRelease $wrongVersion } 'Manifest differs'
    if ($script:responses.Count -ne 0) { throw 'Fixture response was not consumed.' }
    # A release asset redirect must not reach an unqualified host.
    $unqualified = Join-Path $root 'unqualified-host'
    Queue-Response ($release + '/SHA256SUMS-windows-x64') 302 ([byte[]]@()) 'https://unqualified.example.test/sums'
    Queue-Response 'https://unqualified.example.test/sums' 200 $sums
    Expect-Failure { Save-HttpsFile ([Uri]($release + '/SHA256SUMS-windows-x64')) $unqualified 1024 5 'github.com' } 'host'
    if (Test-Path -LiteralPath $unqualified) { throw 'Unqualified redirect wrote a file.' }
    if ($script:responses.Count -ne 1) { throw 'Unqualified host was contacted.' }
    $script:responses.Clear()
    foreach ($location in @('https://release-assets.githubusercontent.com.evil.test/file', 'https://release-assets.githubusercontent.com:444/file', 'http://release-assets.githubusercontent.com/file', 'https://user:secret@release-assets.githubusercontent.com/file')) {
        Queue-Response ($release + '/asset') 302 ([byte[]]@()) $location
        Expect-Failure { Save-HttpsFile ([Uri]($release + '/asset')) $unqualified 1024 5 'github.com' } ''
        if ((Test-Path -LiteralPath $unqualified) -or $script:responses.Count -ne 0) { throw 'Invalid redirect was contacted or wrote a file.' }
    }
    Expect-Failure { Save-HttpsFile ([Uri]'https://unqualified.example.test/start') $unqualified 1024 5 'github.com' } 'host'
    Expect-Failure { Save-HttpsFile ([Uri]'https://github.com:444/file') $unqualified 1024 5 'github.com' } 'port'
    Queue-Response $latest 302 ([byte[]]@()) 'https://release-assets.githubusercontent.com/metadata'
    Expect-Failure { Save-HttpsFile ([Uri]$latest) $unqualified 1024 5 'api.github.com' } 'host'
    if ($script:responses.Count -ne 0) { throw 'Unexpected metadata redirect request.' }
    $explicit = Join-Path $root 'explicit-source'
    Queue-Response 'https://example.test:444/file' 200 (Utf8 'explicit bytes')
    Save-HttpsFile ([Uri]'https://example.test:444/file') $explicit 1024 0
    if ([IO.File]::ReadAllText($explicit) -cne 'explicit bytes') { throw 'Explicit HTTPS source changed.' }
    $clock = [Diagnostics.Stopwatch]::StartNew()
    $timeInput = [IO.MemoryStream]::new((Utf8 'bounded input'), $false)
    $timeOutput = [IO.MemoryStream]::new()
    try {
        Expect-Failure { [void](Copy-Limited $timeInput $timeOutput 1024 $clock 0) } 'time limit'
        if ($timeOutput.Length -ne 0) { throw 'Expired download wrote bytes.' }
    } finally { $timeInput.Dispose(); $timeOutput.Dispose() }
    $slowClock = [Diagnostics.Stopwatch]::new()
    $slowInput = [SlowFixtureStream]::new((Utf8 'slow drip bytes'), $slowClock)
    $slowOutput = [IO.MemoryStream]::new()
    try {
        Expect-Failure { [void](Copy-Limited $slowInput $slowOutput 1024 $slowClock 5) } 'time limit'
        if ($slowInput.Reads -ne 2 -or $slowOutput.Length -ne 1) { throw 'A read exceeding the limit wrote bytes or started another read.' }
    } finally { $slowInput.Dispose(); $slowOutput.Dispose() }
    $completed = $true
    Write-Output 'PASS: latest selection, tag-bound assets, digest checks, redirects and timeout settings'
} finally {
    if ($completed) { Remove-Item -LiteralPath $root -Recurse -Force }
    else { Write-Warning "Retained failed fixture: $root" }
}
