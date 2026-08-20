$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$agents = Get-Content -LiteralPath (Join-Path $root 'AGENTS.md') -Raw
$sidecar = Get-Content -LiteralPath (Join-Path $root 'AGENT.sidecar.md') -Raw
$readme = Get-Content -LiteralPath (Join-Path $root 'README.md') -Raw
$rootPackage = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json

if ([Text.Encoding]::UTF8.GetByteCount($agents) -ge 32768) { throw 'AGENTS.md exceeds 32 KiB.' }
foreach ($needle in @(
    'Mandatory bootstrap', 'AGENT.sidecar.md', 'Thinking mode:', 'compact/re-entry',
    'Requirement routing and derived ledgers', 'BR → SR → AC → evidence/GAP',
    'Decision, Code, Static and Runtime', 'Native knowledge graph', 'agent-allocation',
    'request-clarification', 'Logical roles are not automatically separate agents',
    'choose `ask`, `retrieve`, `infer`', 'stable question ID',
    'exactly three fresh history-isolated blind review receipts', 'correction invalidates',
    'automatically enters', 'deployment manifest', 'created files', 'modified files',
    'must not be deployed', 'post-deployment checks', 'never asks permission merely to deliver',
    'post-presentation acceptance', 'push requires')) {
  if (-not $agents.Contains($needle)) { throw "AGENTS missing bootstrap-visible contract: $needle" }
}
if ($agents -notmatch 'Static\s*\r?\n?\s*never closes Runtime') { throw 'AGENTS missing Static/Runtime truthfulness.' }

foreach ($path in @((Join-Path $root 'AGENTS.md'), (Join-Path $root 'AGENT.sidecar.md'), (Join-Path $root 'README.md'))) {
  $content = Get-Content -LiteralPath $path -Raw
  if ($content -match '(?i)(?:[A-Za-z]:\\|/)(?:Users|home|workspace|repos)[^\r\n ]*') { throw "Absolute local path remains in $path" }
  if ($content -match '(?i)https?://[^\s]+/(?:project|tenant|customer)[^\s]*') { throw "Project-specific URL remains in $path" }
}

foreach ($needle in @('Unconfigured Template', 'agent-development-runtime', 'no product', 'fail-closed')) {
  if (-not $sidecar.Contains($needle)) { throw "Sidecar missing neutral contract: $needle" }
}
foreach ($needle in @('portable, host-neutral', 'product implementation', 'agent-runtime/tooling ci', 'agent-runtime/tooling run verify', 'Project binding boundary')) {
  if (-not $readme.Contains($needle)) { throw "README missing product contract: $needle" }
}
foreach ($scriptName in @('agent-runtime:install', 'agent-runtime:test', 'agent-runtime:verify', 'agent-runtime:deep')) {
  if (-not $rootPackage.scripts.PSObject.Properties.Name.Contains($scriptName)) { throw "Root command missing: $scriptName" }
}
if (-not (Test-Path -LiteralPath (Join-Path $root 'agent-runtime\capability\capability.json'))) { throw 'Capability missing.' }
if (-not (Test-Path -LiteralPath (Join-Path $root 'agent-runtime\config\agent-profiles.v1.json'))) { throw 'Agent profiles missing.' }
if (-not (Test-Path -LiteralPath (Join-Path $root 'agent-runtime\config\platform-knowledge.sources.template.json'))) { throw 'Neutral platform knowledge template missing.' }
if (-not (Test-Path -LiteralPath (Join-Path $root '.graphifyignore'))) { throw 'Graphify corpus policy missing.' }
if (Test-Path -LiteralPath (Join-Path $root '.planning\PROJECT.md')) { throw 'Root GSD PROJECT.md must not be created.' }
Write-Output 'policy contract: pass'
