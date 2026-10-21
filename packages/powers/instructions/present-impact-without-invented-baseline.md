---
instruction_id: present-impact-without-invented-baseline
title: Do not invent a baseline for an impact figure
summary: State only figures measured in the present artifacts; never compute a saving against a version that was never written.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: "You are about to state a saving in lines, time, cost or tokens."
conditions_does_not_apply_when: The statement carries no gain figure.
artifact_contract_output_type: counted-impact
artifact_contract_required_data:
  - figure
  - source
  - baseline
  - measurement method
artifact_contract_verified_by: every stated figure is counted in the present artifacts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-gain/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-gain.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-gain/SKILL.md
status: active
revision: 3
---

# Do not invent a baseline for an impact figure
The figures are benchmark averages, not this repo.
Never print a per-repo savings number: the unbuilt version was never written, so there is no real baseline to subtract from in a live repo.
The bar length shows the share; the label carries the exact figure.
The only real per-repo figures come from a counted ledger of deferred shortcuts.
Point to that ledger instead of inventing a figure.
