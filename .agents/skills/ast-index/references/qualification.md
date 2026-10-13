# Installation and qualification

Upstream: https://github.com/defendend/Claude-ast-index-search
Qualified release: **3.56.0**, MIT, Linux x86_64, 2026-10-13.
The parent skill is adapted from `plugin/skills/ast-index/SKILL.md`; unsupported
claims/examples are not adopted. See `../../ast-index.upstream.json` for the
exact revision/source records and `../LICENSE` for the upstream notice.

## Install on a new development host

Choose the latest stable release from the official repository and review its
release notes and command help. Download the native archive for that host;
compare the asset with the SHA-256 digest in GitHub's release metadata before
extracting/installing. Do not execute a remote installer pipeline.
The current host binary is `/home/agent/.local/bin/ast-index`, on PATH.
It requires no Node/npm/Python or VIDA runtime dependency. Do not install the
Claude plugin hooks or a global MCP registration to install this project skill.
Qualify changed behavior before updating the recorded release.

From the repository root, `ast-index rebuild` reads `.ast-index.yaml`.
Use `ast-index stats` / `db-path` to check the selected root and cache.
Keep environment-specific cache paths out of project configuration. No watcher,
Git hook, build/install step or quality gate starts an index refresh implicitly.
An unavailable/unqualified tool falls back to the existing scoped search tools.

## Verified behavior

The owned Bun TS fixture driver ran 31 native CLI invocations with assertions:

| Control | Observation |
| --- | --- |
| TS function/class/interface and TSX component | Named declarations found at expected files/lines |
| Include roots and nested excluded directory | Included Source found; excluded/outside markers absent |
| Outline and re-exports | Outline finds declarations; `imports` lists re-export declaration |
| Limit1 across several symbols | schema2 `pagination.returned=1`, `truncated=true` |
| Direct and aliased calls | Indexed references find real calls; graph resolves the imported alias in the fixture |
| Comments/strings containing call text | Excluded from indexed references; falsely reported by textual `callers` |
| Member receiver | Graph records `receiver_unresolved`; not a complete semantic graph |
| Add before/after update | Ordinary query stays stale; explicit update discovers added file |
| Rename and delete | Update replaces old path and removes deleted symbol |
| Same-size edit restoring prior mtime | Update misses it; rebuild restores the actual definition |
| Graph after index update | Explicit graph status switches from fresh to stale |
| Native agrep bridge | Actual matching call returned; no-match gives `[]` with exit0 |

Initial exclusion control failed when a directory was both an explicit include
root and an exclude. Avoid that overlap: `.ast-index.yaml` includes broad
maintained roots and excludes nested generated/dependency directories. Invalid
exclude patterns are ignored upstream, and malformed YAML can fall back to
defaults; exclusion is not an access-control boundary. Recheck scope after
changing configuration.

On this repository the configured rebuild indexed **435 files, 10,977 symbols
and 136,013 references**. Excluded-path query found **0** files under dependencies,
BASE, temporary, dist or coverage trees. Exact symbol/body/reference queries for
`validateProjectUpgradeOperation` succeeded. Nested `--walk-up` reused the root
index while retaining subtree scoping; root cwd is the normal recipe.

The separately built symbol graph reported 8,139 nodes / 22,789 edges, with 22,703
resolved and 86 ambiguous edges. Only 34,021 of 136,013 references were linked;
22,856 were receiver-unresolved. These tool statistics are not test coverage,
function-inventory totals or proof that unlinked references are defects.
The module graph reports 0 modules; do not advertise it as a qualified package
dependency graph for this repository.

Local artifacts: `.tmp/ast-index-adoption/qualify.ts`,
`qualification-outputs.json`, `qualification-initial-exclude.json`,
`repo-rebuild.log`, `repo-graph.log`, `repo-content.json`, `repo-refs.json` and
`repo-graph-query.json`, `repo-stats.txt` and `repo-excluded-paths.json`.
This is bounded navigation qualification, not a VIDA
product suite or a global speed benchmark. The incomplete coverage/CRAP/mutation
work remains with its existing owners.
