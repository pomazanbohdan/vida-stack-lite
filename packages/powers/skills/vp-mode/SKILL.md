---
name: vp-mode
description: Route a task through the Vida Powers catalog: bind intents, resolve capabilities, search candidates, compose one instruction bundle, and verify the retrieval receipt.
---
# vp-mode

For this project-document mode, read the project sidecar and resolve `<skill-dir>` to its mapped `packages/powers/skills/vp-mode` directory under the explicit project root. These scripts are local development tools, not harness tools. Use explicit root-derived paths from any working directory.

## Route the request

Read the user's request, the effective profile, and the references supplied with the task. Use the profile's active alternative for each resolved policy group. Always supply the effective profile for the `vp-mode` retrieval workflow. Without `--profile`, search is discovery only; with a current profile, it filters resolved inactive alternatives and applies the existing stale-profile and unresolved-choice errors.

If a profile error has `profile_refresh_required: true`, refresh it with `vp-setup` before interpreting `resolution_required: true` as a negotiation request. Only a conflict with `resolution_required: true` and no `profile_refresh_required: true` is a user negotiation request. When an unresolved policy group is needed, send a negotiation request naming the group and its alternatives; never choose a default or compose either alternative for that group. Read `references/profile.md` fully for the policy alternatives, `--approach` dimensions, carriers and snapshot authority.

Before retrieval, bind task evidence to the requested outcome, target, permitted actions, exclusions, and required proof. State every intent and keep distinct intents represented. Extract literal terms from the request and supplied evidence; the retrieval procedure below resolves them to the current dictionary. Use `--domain` or `--form` only when task evidence justifies that axis; omit uncertain axes. Search returns candidate IDs and descriptions. When the intent is a project-specific procedure whose owner is a project instruction — a development lifecycle, a testing contract, an installation guide — read that owner directly; the catalog covers reusable practice, not the project's own mechanics.

Read the sidecar's explicit `vida-project-profile.json` first and pass that path to `--profile`. If an explicit profile is missing or invalid, stop the dependent retrieval; never substitute a marker block. For other Standalone projects with no explicit profile path, `vp-setup` stores fenced JSON between `<!-- vida-powers:profile:begin -->` and `<!-- vida-powers:profile:end -->` in `AGENTS.md` or `CLAUDE.md`; extract that payload unchanged into an owned temporary `.json` file.

Keep source selection fixed across the retrieval chain: pass the same exact `--catalog <path>` to `tags`, `search`, and `get`. Never union an explicit root `.tmp` snapshot with the package corpus. Catalog, instruction and effective-profile validation require their schemas in the selected catalog directory; missing schemas are not borrowed from production. Profile-aware search and composition always use this package's canonical `config/methodology-profile.json` and `config/vpmethodologyprofile.v1.schema.json` as policy authority, including for snapshots. Snapshot files cannot override that authority. For reproducible snapshot work, bind both the selected data/schema files and these canonical policy files.

## Retrieval procedure

Use this procedure for every instruction lookup; it is the only one the task needs.

1. **One intent, one first pass.** For each distinct intent in the task, run one focused call with 3-6 literal terms, never the whole task sentence:
   `bun <skill-dir>/scripts/catalog-cli.ts search --for "<terms>" --profile <effective-profile.json> --catalog <snapshot>`
   Read the `resolved:` line on stderr. A task with several intents gets one call per intent, up to six calls. For one genuinely compound intent, `--top 2` returns the union of two capabilities, and each extra capability must contribute evidence the first did not already match.
2. **Fallback on the observable signal.** When the CLI prints `no capability or pattern matched`, it also lists the nearest dictionary entries as `nearest tags:`. Treat that list as heuristic: search one directly with `--capability <tag>` or `--pattern <tag>` only when its name plausibly matches the intent; otherwise run `tags --query` with the same 3-6 terms. When the `resolved:` line ends with `weak match`, treat the resolution as unresolved: the terms matched only a generic action word, so search one of its `nearest tags` instead of building a bundle on the weak guess. Bare tags are the normal form; a namespaced tag is also accepted.
3. **Page when the intent is missing.** Search returns 20 rows by default. If page one does not contain the intent, read the next page with `--offset 20`; paging continues the same search and does not consume another one.
4. **IDs come from rows.** Search rows are instruction IDs; capability and pattern tags are filters. If `get` reports that a value is a capability or pattern, run the command it prints instead of resending the same ID. Never reconstruct an ID from a title: when the ID you expect is not in a returned row, page or search again before choosing.
5. **One retrieval call.** Choose 8-10 IDs for a multi-intent task, 3-6 for one intent, and run one
   `bun <skill-dir>/scripts/catalog-cli.ts get --id <id...> --profile <effective-profile.json> --catalog <snapshot>`
   `get` passes every ID as required to `catalog.compose`, adds mandatory and transitive dependencies, and never returns a partial bundle. Do not issue one get per ID or manually concatenate results.
6. **Check the result.** Every chosen ID appeared in a search row, every intent has at least one ID, no ID is reused across intents, and the output carries `Applies when` / `Does not apply when` / `Output type` / `Verified by` obligations. When the retrieval is evidence for someone else, write the intent/ID map as JSON and run `bun <skill-dir>/../../scripts/check-retrieval.ts --catalog <snapshot> --report <report.json>`; when writing files is not allowed, pipe the same JSON to `--report -`. The report is `{"intents":[{"name":"<short intent>","terms":["<search terms>"],"ids":["<chosen ID>"],"rows":["<ID seen in a row>"],"capability":"<declared tag>"}]}`: `name`, `terms` and `ids` are required, `rows` carries the IDs you actually saw so the receipt rejects an ID that never appeared in a search row, and `capability` or `pattern` records the declared fallback tag so the receipt checks the choice you made instead of re-resolving the old terms. Its exit code, not the model's self-report, decides whether the map holds.

Boundaries that do not change with the procedure: the same `--catalog <path>` and profile are used across the chain; the profile's active alternative governs policy; a match grants no write, merge or approval authority, which comes from its named owner. Treat a task phrase as a proposed search term, not a declared dictionary alias, and keep distinct intents in separate searches because selectors on different axes in one call are combined. When a command fails with a shell error such as `127` or a missing module, re-read the supplied executable path once and fix it; never repeat the identical failing command in a loop. Direct `catalog.compose` calls without `--profile` remain unfiltered diagnostics; conflicting canonical policy alternatives in the selection or dependency closure return `CATALOG_PROFILE_CONFLICT`. Diagnostic output is not a resolved session bundle.

Inspect the returned plain text as source bodies in compose order, followed only by nonempty applicability and artifact obligations not already present in each body. Verify those exact obligations against the requested target and proof. Treat this compose-backed result as the retrieval output; do not paraphrase, translate, or claim proof that was not completed. The `catalog.get` library operation remains a single-record inspection API and is not a bundle assembler.

Read `references/examples.md` fully when the request is a PR or when task words need translation into search terms. It carries the PR routing cases and the rule that a translated phrase is a proposed term, not a declared alias.

## Session bundle boundary

The bundle may contain at most 20 instructions and at most 64,000 UTF-8 bytes. On overflow, return `CATALOG_BUNDLE_LIMIT_EXCEEDED`; reject the whole bundle and do not return partial results or trim mandatory and transitive dependencies. Read `references/bundle.md` fully for the measurement method, compose order and materialization details.

## Form and materialize work

Do not use `decision.evaluate` scores or tag counts as calibrated semantic relevance or confidence; its score is uncalibrated and is supplementary evidence only. Form agents from the bundle using the role, task contract, effective methodology, Work Scope, materialization requirements, and artifact references. Use the effective profile's `flow_level` for the requested depth. VP describes admissible options and does not create an execution graph or stage plan (SR-22, SR-23, SR-24, SR-25, AC-13, AC-14).

Agent Fallback is mandatory. Route to the main agent when a delegated agent is unavailable, times out (timeout), returns an API error or malformed format, names an unknown candidate ID, or has insufficient confidence. Materialize the source of the decision, selected IDs, and fallback reason. For every output, follow its `artifact_contract`: produce the required data at the requested destination and report the specified verification. Do not claim materialization or verification that did not occur. These rules preserve SR-22, SR-23, SR-24, SR-25, and AC-13.

The effective profile may carry a `task_override` block for one task. Apply it for that task only, pass it unchanged to delegated agents, and never write it into a carrier; it never changes the permanent profile, another product, a permission or a security gate. The depth level (`full`, `medium`, `light`) changes ceremony only: mandatory acceptance criteria, materialization and gates always apply.

## Findings and artifacts

Read `references/findings.md` fully for findings candidates, append, merge, scope and UNKNOWN handling. Read `references/artifacts.md` fully for artifact append, index, verify and semantic separation.

## References

- `references/profile.md` — policy alternatives, negotiation, `--approach`, carriers, snapshot authority.
- `references/examples.md` — PR routing cases and translation rules.
- `references/bundle.md` — bundle measurement, compose order, materialization details.
- `references/findings.md` — findings candidate, append, merge, scope, UNKNOWN.
- `references/artifacts.md` — artifact append, index, verify, semantic separation.

## Gotchas

- Resolve `<skill-dir>` from the explicit project map, not the ambient working directory.
- A `weak match` is unresolved, not a candidate to compose.
- A capability or pattern tag is a filter, never an instruction ID.
- When a command fails, fix the supplied path once; never repeat the identical failing command.
