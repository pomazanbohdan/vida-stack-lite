---
instruction_id: log-every-review-finding-with-its-verdict
title: Log every review finding with its verdict
summary: "The review triage log is append-only, gets a row on every review pass, and keeps one row per finding with its verdict, its route and its evidence."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A review pass produced findings.
conditions_does_not_apply_when: The review produced no findings at all.
artifact_contract_output_type: review-triage-log
artifact_contract_required_data:
  - one row per finding
  - the verdict of the finding
  - the route of the finding
  - the evidence for the verdict
artifact_contract_verified_by: every finding has exactly one row and no row was dropped or merged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/plan-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-04-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-oneshot.md
status: active
revision: 2
---

# Log every review finding with its verdict

Append-only.

On EVERY review pass, including loopbacks and blocked exits.

Each entry records verdict counts (Critical/Important/Minor/false/maybe-false) and one row per reviewer finding: verdict, route, and evidence — the refutation for false, what would settle it for maybe-false, the action taken for patches.

Every finding gets one row in the `## Review Triage Log` section of `{plan_file}` — verdict plus its evidence in a sentence or two; never drop, merge, or silently skip one.

Write down every finding with its verdict and evidence. Do not drop any.

If review found anything, add `## Review Triage Log` with one line per finding: verdict and evidence. For `false`, the disproof. For `maybe-false`, what would settle it.

If `## Review Triage Log` already has rows — a loopback or a resumed review — check each finding against them first.
