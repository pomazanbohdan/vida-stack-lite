# vp-mode

## Route the request

Read the user's request, the effective profile, and the references supplied with the task. Use the profile's active alternative for each resolved policy group. If a profile error has `profile_refresh_required: true`, refresh it with `vp-setup` before interpreting `resolution_required: true` as a negotiation request. Only a conflict with `resolution_required: true` and no `profile_refresh_required: true` is a user negotiation request. When an unresolved policy group is needed, send a negotiation request naming the group and its alternatives; never choose a default or compose either alternative for that group.

From `packages/powers/`, run `bun skills/vp-mode/scripts/catalog-cli.ts search --capability <tag>`, then `bun skills/vp-mode/scripts/catalog-cli.ts compose --required <instruction-id> --profile <effective-profile.json>` to find and compose instructions.

`vp-setup` stores the Standalone profile as fenced JSON between the exact `<!-- vida-powers:profile:begin -->` and `<!-- vida-powers:profile:end -->` markers in the project `AGENTS.md` or `CLAUDE.md`. Read those markers, extract the fenced JSON payload unchanged into an owned temporary `.json` file, and pass that path to `--profile`.

Always supply the effective profile for the `vp-mode` workflow. A direct `catalog.compose` call without `--profile` remains an unfiltered catalog diagnostic; non-conflicting diagnostic composition is available, while conflicting canonical policy alternatives in the selection or dependency closure return `CATALOG_PROFILE_CONFLICT`. Diagnostic output is not a resolved session bundle.

Use `catalog.search` to find candidate instruction IDs from the request and its scope. Then call `catalog.compose` with the selected IDs, effective profile, role, task contract, effective methodology, Work Scope, materialization requirements, and artifact references. Treat the returned `ComposedBundle` as the only session instruction bundle. Do not use `catalog.get` to assemble or return a session bundle, and do not manually combine instruction content around the compose result.

## Session bundle boundary

The bundle may contain at most 20 instructions and at most 64,000 UTF-8 bytes. Measure the sum of the UTF-8 byte lengths of each selected instruction's `content` after profile filtering, active-alternative substitution, and inclusion of all mandatory and transitive dependencies. `1 KB` means 1,000 bytes. The bundle limit excludes `tag_dictionary`, JSON syntax, instruction metadata, and execution context. On overflow, return an error with `CATALOG_BUNDLE_LIMIT_EXCEEDED`; reject the whole bundle and do not return partial results or trim mandatory and transitive dependencies. This enforces SR-58 and AC-26.

## Form and materialize work

Use `decision.evaluate` to shortlist admissible candidates; the skill evaluates semantic relevance and the calibrated threshold for the operation. Form agents from the bundle using the role, task contract, effective methodology, Work Scope, materialization requirements, and artifact references. Use the effective profile's `flow_level` for the requested depth. VP describes admissible options and does not create an execution graph or stage plan (SR-22, SR-23, SR-24, SR-25, AC-13, AC-14).

Agent Fallback is mandatory. Route to the main agent when a delegated agent is unavailable, times out (timeout), returns an API error or malformed format, names an unknown candidate ID, or has insufficient confidence. Materialize the source of the decision, selected IDs, and fallback reason. For every output, follow its `artifact_contract`: produce the required data at the requested destination and report the specified verification. Do not claim materialization or verification that did not occur. These rules preserve SR-22, SR-23, SR-24, SR-25, and AC-13.

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

An out-of-Work-Scope blocker requests owner permission before any scope expansion. Recording a finding or merge grants no fix authority. Runtime findings remain with the Agent-owned state owner. After the main work, an optional human loop may present a proposal to fix a third-party problem. Without standing permission, do not perform the fix unless permission is granted (SR-55).
