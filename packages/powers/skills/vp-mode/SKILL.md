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
