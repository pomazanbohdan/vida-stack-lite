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
```

The reviewable script patch is `cloud-environment.patch.json`; apply its script
through the host's supported environment editor. It is a repository-owned patch
specification, not a claimed vendor API payload. Saving these files does not
update the Cloud source configuration. The available Cloud runtime-status tool
cannot save that configuration. The deployment editor must retain the setup
script and PATH; an interactive shell edit alone does not persist a template.

Setup needs Bun (currently selected by `packages/agent/package.json`), curl, tar,
unzip and getconf. It inherits the environment's proxy and CA settings. Native
binaries are installed in `~/.local/bin`; verified receipts/staging in
`~/.cache/vida-cloud-tooling`. Repeat runs check installed digests and skip tool
and model downloads when current. Setup never builds VIDA, runs test suites,
indexes Source, installs hooks or changes product/runtime databases.

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

Vex is the sole primary navigation index. Do not concurrently refresh ast-index
or its graph; its existing CLI/skill remain inactive fallback material. One lead
initializes `vex index --no-semantic --no-pattern-index --jobs 2` and refreshes with
`vex update --no-semantic` after writers join. No watcher/auto-update during frozen
checks. `vex status --coverage --format json` reports unsupported/excluded files;
JSON and other unsupported formats still use rg. Keep `packages/agent/bin` in
scope. Top-K is a preview, not an exhaustive audit. An empty candidate reference
set never establishes safe deletion; verify current Source and TS bindings.

Optional `bun tooling/agent/cloud-tooling-setup.ts --with-semantic-model` prepares
the pinned model cache; default setup avoids this download. The MiniLM downloader rejects the Cloud proxy CA. Setup prefetches the
pinned model through curl, verifies every file, and seeds fastembed/hf-hub's cache
without disabling TLS verification. This cache adapter uses the inspected fastembed/hf-hub layout, not an upstream
CLI feature. Model loading progressed, but full semantic indexing was terminated
with SIGKILL/exit 137; embeddings were not published. `.vex.toml` disables
semantic by default. Structural symbols, BM25 and graphs are qualified; semantic
search requires a separate memory-qualified pilot and is not claimed ready. Cache location follows VEX_CACHE_DIR/XDG
(or HF_HOME, which fastembed overrides directly). Model files and index remain
outside the project. The hf-hub refs/main pointer must have no trailing newline.

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
semantic build exit 137 is retained as failed qualification, not PASS.
