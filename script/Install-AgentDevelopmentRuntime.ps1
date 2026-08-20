<#
.SYNOPSIS
Installs and verifies the repository-owned GSD development lifecycle capability.

.DESCRIPTION
Resolves the current managed GSD/Ponytail stack, installs the portable
agent-development-runtime capability into this repository, verifies all eight
lifecycle hook points, and optionally enables native GSD Core Graphify.

The script never patches the managed GSD/Ponytail installation and never
creates root-level GSD project documents. Graphify state is a derived index.

.PARAMETER EnableGraphify
Enables native GSD Core Graphify and auto-update in the namespaced
agent-flow project. The supported local graph builder is checked separately by
the build command; enabling the capability does not fabricate a graph.

.EXAMPLE
pwsh -NoProfile -File .\script\Install-AgentDevelopmentRuntime.ps1 -EnableGraphify
#>
[CmdletBinding()]
param([switch]$EnableGraphify)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
function Assert-TrustedStackPath([string]$Candidate, [string]$Base, [switch]$Leaf) {
  $full = [IO.Path]::GetFullPath($Candidate)
  if ($full.StartsWith('\\') -or -not $full.StartsWith($Base + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Untrusted stack path.' }
  $relative = $full.Substring($Base.Length).TrimStart('\','/')
  $cursor = $Base
  foreach ($part in $relative -split '[\\/]') { if ([string]::IsNullOrWhiteSpace($part) -or $part -eq '.' -or $part -eq '..') { throw 'Malformed stack path.' }; $cursor = Join-Path $cursor $part; if (-not (Test-Path -LiteralPath $cursor)) { throw 'Trusted stack path missing.' }; $item = Get-Item -LiteralPath $cursor -Force; if ($item.LinkType -or (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)) { throw 'Stack reparse point is not trusted.' } }
  if ($Leaf -and -not (Test-Path -LiteralPath $full -PathType Leaf)) { throw 'Trusted stack tool is not a regular file.' }
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
function Set-NativeOpenGsdPolicy([string]$ToolPath) {
  # These are first-party v1.11 features. Keep them in the namespaced
  # workstream config; never create root-level GSD project state.
  $settings = @(
    @('workflow.agent_hint_routing', 'true'),
    @('workflow.plan_drift_precheck', 'true'),
    @('workflow.schema_drift_gate', 'true'),
    @('refactor.trigger_enabled', 'true')
  )
  foreach ($setting in $settings) {
    & node $ToolPath config-set $setting[0] $setting[1] | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Native OpenGSD setting failed: $($setting[0])" }
  }
}
$current = Join-Path $env:LOCALAPPDATA 'CodexHarness\agent-stack\current.txt'
$stackBase = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'CodexHarness\agent-stack'))
$current = Assert-TrustedStackPath $current ([IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'CodexHarness'))) -Leaf
$stackRoot = Assert-TrustedStackPath ((Get-Content -LiteralPath $current -Raw).Trim()) $stackBase
$release = Split-Path -Leaf $stackRoot
if ($release -notmatch '^gsd-1\.11\.[0-9]+_ponytail-4\.9\.[0-9]+$') { throw "Unsupported GSD/Ponytail release '$release'; mutation remains fail-closed." }
$tool = Join-Path (Join-Path (Join-Path (Join-Path $stackRoot 'surface') '.codex') 'gsd-core') 'bin\gsd-tools.cjs'
$tool = Assert-TrustedStackPath $tool $stackBase -Leaf
$capability = Join-Path $root 'agent-runtime\capability'
if (-not (Test-Path -LiteralPath $capability)) { throw "Capability source missing: $capability" }
$env:GSD_PROJECT = 'agent-flow'
Push-Location $root
try {
& node $tool capability install $capability --scope project --yes
if ($LASTEXITCODE -ne 0) { throw 'GSD capability installation failed.' }
& node $tool capability state agent-development-runtime
if ($LASTEXITCODE -ne 0) { throw 'Installed capability is not active.' }
Set-NativeOpenGsdPolicy $tool
$points = @('plan:pre','plan:post','execute:pre','execute:post','verify:pre','verify:post','ship:pre','ship:post')
foreach ($point in $points) {
  & node $tool loop render-hooks $point | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "GSD lifecycle hook preflight failed: $point" }
}
if ($EnableGraphify) {
  Add-GsdGraphifyToolPath
  & node $tool config-set graphify.enabled true
  if ($LASTEXITCODE -ne 0) { throw 'Native Graphify enablement failed.' }
  & node $tool config-set graphify.auto_update true
  if ($LASTEXITCODE -ne 0) { throw 'Native Graphify auto-update configuration failed.' }
  $graphStatusText = (& node $tool graphify status | Out-String)
  if ($LASTEXITCODE -ne 0) { throw 'Native Graphify status failed.' }
  $graphStatus = $graphStatusText | ConvertFrom-Json
  if ($graphStatus.disabled) { throw 'Native Graphify is configured but inactive.' }
}
} finally { Pop-Location }
$forbiddenRootFiles = @('.planning\PROJECT.md','.planning\ROADMAP.md','.planning\REQUIREMENTS.md')
foreach ($relative in $forbiddenRootFiles) {
  if (Test-Path -LiteralPath (Join-Path $root $relative)) { throw "Root-level GSD state is forbidden: $relative" }
}
$graphNote = if ($EnableGraphify) { ' Native Graphify and auto-update are configured; graph state is derived under .planning/graphs.' } else { '' }
Write-Output "Installed and verified agent-development-runtime using $release; all eight lifecycle hook points render; state is namespaced under .planning/agent-flow.$graphNote"
