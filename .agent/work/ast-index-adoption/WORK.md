# ast-index project adoption

User on 2026-10-13 requests installation, testing, a project skill and explicit agent
bootstrap guidance for ast-index alongside ast-grep. Existing testing/CLEAR work
and its retained UNKNOWN evidence remain intact; this packet is developer
navigation only, not a runtime engine feature or replacement quality pipeline.

## Plan and ownership

Root installs/tests the native CLI and is the only writer of config/skills/root
instructions/Git. Blind Luna roles review upstream limitations and application
of the skill. Reuse existing `rg`, ast-grep, Babel/TypeScript and owned gates;
no search service, reducer, product dependency, watcher or new hook is needed.

- [x] Inspect current stable release metadata, source, license and command help.
- [x] Install official Linux x86_64 native 3.56.0 after published digest check.
- [x] Qualify isolated TypeScript/TSX fixture and current repository queries.
- [x] Configure maintained roots and install an adapted project skill with MIT
  notice/provenance; update existing sidecar bootstrap routing.
- [x] Fresh blind skill application/review; correct actual gaps.
- [x] Verify docs/config before ordinary-hook publication.

Publication is the final step; its outcome is recorded in Git history and the
completion response, without predicting a commit/hook result in this payload.

## Evidence and decisions

Official source: https://github.com/defendend/Claude-ast-index-search/releases/tag/v3.56.0
Native executable: /home/agent/.local/bin/ast-index (available on PATH).
The existing qualified ast-grep remains 0.50.0. No Node/npm/Python was installed
or executed. The supplied claim that no integration exists is outdated: agrep
delegates to an external binary, without index reuse, include-scope enforcement
or explicit per-file selection. Direct ast-grep remains our structural route.

Two initial blind readers: baseline correctly preserved rg and Babel authority
and treated negative/truncated references cautiously; it did not establish the
incremental metadata blind spot or actual command support. Source review found
mtime-in-seconds+size freshness, separate graph generations and textual callers.
The adapted reference records measured limits rather than adopting upstream
claims of exhaustive usage results, universal-first routing or 17–69x speedup.

Fixture qualification first failed when an explicitly included root was also
excluded. That control is retained in qualification-initial-exclude.json.
The adopted config uses disjoint broad include roots and nested exclusions.
The corrected/enriched fixture runs 31 native commands with assertions: TS/TSX,
scope, declaration/outline/re-export, nested pagination, actual direct+aliased
references, false-positive textual callers, imported graph edge, unresolved
receiver, graph staleness, stale ordinary queries, add/rename/delete, unchanged
size/mtime edit missed by update and repaired by rebuild, actual bridge match
and empty-match exit0. VIDA runtime Source/tests/configuration remain unchanged.

Configured repository index: 435 files / 10,977 symbols / 136,013 references; excluded
dependency/BASE/tmp/dist/coverage path query returns 0. Direct current symbol
lookup finds validateProjectUpgradeOperation at project-upgrade.ts:277; body,
references and symbol-graph query work. Root-cache reuse with nested --walk-up
works while retaining subtree scope. Module graph yields 0 modules. Symbol graph
links 34,021 of 136,013 references and reports unresolved/ambiguous categories;
these are search-tool statistics, never coverage or authoritative function IDs.

Official TypeScript reference advertises an exports command that the installed
CLI rejects with exit2. Keep verified command examples in the project adaptation.
Use the same root/cache and one coordinated refresh after settled edits. Verify
actual Source before edits; rebuild for metadata-preserving or uncertain changes.
Graph refresh is independent and opt-in. Indexes remain outside Git and .vida.

Owned raw artifacts, fixture driver and source archive are in
.tmp/ast-index-adoption/. The skill's references/qualification.md records the
applicable facts and limits; provenance is generated from upstream metadata
and bytes. No product suite or numeric rerun is added for this documentation/
developer-tool installation packet.

Independent application exercised real bounded body/ref/caller/graph queries
and preserved semantic and truncation limits. Clarified that --walk-up only
chooses a parent DB and does not widen the nested cwd subtree filter. Review
requested retaining stats/excluded-path output alongside the already observed
values; saved those cached read-only queries without another source scan.
The bounded application recheck selected root cwd for cross-subtree questions
and a coordinated rebuild for missed metadata changes. Graph refresh remains
an additional explicit step before graph queries, as recorded in the skill.

Final static verification: PASS for YAML configuration, skill frontmatter and
local links, upstream hashes and exact MIT license, all 31 retained CLI receipt
statuses and repository scope artifacts. `git diff --check` PASS. The installed
binary reports `ast-index 3.56.0`. No product suite was repeated for this packet.
