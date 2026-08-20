<#
.SYNOPSIS
Invokes a typed lifecycle gate or native GSD Core Graphify operation.

.DESCRIPTION
Uses the current managed GSD/Ponytail stack and the installed repository
capability. Lifecycle operations are isolated under
.planning/agent-flow/workstreams/<work-id> and validate the durable checkpoint
under .agent/work/<work-id>/resume.json. Graph operations use the derived
.planning/graphs store and never authorize requirements, delivery, or Runtime
acceptance.

.EXAMPLE
pwsh -NoProfile -File .\script\Invoke-AgentDevelopmentRuntime.ps1 -WorkId sample-work -Phase status

.EXAMPLE
pwsh -NoProfile -File .\script\Invoke-AgentDevelopmentRuntime.ps1 -WorkId sample-work -Phase verify -Point pre -ExpectedRevision 12 -SourceRevision current-source

.EXAMPLE
pwsh -NoProfile -File .\script\Invoke-AgentDevelopmentRuntime.ps1 -GraphAction build

.EXAMPLE
pwsh -NoProfile -File .\script\Invoke-AgentDevelopmentRuntime.ps1 -GraphAction query -GraphTerm CaseService
#>
[CmdletBinding()]
param([ValidatePattern('^[a-z0-9][a-z0-9-]*$')][string]$WorkId,
      [ValidateSet('status','plan','execute','verify','ship')][string]$Phase = 'status',
      [ValidateSet('pre','post')][string]$Point = 'pre',
      [int]$ExpectedRevision,
      [string]$SourceRevision,
      [ValidateSet('status','query','diff','build')][string]$GraphAction,
      [ValidateSet('status')][string]$CoordinationAction,
      [string]$GraphTerm)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
function Assert-TrustedStackPath([string]$Candidate, [string]$Base, [switch]$Leaf) {
  $full = [IO.Path]::GetFullPath($Candidate)
  if ($full.StartsWith('\\') -or -not $full.StartsWith($Base + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'DEGRADED: stack path escapes trusted root; mutation gate blocked.' }
  $relative = $full.Substring($Base.Length).TrimStart('\','/')
  $cursor = $Base
  foreach ($part in $relative -split '[\\/]') { if ([string]::IsNullOrWhiteSpace($part) -or $part -eq '.' -or $part -eq '..') { throw 'DEGRADED: malformed stack path; mutation gate blocked.' }; $cursor = Join-Path $cursor $part; if (-not (Test-Path -LiteralPath $cursor)) { throw 'DEGRADED: trusted stack path missing; mutation gate blocked.' }; $item = Get-Item -LiteralPath $cursor -Force; if ($item.LinkType -or (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)) { throw 'DEGRADED: stack reparse point is not trusted; mutation gate blocked.' } }
  if ($Leaf -and -not (Test-Path -LiteralPath $full -PathType Leaf)) { throw 'DEGRADED: trusted stack tool is not a regular file; mutation gate blocked.' }
  return $full
}
function Add-GsdGraphifyToolPath {
  if (Get-Command graphify -ErrorAction SilentlyContinue) { return }
  $uv = Get-Command uv -ErrorAction SilentlyContinue
  if (-not $uv) { return }
  $bin = (& $uv.Source tool dir --bin | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($bin)) { return }
  $candidate = Join-Path ([IO.Path]::GetFullPath($bin)) 'graphify.exe'
  if (Test-Path -LiteralPath $candidate -PathType Leaf) { $env:PATH = "$bin;$env:PATH" }
}
function Initialize-GsdWorkstreamConfig([string]$ToolPath) {
  & node $ToolPath config-set commit_docs false | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Mutation gate blocked: Workstream commit_docs isolation failed.' }
  $settings = @(
    @('workflow.agent_hint_routing', 'true'),
    @('workflow.plan_drift_precheck', 'true'),
    @('workflow.schema_drift_gate', 'true'),
    @('refactor.trigger_enabled', 'true')
  )
  foreach ($setting in $settings) {
    & node $ToolPath config-set $setting[0] $setting[1] | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Mutation gate blocked: native OpenGSD setting failed: $($setting[0])" }
  }
  $projectConfigPath = Join-Path $root '.planning\agent-flow\config.json'
  if (-not (Test-Path -LiteralPath $projectConfigPath -PathType Leaf)) { return }
  $projectConfig = Get-Content -LiteralPath $projectConfigPath -Raw | ConvertFrom-Json
  if ($projectConfig.graphify.enabled -eq $true) {
    & node $ToolPath config-set graphify.enabled true | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Mutation gate blocked: Workstream Graphify activation failed.' }
    & node $ToolPath config-set graphify.auto_update true | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Mutation gate blocked: Workstream Graphify update policy failed.' }
  }
}
function Invoke-TypedLifecycleGate([string]$CapabilityPath, [string]$Verb, [string]$CheckpointPath, [int]$Revision, [string]$RevisionSource, [string]$GatePoint) {
  # The capability CLI deliberately uses Node's default error output. At this
  # boundary preserve its typed code/message instead of relabelling every gate
  # refusal as checkpoint corruption. The capability remains the only runtime
  # authority; this adapter only transports its result across the process edge.
  $adapter = @'
const gate = require(process.argv[1]);
const [verb, checkpointPath, revision, sourceRevision, point] = process.argv.slice(2);
try {
  const input = { checkpointPath, expectedRevision: Number(revision), sourceRevision, point, repoRoot: gate.repositoryRoot };
  const value = verb === 'seal' ? gate.seal(input) : gate.validate(input);
  console.log(JSON.stringify({ ok: true, value }));
} catch (error) {
  console.log(JSON.stringify({ ok: false, code: error && error.code || 'UNCLASSIFIED', message: error && error.message || String(error) }));
  process.exitCode = 1;
}
'@
  $raw = (& node -e $adapter $CapabilityPath $Verb $CheckpointPath $Revision $RevisionSource $GatePoint 2>&1 | Out-String).Trim()
  $exitCode = $LASTEXITCODE
  try { $result = $raw | ConvertFrom-Json -ErrorAction Stop } catch {
    throw "Mutation gate failed: capability result is unavailable or malformed."
  }
  if ($exitCode -eq 0 -and $result.ok -eq $true) { return $result.value }
  $message = [string]$result.message
  if ($result.code -eq 'GATE_BLOCKED' -and -not [string]::IsNullOrWhiteSpace($message)) {
    if ($message -match '^(checkpoint schema/revision|expected revision required or stale|source revision required or stale|checkpoint compare-and-swap mismatch)$') {
      throw "Mutation gate blocked: corrupt/stale checkpoint ($message)"
    }
    throw "Mutation gate blocked [$($result.code)]: $message"
  }
  throw "Mutation gate failed [$($result.code)]: $message"
}
$current = Join-Path $env:LOCALAPPDATA 'CodexHarness\agent-stack\current.txt'
$stackBase = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'CodexHarness\agent-stack'))
$current = Assert-TrustedStackPath $current ([IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'CodexHarness'))) -Leaf
$stackRoot = Assert-TrustedStackPath ((Get-Content -LiteralPath $current -Raw).Trim()) $stackBase
$release = Split-Path -Leaf $stackRoot
if ($release -notmatch '^gsd-1\.11\.[0-9]+_ponytail-4\.9\.[0-9]+$') { throw "DEGRADED: incompatible '$release'; mutation gate blocked." }
$tool = Join-Path (Join-Path (Join-Path (Join-Path $stackRoot 'surface') '.codex') 'gsd-core') 'bin\gsd-tools.cjs'
$tool = Assert-TrustedStackPath $tool $stackBase -Leaf
$env:GSD_PROJECT = 'agent-flow'
if ($WorkId) { $env:GSD_WORKSTREAM = $WorkId }
if ($GraphAction) {
  Add-GsdGraphifyToolPath
  if ($GraphAction -eq 'query' -and [string]::IsNullOrWhiteSpace($GraphTerm)) { throw 'GraphTerm is required for GraphAction=query.' }
  Push-Location $root
  try {
    if ($GraphAction -eq 'build') {
      $preflightText = (& node $tool graphify build | Out-String)
      if ($LASTEXITCODE -ne 0) { throw 'Native Graphify build preflight failed.' }
      $preflight = $preflightText | ConvertFrom-Json
      if ($preflight.disabled) { throw $preflight.message }
      if ($preflight.error) { throw $preflight.error }
      if ($preflight.action -ne 'spawn_agent') { throw 'Native Graphify returned an unsupported build contract.' }
      $graphify = Get-Command graphify -ErrorAction SilentlyContinue
      if (-not $graphify) { throw 'Native Graphify builder missing. Install the GSD-supported graphifyy CLI in the tested range >=0.4.0,<1.0.' }
      # Native GSD Graphify is intentionally local/code-only in this runtime.
      # The derived store may legitimately shrink after corpus routing changes.
      & $graphify.Source update . --force
      if ($LASTEXITCODE -ne 0) { throw 'Native Graphify foreground update failed; prior graph remains authoritative only as stale derived context.' }
      & $graphify.Source cluster-only . --no-label
      if ($LASTEXITCODE -ne 0) { throw 'Native Graphify local clustering failed; prior graph remains authoritative only as stale derived context.' }
      $graphs = Join-Path $root '.planning\graphs'
      New-Item -ItemType Directory -Path $graphs -Force | Out-Null
      foreach ($name in @('graph.json','graph.html','GRAPH_REPORT.md')) {
        $source = Join-Path (Join-Path $root 'graphify-out') $name
        if ($name -ne 'graph.html' -and -not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Native Graphify artifact missing: $name" }
        if (Test-Path -LiteralPath $source -PathType Leaf) { Copy-Item -LiteralPath $source -Destination (Join-Path $graphs $name) -Force }
      }
      & node $tool graphify build snapshot
      if ($LASTEXITCODE -ne 0) { throw 'Native Graphify snapshot failed.' }
      & node $tool graphify status
    } elseif ($GraphAction -eq 'query') {
      & node $tool graphify query $GraphTerm
    } else {
      & node $tool graphify $GraphAction
    }
  } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { throw "Native Graphify $GraphAction failed." }
  return
}
if ($CoordinationAction) {
  $coordination = Join-Path $root 'agent-runtime\lib\workstream-coordination.cjs'
  $adapter = @'
const c=require(process.argv[1]);
console.log(JSON.stringify(c.status(process.argv[2],process.argv[3]||undefined)));
'@
  & node -e $adapter $coordination $root $WorkId
  if ($LASTEXITCODE -ne 0) { throw 'Coordination status unavailable.' }
  return
}
if ([string]::IsNullOrWhiteSpace($WorkId)) { throw 'WorkId is required for lifecycle operations.' }
$checkpoint = Join-Path $root ".agent\work\$WorkId\resume.json"
if (-not (Test-Path -LiteralPath $checkpoint)) { throw "Mutation gate blocked: checkpoint missing $checkpoint" }
if ($Phase -eq 'status') {
  & node (Join-Path $root 'agent-runtime\bin\runtime.cjs') status $checkpoint
  if ($LASTEXITCODE -ne 0) { throw 'Checkpoint status unavailable.' }
  return
}
Initialize-GsdWorkstreamConfig $tool
if ($ExpectedRevision -lt 1 -or [string]::IsNullOrWhiteSpace($SourceRevision)) { throw 'Mutation gate blocked: ExpectedRevision and SourceRevision are required.' }
if ($Phase -eq 'execute' -and $Point -eq 'post') {
  Invoke-TypedLifecycleGate (Join-Path $root '.gsd\capabilities\agent-development-runtime\runtime-gate.cjs') 'seal' $checkpoint $ExpectedRevision $SourceRevision "$Phase`:$Point" | Out-Null
} else {
  Invoke-TypedLifecycleGate (Join-Path $root '.gsd\capabilities\agent-development-runtime\runtime-gate.cjs') 'validate' $checkpoint $ExpectedRevision $SourceRevision "$Phase`:$Point" | Out-Null
}
Push-Location $root
try { & node $tool loop render-hooks "$Phase`:$Point" } finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { throw "GSD hook rendering failed for $Phase`:$Point" }
Write-Output "Ready: $Phase`:$Point workstream=$WorkId namespace=.planning/agent-flow/workstreams/$WorkId"
