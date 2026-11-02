# PR Routing Examples and Translation Rules

## PR routing examples

- **"Review TypeScript changes in this PR and report regressions; do not edit"**: the target is the diff, the permitted action is review, and the output is evidenced findings. Terms `pr review regression` come from that request. Map them with `tags --query pr review regression --catalog <snapshot>`; when the selected dictionary confirms `review-code` and `code-review`, use `search --capability review-code --pattern code-review --profile <effective-profile.json> --catalog <snapshot>` for candidates. The TypeScript changes support `engineering`, but omit `--domain engineering` when the selected corpus is unclassified: the filter would exclude those instructions. Inspect candidates for the actual review and regression intents. No fix, commit, or merge authority follows from a match.

- **"Review the deployment runbook PR"**: inspect the supplied runbook and requirements before choosing a direction. A PR containing operational guidance does not inherit `engineering` merely from its PR label; omit a domain until its content supports one.

- **"Process this PR"**: the requested result and permitted actions are unspecified. Inspect the supplied context first; if it leaves materially different review/fix/merge outcomes, use the existing clarification route before taking a dependent action. Discovery does not supply missing authority.

- **"Review the PR, then fix confirmed defects in the named files"**: preserve both intents and the explicit file boundary. Retrieve the authorized review and repair rules under the effective profile. If their declared exclusions conflict, resolve that conflict through the current owner; do not split bundles merely to evade it.

## Translation and combination rules

Record any translation from a task phrase into a query term explicitly; it is a proposed search term, not an undeclared dictionary alias. Search distinct intents separately when they need different tags: selectors on different axes in one `search` are combined, so combining a review capability with a test-design pattern can suppress both intents. For example, search review and verification separately against the same catalog and profile, merge candidates by instruction ID, and select the applicable IDs for one `get`. Do not treat an empty intersection as proof that either intent has no instructions. Check each selected instruction against the actual target, applicability, exclusions, and proof requirements. Shared keywords and a high lexical score alone do not establish that it is needed.

When the intent is a project-specific procedure whose owner is a project instruction — a development lifecycle, a testing contract, an installation guide — read that owner directly; the catalog covers reusable practice, not the project's own mechanics.