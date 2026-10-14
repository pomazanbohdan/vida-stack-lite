# Cloud development tool template

Repository-owned setup for Linux x86_64/glibc >=2.35. Tool versions, archive
SHA-256 values and the semantic model snapshot are in `cloud-tooling.lock.json`.
These are development-host tools, not VIDA dependencies or runtime databases.
The uploaded minimal AGENTS document is design input; generated `AGENTS.md`
remains intact. `AGENT.sidecar.md` owns project bootstrap.

## Deployment setup

Use this setup command in the Cloud Environment configuration's setup/startup
script, with the checked-out repository as cwd and package-selected Bun available:

```sh
export PATH="$HOME/.local/bin:$HOME/.bun/bin:$PATH"
bun tooling/agent/cloud-tooling-setup.ts
. "$HOME/.cache/vida-cloud-tooling/environment.sh"
```

The reviewable script patch is `cloud-environment.patch.json`; apply its script
through the host's supported environment editor. It is a repository-owned patch
specification, not a claimed vendor API payload. Saving these files does not
update the Cloud source configuration. The available Cloud runtime-status tool
cannot save that configuration. The deployment editor must retain the setup
script and PATH; an interactive shell edit alone does not persist a template.

Setup needs Bun (currently selected by `packages/agent/package.json`), curl, tar,
unzip, getconf and taskset. It inherits the environment's proxy and CA settings. Native
binaries are installed in `~/.local/bin`; verified receipts/staging in
`~/.cache/vida-cloud-tooling`. Repeat runs check installed digests and skip tool
and model downloads when current. The enabled semantic setting automatically prepares
the pinned model. Setup never builds VIDA, runs test suites,
automatically indexes Source, installs interception hooks or changes product/runtime databases.

The setup owns only its marked LeanCTX global config, identifies the real config
path through the installed CLI and preserves any pre-existing unmanaged config.
Some controls are global-only/not merged by the project overlay; the managed
global config ensures `shadow_mode=false`, `path_jail_scope=project`, no automatic
capture and no hook management. Workspace trust is pinned to `.lean-ctx.toml`:
rerun setup after that file changes. Leave tool_profile unset/empty. Inspect any
LEAN_CTX_* overrides before accepting the effective configuration.

## Bootstrap and ownership

| Intent                                        | Minimal operation                                              |
| --------------------------------------------- | -------------------------------------------------------------- |
| File/name/message/configuration text          | `rg`, `rg --files`                                             |
| Known symbol body / existence                 | `vex show X` / `vex check X`                                   |
| Unknown concept                               | `vex search "concept" --limit 10`                              |
| Candidate references / calls                  | `vex usages X --strict`, `vex callers X`, `vex callees X`      |
| Several related symbol facts                  | `vex bundle --mode symbol --symbol X` (ignores scope filters)  |
| Navigation                                    | `vex outline path/to/file.ts`, existing ast-grep outline skill |
| Structural patterns / tested rules            | scoped `ast-grep run` / `scan`                                 |
| Human file/log context                        | `ctx_read`, `ctx_shell`; recover via `ctx_expand`              |
| Function IDs, type/semantic and numeric proof | existing Babel/TypeScript/Bun gate owners                      |

Vex is the sole primary navigation index. Semantic and auto-update are enabled,
with async_update=false: a stale query waits for refresh rather than returning
a knowingly old answer. Vex serializes index writes with its native advisory
lock; no watcher or second cache coordinator is installed. ast-index is inactive
fallback material. One lead builds the initial index separately from install:

```sh
. "$HOME/.cache/vida-cloud-tooling/environment.sh"
bun tooling/agent/cloud-tooling-setup.ts --prepare-index
# Subsequent ordinary navigation; auto-update maintains freshness.
taskset --cpu-list "$VIDA_VEX_CPU" vex search "retry recovery" --limit 10
```

Prefix Vex calls with taskset as above. fastembed uses available_parallelism for
ONNX threads; CPU affinity controls this on Linux. --jobs only controls parsing,
not embedding batch size (fixed by this Vex build). The first allowed CPU is
selected from /proc/self/status by setup, not assumed to be CPU 0 on future hosts.
Do not add redundant per-agent update/rebuild calls. After a large settled edit
batch, the lead can warm one `vex update --semantic` before parallel navigation.
Stop Vex calls during frozen runtime/numeric measurement. For a deliberately
frozen pre-warmed navigation snapshot outside measurement, use --no-stale-check
on commands that support it and explicitly report freshness as unverified.
There is no --no-auto-update flag. Missing indexes still require lead bootstrap.

This Cloud host has a 16-GiB cgroup limit and RAM-backed /tmp and /dev/shm. Retained
fixtures occupied most of that budget when the unrestricted semantic build was
SIGKILL/137. Setup now creates disk-backed scratch under
~/.cache/vida-cloud-tooling/tmp and emits environment.sh with TMPDIR and the
first allowed VIDA_VEX_CPU. Apply those values as host runtime variables when
startup shell exports do not persist. Existing retained evidence is not moved
or deleted. Setup appends an idempotent source block to the first Bash login
profile without rewriting its original bytes; current login shells consequently
use the disk-backed TMPDIR. Hosts that do not load login profiles need the
explicit startup source or runtime variables. CPU affinity is a tested operating-system control, not a guarantee
of low embedding memory; full semantic readiness remains tied to actual success. --prepare-index checks
for 6 GiB cgroup headroom before launching; this is an admission margin, not a
guaranteed maximum. Run static checks first and serialize heavy qualification.
With the current retained tmpfs evidence, the guarded cold build rejects before
effects. A one-CPU attempt was also SIGKILL/137 after 9m23s when a compiler ran
alongside it. Until a cold build succeeds, status reports embeddings=false;
use rg/ast-grep and do not start auto-updating queries that would rebuild it.

The MiniLM downloader rejects the Cloud proxy CA. Setup prefetches the pinned
model through curl and verifies every file without disabling TLS. The cache
adapter follows the inspected fastembed/hf-hub layout; it is not an upstream CLI
feature. Cache location follows VEX_CACHE_DIR/XDG or HF_HOME. refs/main must have
no trailing newline. Tool/model/index caches remain outside the repository.
Optional --with-semantic-model still explicitly prepares the model if semantic
is disabled in a reviewed future configuration.

Use `vex status --coverage --format json` to inspect unsupported/excluded files;
keep packages/agent/bin in scope and use rg for unsupported JSON/config text.
Top-K and strict-reference candidates never establish exhaustive semantic proof
or permission to delete. Preserve current Source, TS binding checks and all gates.

## LeanCTX integration and evidence

`config.toml` registers one project-scoped Codex CLI MCP server. Cloud/Desktop
hosts must actually support/loading this configuration; existing sessions do not
gain tools merely because a file was written. The server's actual `tools/list`
must contain exactly ctx_shell, ctx_read, ctx_expand and ctx_context, with ctx_call
disabled. No Vex/ast-grep MCP servers, init/onboard/wrap, aliases, proxy, native-tool
denials or automatic instructions/skills are installed.

Use LeanCTX only for explicit human context delivery. Even raw=true merges
stdout/stderr, redacts and can truncate; it is not byte-exact evidence. Run Vex,
ast-grep, machine JSON, diffs, test/compiler failures and final assurance through
native shell. Nonzero ctx_shell status may appear as `[exit:N]` despite isError=false;
never interpret the MCP success envelope as command PASS. Prefer archived recovery
before repeating expensive commands; keep native current read/edit guards.
The observed Git archive restores the compressor summary, including omitted-commit
markers, rather than original stdout. `ctx_expand` cannot reconstruct content
that the command compressor dropped. Full file delivery was verified separately.
Archives have 72-hour/500-MB bounds. Compression is not a numeric quality proof.
All existing coverage, complexity/CRAP, mutation and UNKNOWN rules remain intact.

## Qualification

The scoped `no-external-node` YAML rule has matching/nonmatching cases and
checked snapshots under `.agents/ast-grep`; use `ast-grep test` and a targeted
`ast-grep scan`. It detects literal Bun spawn argv only, not dynamic bindings or
SDK consumer code; no new automatic CI gate is activated.

Run setup twice, then `bun tooling/agent/cloud-tooling-check.ts` for versions,
actual four-tool MCP listing, explicit read, failed-command status and recovery.
This focused tool check does not launch product test suites. Verify index coverage
and one actual TS body/search separately under the lead's refresh ownership.
The project MCP surface was qualified on this Linux host; current Cloud model
registration and saving the provider template are distinct, externally pending
operations until supported configuration has been activated.

Upstream sources: [Vex v1.27.4](https://github.com/tenatarika/vex/releases/tag/v1.27.4)
(MIT), [LeanCTX v3.11.4](https://github.com/yvgude/lean-ctx/releases/tag/v3.11.4)
(public host Apache-2.0, see release LICENSE.md/notices),
[ast-grep 0.50.0](https://github.com/ast-grep/ast-grep/releases/tag/0.50.0) (MIT).

Observed qualification (2026-10-14): repeat setup skipped all three verified
binaries; live MCP offered exactly four tools without competing initialization
instructions; failed Git command retained exit 1; full file delivery/recovery
matched Source. Git-summary archive did not contain complete native stdout, so
it is explicitly excluded from exact evidence. TS check passed with zero errors;
ast-grep matching/nonmatching snapshots and diagnostic message were verified.
Vex structural/BM25 index and actual TS strict-reference candidates worked;
The earlier semantic exit 137 remains failed evidence. Enabling the settings is
not a claim of completed semantic qualification; inspect the latest build and
semantic-channel result before claiming readiness.

Updated qualification (2026-10-14): a disk-backed isolated fixture passed model
loading, a semantic index, an automatic refresh after a Source edit, and an
actual semantic_cosine result. A changed-symbol check with --no-stale-check kept
the previous snapshot; the next normal check refreshed it. `vex check` reports
exists=false with exit 0, so inspect the JSON boolean. This small pilot does not
qualify the full maintained Source index, which still reports embeddings=false.
The cold headroom guard rejected this crowded host before starting Vex; repeat
setup retained the same login profile bytes and verified installed binaries/model.

Setup checks the package's Bun pin and copies that qualified executing Bun into
~/.local/bin, so it remains available outside ephemeral repository scratch.
This does not bootstrap a missing Bun in a fresh image; choose package-selected
Bun in the host template before running the TS setup script.
