# Cloud development tools

Owner: repository maintainer. This reference owns tool selection and Linux-host
setup. Product execution and evidence gates remain with lifecycle and TESTING.
Tool/archive/model pins are in [cloud-tooling.lock.json](cloud-tooling.lock.json).
The [startup patch](cloud-environment.patch.json) is a repository proposal.
The available provider runtime-status API cannot save it. Activated provider
configuration and a fresh-session startup observation remain required.

## Deployment setup

Use Linux x86_64 with glibc >=2.35 and the package-selected Bun. Setup requires
curl, tar, unzip, getconf and taskset. The Pstack phase additionally requires Codex.
Run from the checkout root with the host proxy and CA settings inherited:

```sh
export PATH="$HOME/.local/bin:$HOME/.bun/bin:$PATH"
bun tooling/agent/cloud-tooling-setup.ts
. "$HOME/.cache/vida-cloud-tooling/environment.sh"
bun tooling/agent/cloud-pstack-setup.ts --install
```

Native binaries live in ~/.local/bin; verified receipts and disk-backed scratch
live in ~/.cache/vida-cloud-tooling. Repeat setup reuses verified downloads.
It provisions the configured semantic model but never automatically indexes Source.
It copies the qualified executing Bun to persistent host storage; it cannot
bootstrap Bun in an image without Bun. Build/install run no product suites.

Profile adoption preserves unrelated bytes. An intact managed source block is
unchanged; a marker-only block can be completed. Ambiguous or unowned trailing
content rejects instead of deleting user settings. Non-login hosts need the
explicit startup source or persistent PATH, TMPDIR and VIDA_VEX_CPU variables.
Configuration changes require repeating their focused host qualification.

## Bootstrap and ownership

Read AGENTS.md -> AGENT.sidecar.md before implementation search or delegation.
Read declared canonical workflow paths literally, including ignored `.agent/`
files. Their omission from `rg --files` is not absence. Anchor reads to this
checkout root; a copied fixture's matching path is not the canonical plan.
Select one tool by intent, using the already-selected paths and inventory:

The repository owner requires Vex for ordinary symbol, concept, reference and
caller navigation whenever the current host index is qualified. Apply this
default on every development contour and in each delegated agent's bootstrap.
Use bounded results and the current Source fallback required below.

| Intent                         | Tool                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| File/name/message/config text  | rg or rg --files; add --hidden for dot-directories           |
| Known symbol body or existence | vex show or vex check; inspect exists, not only exit status  |
| Unknown concept                | vex search with a bounded --limit                            |
| Candidate references or calls  | vex usages --strict, callers or callees                      |
| Related symbol facts           | vex bundle --mode symbol; symbol mode ignores scope filters  |
| Declarations before bodies     | vex outline or the project ast-grep outline skill            |
| Structural patterns            | Scoped ast-grep run/scan after pattern fixture qualification |
| Human file/log context         | Explicit LeanCTX ctx_read/ctx_shell; recover via ctx_expand  |
| Function IDs and numeric proof | Existing Babel inventory, TypeScript and Bun gate owners     |

Search results are candidates, not exhaustive binding, types or deletion proof.
Stale, unsupported, empty or truncated results require current Source fallback.
Use native shell for AST search, machine JSON, diffs, compiler/test failures and
exact evidence. LeanCTX raw output can merge streams, redact and truncate.

The lead owns staged checks and Git mutations. Delegated readers make no Git
calls during those checks. Outside that freeze, use `git --no-optional-locks`
for status/diff inspection: default status can refresh the index and invalidate
the hook's captured identity even when staged content is unchanged. Keep the
identity guard strict; serialize inspection instead of bypassing it.

Vex is the single primary index. ast-index and its original skill are inactive
fallback material; never maintain both indexes simultaneously. A switch has one
refresh owner. Unsupported configuration/JSON remains on rg.

## Vex readiness and resource budget

Semantic and synchronous auto-update are configured, with async_update=false.
The lead prepared the full current checkout index on 2026-10-14 and qualified
semantic search plus synchronous refresh on a real Source correction. See WORK
for exact receipts and limits. A fresh host still needs its own preparation;
tool installation or a prior host's receipt does not establish current readiness.
Before that preparation succeeds, use rg/ast-grep and avoid a cold semantic rebuild
through an ordinary query.

One lead prepares the index separately after static checks:

```sh
. "$HOME/.cache/vida-cloud-tooling/environment.sh"
bun tooling/agent/cloud-tooling-setup.ts --prepare-index
taskset --cpu-list "$VIDA_VEX_CPU" vex search "retry recovery" --limit 10
```

The first allowed CPU is discovered from /proc/self/status. taskset bounds ONNX
threads; --jobs bounds parsing, not embedding batch size. Six GiB cgroup headroom
is an admission margin, not a guaranteed maximum. Inspect current host memory
before preparation. Preserve retained failed/UNKNOWN fixtures; future scratch
uses disk-backed TMPDIR. Never overlap cold indexing with compilers/coverage.

Ordinary Vex queries refresh under its native single-writer lock after readiness.
Auto-update runs at query time, not as a background watcher. Check its terminal
result and returned freshness; enabling it does not guarantee a successful refresh.
No watchers, per-agent rebuilds or second coordinators are needed. The lead may
warm one update after a large settled edit. Stop all Vex calls during frozen
numeric/runtime measurements. Outside measurements, --no-stale-check may serve
a deliberately frozen pre-warmed snapshot with freshness labeled unverified.
There is no --no-auto-update flag.

Inspect `vex status --path <repository-root> --coverage --format json` before
relying on index coverage. Commands run from a package directory otherwise select
a different index. Check unsupported paths, missing files and embeddings separately.
An incremental update freezes clusters and may set clusters_stale=true even when
symbol bodies are current; do not rebuild the full index solely for that flag.
Semantic results and reference edges remain candidates, never exhaustive type or
function-coverage proof. Confirm edits against current Source bytes.
Tool setup prefetches the pinned MiniLM files with curl and verified hashes
because the host proxy CA is rejected by the upstream model downloader.
It never disables TLS. Cache layout follows the qualified fastembed/hf-hub
adapter; HF_HOME or VEX_CACHE_DIR/XDG changes its location. refs/main contains
the exact revision without a newline. Tool caches stay outside product databases.

## LeanCTX qualification

.codex/config.toml registers one project MCP server. Actual host registration
requires a live tools/list containing exactly ctx_shell, ctx_read, ctx_expand
and ctx_context. ctx_call, automatic capture, shadows, instruction injection,
proxies and background search remain disabled. Setup owns only its marked global
config and refuses an unrelated existing config; it trusts the reviewed project
overlay. Global-only controls require that config even with a project overlay.

Successful MCP transport is not command PASS. Inspect returned exit status.
Recover existing archives before expensive reruns, then use a native current read
to guard edits. Git shell archives preserve compressor summaries, including
omission markers, rather than exact original stdout. Full file delivery/recovery
has its own qualified control. Archives have the tool's 72-hour/500-MB bounds.

## Pstack provisioning and qualification

The repository sidecar selects Pstack for every development contour. Read its
installed `skills/poteto-mode/SKILL.md` and the relevant focused leaves once for
the task. Resolve the enabled `pstack@open-pstack` source path from
`codex plugin list --json`; a catalog entry proves availability, not skill use.
Do not copy a prior host's path or skill count into a new host's readiness claim.
The current CLEAR plan, backlog and WORK retain their owners. Native blind Luna,
Root integration/checks/Git and disjoint shared-file assignments are the selected
repository exceptions to Pstack's orchestration defaults.

Before delegation, use the installed Bun `pstack-worker-contract prepare` owner
with parent/provider codex, native route and the assigned access mode. Read its
prepared instructions into the worker brief. The legacy contract is prompt-only;
it does not restrict inherited tools or qualify hard isolation. Keep each result
in its assigned artifact path and independently review it before Source joins.

cloud-pstack-setup.ts --install installs/enables pstack@open-pstack through the
native Codex marketplace, discovers its actual skill path and installs locked
production script dependencies with Bun and lifecycle scripts disabled.
Without --install it checks only the existing installation. Both modes verify
entry-skill availability, model-policy CLI and one enabled trusted SessionStart
hook through the native app-server. They send no model turn or external-provider
request. Actual version and hook hash are printed; no provider sheet or spending
authorization is inferred.

A fresh or changed hook may require review in the native Codex /hooks UI.
The script reports that trust GAP and applies no trust bypass. Current host
qualification passed with Pstack1.15.0,60 discovered plugin skills and a trusted
enabled hook. These are observed installation facts, not pins for every future
host. Root's sidecar owns task-method precedence and native Luna delegation.

## Focused checks

Before publishing changes to GitHub workflows, use the qualified native
actionlint from the tooling lock:

```sh
actionlint -pyflakes= -shellcheck= .github/workflows/*.yml
```

This checks workflow syntax and GitHub expression contexts; it does not claim
shell or Python validation. Plain YAML parsing does not check those contexts.
`runner` is unavailable in job-level env. Resolve runner-local paths in a step
and propagate them through GITHUB_ENV. Source formation/install still run no
test suites, and a static workflow PASS is not an observed CI result.

After a tooling/config change, run setup twice and the relevant check once:

```sh
bun tooling/agent/cloud-tooling-setup.ts
bun tooling/agent/cloud-tooling-check.ts
bun tooling/agent/cloud-pstack-setup.ts
```

These checks do not run product suites or qualify full Vex semantics, saved
provider configuration or VIDA Runtime. ast-grep matching/nonmatching rules,
snapshots and diagnostic-message checks live under .agents/ast-grep. Version
qualification is separate from generated tool output or syntax matches.

Upstream references: [Vex](https://github.com/tenatarika/vex),
[LeanCTX](https://github.com/yvgude/lean-ctx),
[ast-grep](https://ast-grep.github.io/) and
[Pstack](https://github.com/arjitj2/open-pstack).
Pre-cleanup host receipts and detailed findings remain in WORK's Git history at
bbd6e73ed5bb1f98dd79a64980425cf85dae9a4e; current outcomes belong in current WORK.
