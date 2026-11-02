# Bundle Measurement, Compose Order, and Materialization

## Measurement method

The bundle may contain at most 20 instructions and at most 64,000 UTF-8 bytes. Measure the sum of the UTF-8 byte lengths of each selected instruction's `content` after profile filtering, active-alternative substitution, and inclusion of all mandatory and transitive dependencies. The limit excludes `tag_dictionary`, JSON syntax, instruction metadata, execution context, and text-rendered obligation prose. On overflow, return `CATALOG_BUNDLE_LIMIT_EXCEEDED`; reject the whole bundle and do not return partial results or trim mandatory and transitive dependencies. This enforces SR-58 and AC-26.

## Compose order

Inspect the returned plain text as source bodies in compose order, followed only by nonempty applicability and artifact obligations not already present in each body. Verify those exact obligations against the requested target and proof. Treat this compose-backed result as the retrieval output; do not paraphrase, translate, or claim proof that was not completed.

## Obligation rendering

Apply these reasoning rules to the actual request:
- "Review TypeScript changes in this PR and report regressions; do not edit": the target is the diff, the permitted action is review, and the output is evidenced findings. Terms `pr review regression` come from that request. Map them with `tags --query pr review regression --catalog <snapshot>`; when the selected dictionary confirms `review-code` and `code-review`, use `search --capability review-code --pattern code-review --profile <effective-profile.json> --catalog <snapshot>` for candidates. The TypeScript changes support `engineering`, but omit `--domain engineering` when the selected corpus is unclassified: the filter would exclude those instructions. Inspect candidates for the actual review and regression intents. No fix, commit, or merge authority follows from a match.
- "Review the deployment runbook PR": inspect the supplied runbook and requirements before choosing a direction. A PR containing operational guidance does not inherit `engineering` merely from its PR label; omit a domain until its content supports one.
- "Process this PR": the requested result and permitted actions are unspecified. Inspect the supplied context first; if it leaves materially different review/fix/merge outcomes, use the existing clarification route before taking a dependent action. Discovery does not supply missing authority.
- "Review the PR, then fix confirmed defects in the named files": preserve both intents and the explicit file boundary. Retrieve the authorized review and repair rules under the effective profile. If their declared exclusions conflict, resolve that conflict through the current owner; do not split bundles merely to evade it.

Record any translation from a task phrase into a query term explicitly; it is a proposed search term, not an undeclared dictionary alias. Search distinct intents separately when they need different tags: selectors on different axes in one `search` are combined, so combining a review capability with a test-design pattern can suppress both intents. For example, search review and verification separately against the same catalog and profile, merge candidates by instruction ID, and select the applicable IDs for one `get`. Do not treat an empty intersection as proof that either intent has no instructions. Check each selected instruction against the actual target, applicability, exclusions, and proof requirements. Shared keywords and a high lexical score alone do not establish that it is needed.

## Form and materialize work

Do not use `decision.evaluate` scores or tag counts as calibrated semantic relevance or confidence; its score is uncalibrated and is supplementary evidence only. Form agents from the bundle using the role, task contract, effective methodology, Work Scope, materialization requirements, and artifact references. Use the effective profile's `flow_level` for the requested depth. VP describes admissible options and does not create an execution graph or stage plan (SR-22, SR-23, SR-24, SR-25, AC-13, AC-14).

## Agent Fallback and materialization requirements

Agent Fallback is mandatory. Route to the main agent when a delegated agent is unavailable, times out (timeout), returns an API error or malformed format, names an unknown candidate ID, or has insufficient confidence. Materialize the source of the decision, selected IDs, and fallback reason. For every output, follow its `artifact_contract`: produce the required data at the requested destination and report the specified verification. Do not claim materialization or verification that did not occur. These rules preserve SR-22, SR-23, SR-24, SR-25, and AC-13.

The effective profile may carry a `task_override` block for one task. Apply it for that task only, pass it unchanged to delegated agents, and never write it into a carrier; it never changes the permanent profile, another product, a permission or a security gate. The depth level (`full`, `medium`, `light`) changes ceremony only: mandatory acceptance criteria, materialization and gates always apply.