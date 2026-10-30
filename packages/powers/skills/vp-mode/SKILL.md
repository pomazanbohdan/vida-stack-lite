# vp-mode

## Route the request

Read the user's request, the effective profile, and the references supplied with the task. Use the profile's active alternative for each resolved policy group. If a profile error has `profile_refresh_required: true`, refresh it with `vp-setup` before interpreting `resolution_required: true` as a negotiation request. Only a conflict with `resolution_required: true` and no `profile_refresh_required: true` is a user negotiation request. When an unresolved policy group is needed, send a negotiation request naming the group and its alternatives; never choose a default or compose either alternative for that group.

Before retrieval, bind task evidence to the requested outcome, target, permitted actions, exclusions, and required proof. State every intent and keep distinct intents represented. Extract literal terms from the request and supplied evidence; the retrieval procedure below resolves them to the current dictionary. Use `--domain` or `--form` only when task evidence justifies that axis; omit uncertain axes. Search returns candidate IDs and descriptions. Without `--profile`, search is discovery only; with a current profile, it filters resolved inactive alternatives and applies the existing stale-profile and unresolved-choice errors.

When the task establishes an approach, repeat `--approach execution=solo`, `--approach remediation-timing=none`, or `--approach review-requirement=independent` as applicable. Each dimension accepts one value; the other values are `execution=delegated`, `remediation-timing=immediate|after-review`, and `review-requirement=none`. Use the same selectors with `search`, `explain`, and the final batch `get`. Explain returns candidate decisions, including declared exclusions, and source, body, schema, and policy digests as JSON without pagination; bind the same snapshot throughout. Unassessed and uncertain records remain candidates, while declared contradictions are excluded from search before candidate profile negotiation. Required or effective dependency contradictions fail the batch; profile substitution checks the active replacement. Browse is descriptive and does not accept `--profile`. Assess source obligations and permissions separately: metadata grants no authority and never overrides profile policy or declared exclusions.

`vp-setup` stores the Standalone profile as fenced JSON between the exact `<!-- vida-powers:profile:begin -->` and `<!-- vida-powers:profile:end -->` markers in the project `AGENTS.md` or `CLAUDE.md`. Read those markers, extract the fenced JSON payload unchanged into an owned temporary `.json` file, and pass that path to `--profile`.

Keep source selection fixed across the retrieval chain: pass the same exact `--catalog <path>` to `tags`, `search`, and `get`. Never union an explicit root `.tmp` snapshot with the package corpus. Catalog, instruction and effective-profile validation require their schemas in the selected catalog directory; missing schemas are not borrowed from production. Profile-aware search and composition always use this package's canonical `config/methodology-profile.json` and `config/vpmethodologyprofile.v1.schema.json` as policy authority, including for snapshots. Snapshot files cannot override that authority. For reproducible snapshot work, bind both the selected data/schema files and these canonical policy files.

## Retrieval procedure

Use this procedure for every instruction lookup; it is the only one the task needs.

1. **One intent, one first pass.** For each distinct intent in the task, run one focused call with 3-6 literal terms, never the whole task sentence:
   `bun skills/vp-mode/scripts/catalog-cli.ts search --for "<terms>" --profile <effective-profile.json> --catalog <snapshot>`
   Read the `resolved:` line on stderr. A task with several intents gets one call per intent, up to six calls.
2. **Fallback on the observable signal.** When the CLI prints `no capability or pattern matched`, it also lists the nearest dictionary entries as `nearest tags:`. Treat that list as heuristic: search one directly with `--capability <tag>` or `--pattern <tag>` only when its name plausibly matches the intent; otherwise run `tags --query` with the same 3-6 terms. When the `resolved:` line ends with `weak match`, treat the resolution as unresolved: the terms matched only a generic action word, so search one of its `nearest tags` instead of building a bundle on the weak guess. Bare tags are the normal form; a namespaced tag is also accepted.
3. **Page when the intent is missing.** Search returns 20 rows by default. If page one does not contain the intent, read the next page with `--offset 20`; paging continues the same search and does not consume another one.
4. **IDs come from rows.** Search rows are instruction IDs; capability and pattern tags are filters. If `get` reports that a value is a capability or pattern, run the command it prints instead of resending the same ID. Never reconstruct an ID from a title: when the ID you expect is not in a returned row, page or search again before choosing.
5. **One retrieval call.** Choose 8-10 IDs for a multi-intent task, 3-6 for one intent, and run one
   `bun skills/vp-mode/scripts/catalog-cli.ts get --id <id...> --profile <effective-profile.json> --catalog <snapshot>`
   `get` passes every ID as required to `catalog.compose`, adds mandatory and transitive dependencies, and never returns a partial bundle. Do not issue one get per ID or manually concatenate results.
6. **Check the result.** Every chosen ID appeared in a search row, every intent has at least one ID, no ID is reused across intents, and the output carries `Applies when` / `Does not apply when` / `Output type` / `Verified by` obligations. When the retrieval is evidence for someone else, write the intent/ID map as JSON and run `bun scripts/check-retrieval.ts --catalog <snapshot> --report <report.json>`; when writing files is not allowed, pipe the same JSON to `--report -`. If the fallback replaced your terms with a canonical tag, record that tag as `capability` or `pattern` on the intent, so the receipt checks the choice you made instead of re-resolving the old terms. Its exit code, not the model's self-report, decides whether the map holds.

Boundaries that do not change with the procedure: the same `--catalog <path>` and profile are used across the chain; the profile's active alternative governs policy; a match grants no write, merge or approval authority, which comes from its named owner. Treat a task phrase as a proposed search term, not a declared dictionary alias, and keep distinct intents in separate searches because selectors on different axes in one call are combined. When a command fails with a shell error such as `127` or a missing module, re-read the supplied executable path once and fix it; never repeat the identical failing command in a loop. Always supply the effective profile for the `vp-mode` retrieval workflow. Direct `catalog.compose` calls without `--profile` remain unfiltered diagnostics; conflicting canonical policy alternatives in the selection or dependency closure return `CATALOG_PROFILE_CONFLICT`. Diagnostic output is not a resolved session bundle.

Inspect the returned plain text as source bodies in compose order, followed only by nonempty applicability and artifact obligations not already present in each body. Verify those exact obligations against the requested target and proof. Treat this compose-backed result as the retrieval output; do not paraphrase, translate, or claim proof that was not completed. The `catalog.get` library operation remains a single-record inspection API and is not a bundle assembler.

Apply this reasoning to the actual request, rather than treating a PR as a fixed workflow:

- “Review TypeScript changes in this PR and report regressions; do not edit”: the target is the diff, the permitted action is review, and the output is evidenced findings. Terms `pr review regression` come from that request. Map them with `tags --query pr review regression --catalog <snapshot>`; when the selected dictionary confirms `review-code` and `code-review`, use `search --capability review-code --pattern code-review --profile <effective-profile.json> --catalog <snapshot>` for candidates. The TypeScript changes support `engineering`, but omit `--domain engineering` when the selected corpus is unclassified: the filter would exclude those instructions. Inspect candidates for the actual review and regression intents. No fix, commit, or merge authority follows from a match.
- “Review the deployment runbook PR”: inspect the supplied runbook and requirements before choosing a direction. A PR containing operational guidance does not inherit `engineering` merely from its PR label; omit a domain until its content supports one.
- “Process this PR”: the requested result and permitted actions are unspecified. Inspect the supplied context first; if it leaves materially different review/fix/merge outcomes, use the existing clarification route before taking a dependent action. Discovery does not supply missing authority.
- “Review the PR, then fix confirmed defects in the named files”: preserve both intents and the explicit file boundary. Retrieve the authorized review and repair rules under the effective profile. If their declared exclusions conflict, resolve that conflict through the current owner; do not split bundles merely to evade it.

Record any translation from a task phrase into a query term explicitly; it is a proposed search term, not an undeclared dictionary alias. Search distinct intents separately when they need different tags: selectors on different axes in one `search` are combined, so combining a review capability with a test-design pattern can suppress both intents. For example, search review and verification separately against the same catalog and profile, merge candidates by instruction ID, and select the applicable IDs for one `get`. Do not treat an empty intersection as proof that either intent has no instructions. Check each selected instruction against the actual target, applicability, exclusions, and proof requirements. Shared keywords and a high lexical score alone do not establish that it is needed.

## Session bundle boundary

The bundle may contain at most 20 instructions and at most 64,000 UTF-8 bytes. Measure the sum of the UTF-8 byte lengths of each selected instruction's `content` after profile filtering, active-alternative substitution, and inclusion of all mandatory and transitive dependencies. `1 KB` means 1,000 bytes. The limit excludes `tag_dictionary`, JSON syntax, instruction metadata, execution context, and text-rendered obligation prose. On overflow, return `CATALOG_BUNDLE_LIMIT_EXCEEDED`; reject the whole bundle and do not return partial results or trim mandatory and transitive dependencies. This enforces SR-58 and AC-26.

## Form and materialize work

Do not use `decision.evaluate` scores or tag counts as calibrated semantic relevance or confidence; its score is uncalibrated and is supplementary evidence only. Form agents from the bundle using the role, task contract, effective methodology, Work Scope, materialization requirements, and artifact references. Use the effective profile's `flow_level` for the requested depth. VP describes admissible options and does not create an execution graph or stage plan (SR-22, SR-23, SR-24, SR-25, AC-13, AC-14).

Agent Fallback is mandatory. Route to the main agent when a delegated agent is unavailable, times out (timeout), returns an API error or malformed format, names an unknown candidate ID, or has insufficient confidence. Materialize the source of the decision, selected IDs, and fallback reason. For every output, follow its `artifact_contract`: produce the required data at the requested destination and report the specified verification. Do not claim materialization or verification that did not occur. These rules preserve SR-22, SR-23, SR-24, SR-25, and AC-13.

The effective profile may carry a `task_override` block for one task. Apply it for that task only, pass it unchanged to delegated agents, and never write it into a carrier; it never changes the permanent profile, another product, a permission or a security gate. The depth level (`full`, `medium`, `light`) changes ceremony only: mandatory acceptance criteria, materialization and gates always apply.

## Findings procedure

Check artifact presence, format, and digest against the requested revision separately from any semantic review. A correct artifact digest does not prove that its contents are valid or equivalent to another finding.

Use VP-6's existing per-product artifact contract to resolve the canonical Standalone store at `packages/powers/docs/work/findings.jsonl`. Pass that location as an absolute `--store` path; never derive it from the process working directory or select another store. Supply an absolute `--event-file` path containing the raw observation or merge event JSON.

The main Standalone host caller invokes findings operations sequentially. Delegated agents return structured findings to that caller and never write the store. The CLI does not provide cross-process locking; do not claim concurrent process safety.

For a new observation, run the read-only candidate query before append:

```sh
bun skills/vp-mode/scripts/catalog-cli.ts findings candidates --store <absolute-store-path> --event-file <absolute-observation-json>
```

Review the returned stored observations in append order. Exact candidate reasons are deterministic identity, `finding_id`, fingerprint, context, and provenance matches. The query can return more than one reason or candidate; it does not rank, prove semantic equivalence, or merge. Context object keys are canonicalized recursively, while strings and array order remain exact. Empty `{}` context matches only another empty context; empty provenance is invalid.

Compare each candidate's reproduction, context, and evidence with the new artifact. Exact event replay is idempotent. Every new primary observation requires a distinct caller-supplied `finding_id`; changed event bytes under an existing ID fail with `FINDING_ID_CONFLICT`. Keep unresolved or ambiguous observations separate. After the caller explicitly confirms equivalence, append the new observation with its own ID and evidence, then append a separate merge event that links it to the canonical `finding_id`. Never rewrite or delete prior rows and never treat a merge record as proof by itself.

Append through the same CLI only after candidate review:

```sh
bun skills/vp-mode/scripts/catalog-cli.ts findings append --store <absolute-store-path> --event-file <absolute-event-json>
```

If append returns `FINDING_STORE_RECOVERY_REQUIRED`, treat the store state as unknown. Stop the caller flow, preserve the file, and request owner recovery before retrying.

An out-of-Work-Scope blocker requests owner permission before any scope expansion. Record the decision in the observation as `scope: { "decision": "within" | "beyond", "permission_request": "<text>" }`: `beyond` requires a non-empty permission request and `within` forbids one. The writer rejects a scope expansion recorded without that request; detecting that a finding is out of scope remains the caller's judgment. Recording a finding or merge grants no fix authority. Runtime findings remain with the Agent-owned state owner. After the main work, an optional human loop may present a proposal to fix a third-party problem. Without standing permission, do not perform the fix unless permission is granted (SR-55).

## Artifact reference procedure

Record each content operation in the per-product artifact index before claiming its result. Resolve the canonical Standalone store at `packages/powers/docs/work/artifacts.jsonl` and pass it as an absolute `--store` path; never derive it from the working directory.

```sh
bun skills/vp-mode/scripts/catalog-cli.ts artifacts append --store <absolute-store-path> --event-file <absolute-artifact-event-json>
bun skills/vp-mode/scripts/catalog-cli.ts artifacts index --store <absolute-store-path>
bun skills/vp-mode/scripts/catalog-cli.ts artifacts verify --store <absolute-store-path> --id <artifact-id> --root <product-root> [--semantic-file <absolute-semantic-json>]
```

An event is either the first `artifact` for an ID or an explicit `update` of an existing one; an update for an unknown ID fails with `ARTIFACT_NOT_FOUND` and a changed digest under an existing revision fails with `ARTIFACT_REVISION_CONFLICT`. `verify` reports presence, format and digest as one mechanical result and the supplied semantic judgment as a separate one. It reports `complete: true` only when the mechanical parts pass and the semantic verdict is `pass`. A matching digest alone never proves valid content or equivalence. Do not claim artifact materialization, semantic acceptance or AC closure that was not actually checked.
