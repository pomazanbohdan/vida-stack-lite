---
name: ast-index
description: Use when navigating TypeScript or TSX definitions, indexed references, bounded symbol bodies, file outlines or dependency candidates in this repository, or when diagnosing ast-index freshness and scope.
---

# ast-index navigation

Read the repository's `AGENTS.md` and `AGENT.sidecar.md` first. This is the
project adaptation of the upstream ast-index skill for the qualified native
3.56.0 CLI. Installation, provenance and observed limitations are in
[qualification](references/qualification.md). It is a development navigation
cache; existing Babel/TypeScript and test evidence retain their authority.

## Choose one tool

| Question | First tool |
| --- | --- |
| File names, symbol-name text, messages, configuration, comments | `rg --files` / scoped `rg` |
| Indexed definitions or reference candidates | `ast-index symbol` / `refs` / `usages` |
| Relevant area described in words | `ast-index explore` with a small `--max-files` |
| Structure of a selected TS file | `ast-index outline`; existing `ast-grep outline` is also available |
| Specific call shape or structural rewrite candidate | Direct `ast-grep run` / `scan` on selected files |
| Function IDs, semantic binding, types, coverage or mutation proof | Existing Babel inventory, TypeScript and owned gates |

Do not launch both AST tools automatically or add a search service/reducer.
Return path, symbol, line/range, relevant fragment and any truncation/freshness
limit. Narrow by file/module before widening results; reuse returned bodies.

## Root and freshness

Run from the repository root with `ast-index --version` checked once per session.
The root `.ast-index.yaml` includes maintained package/test/tooling directories.
The DB lives in the host cache (`ast-index db-path`), never in `.vida` or Git.
Nested invocation can choose another root or restrict results to that subtree.
`--walk-up` can select the parent DB but does not widen the cwd subtree filter;
use the root as working directory for repository-wide questions.

One designated agent owns refreshes after writers join. Build once with
`ast-index rebuild`, then use one `ast-index update` per settled edit batch.
Plain queries do not refresh source. Update uses second-resolution mtime and
size: same-size edits in the same timestamp second, preserved timestamps or an
uncertain change history require one coordinated `rebuild` before relying on
indexed locations. Do not run rebuild per reader or run a background watcher
during frozen verification. Check actual current source before changing it;
an empty index result never proves an export is unused.

## Bounded TypeScript navigation

```sh
# Working directory: repository root, after its refresh owner has finished.
ast-index symbol validateProjectUpgradeOperation --in-file packages/agent/src/config/project-upgrade.ts --limit 3 --format json
ast-index symbol validateProjectUpgradeOperation --in-file packages/agent/src/config/project-upgrade.ts --with-content --limit 1 --format json
ast-index refs validateProjectUpgradeOperation --limit 10 --format json
```

Request `--with-content` only for needed bodies. Read omitted text only when
content is truncated/unavailable or the requested context lies outside the
definition. JSON schema2 has `items` and nested `pagination`; `refs` has separate
definitions/imports/usages and pagination per section. Check `total`, `returned`,
`truncated` and body truncation. ast-index lines are one-based; ast-grep JSON
lines are zero-based. Neither is a maintained function ID.

## Graph and common mistakes

Build the optional graph once when needed: `ast-index graph build`. Inspect
`ast-index graph status --format json`; an index update does not rebuild it.
The refresh owner rebuilds a stale graph before shared graph queries. Use
`graph dependents SYMBOL --limit 10 --format json` and inspect confidence,
ambiguous/dropped edges and truncation. Fresh graph status describes the index
generation, not unobserved disk changes. `deps` is a different module graph;
this repository currently indexes zero modules through that feature.

`refs`/`usages` are indexed name references, not compiler-resolved callers.
`callers`/`call-tree` use live textual scans: comments and strings can be false
positives, and aliases/member receivers can be missed or unresolved. Use them
only for candidate discovery; they cannot authorize deletion or replace Knip.

3.56.0 has an `agrep` bridge, but it reparses through an external ast-grep and
does not reuse the SQLite index. It searches the discovered root, does not
honor the index's include scope, probes `sg` first and treats no matches as
success. Prefer direct `ast-grep` with explicit paths and its project skill.
Upstream examples for `exports` and `search --kind` are not accepted by this
qualified CLI; use `imports` for import/re-export declarations and `--type`.
