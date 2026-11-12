---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-resolve-edge-coverage-findings-md-de528da4-c01"
title: "gsd-core: docs/how-to/resolve-edge-coverage-findings.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:docs/how-to/resolve-edge-coverage-findings.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/resolve-edge-coverage-findings.md\"}"
atom_ids:
  - backstop-an-edge-with-a-held-out-test
  - dismiss-a-finding-only-with-a-written-reason
  - keep-an-unresolved-item-visible-as-an-assumption
  - never-auto-dismiss-a-constraint
atom_count: 4
atoms: "[{\"atom_id\":\"backstop-an-edge-with-a-held-out-test\",\"file_sha256\":\"659fdea73b60b046c6630320f77e97176140693dacdec92ebc9a57968e3f8516\",\"content_sha256\":\"86db6a28938d7dc895ef1d7f454944d9717a2883f31a9bcb4cf36a40b8b0bf95\",\"file_bytes\":1427,\"body_bytes\":343},{\"atom_id\":\"dismiss-a-finding-only-with-a-written-reason\",\"file_sha256\":\"febd821b318879c1342d6a9b8e8e75626f0fd9925974108e50092c5f9c430a7f\",\"content_sha256\":\"e05499bd8466570f09b7818be52360ce6d7d4c84e269ec9aeb1738d14789d851\",\"file_bytes\":1526,\"body_bytes\":269},{\"atom_id\":\"keep-an-unresolved-item-visible-as-an-assumption\",\"file_sha256\":\"5e11e3e5c180a3cab6275bae69f33d1ba8e374fb19a059fde03127c9b56339b4\",\"content_sha256\":\"9ffcc93009973fb334d0a8a3ae83bb6d2c4d305c62103ac19f5f604079784123\",\"file_bytes\":1729,\"body_bytes\":538},{\"atom_id\":\"never-auto-dismiss-a-constraint\",\"file_sha256\":\"4bcd3cdfe9129c881327dd21f2382521f1de6db0d72b77af20a99bad570c3462\",\"content_sha256\":\"9060cd7b887de843488848ff7fcb1644e003b4721bf47bf5327bab225a059e3b\",\"file_bytes\":1736,\"body_bytes\":521}]"
carrier_sha256: 53067e58d48c25a896e5ebefa5198d6642ee5e9407e84c8ace7e62e86b3494ab
carrier_bytes: 6969
revision: 1
status: active
---
<!-- vpmodule:atom:begin backstop-an-edge-with-a-held-out-test -->
---
instruction_id: backstop-an-edge-with-a-held-out-test
title: Backstop an edge with a held-out test
summary: An edge whose correct behaviour cannot yet be articulated is carried as a non-inferable check that a held-out test will stand in for.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A boundary matters but the exact contract cannot be written yet.
conditions_does_not_apply_when: The exact behaviour can be stated as a pass or fail check.
artifact_contract_output_type: edge-backstop-record
artifact_contract_required_data:
  - the edge
  - the held-out test that stands in for it
artifact_contract_verified_by: the edge is carried into the plan as a check that no test can infer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-edge-coverage-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Backstop an edge with a held-out test
Claude marks the edge `backstop` and notes that a held-out / property-based test stands in for the missing assertion.
A `backstop` edge is also carried into the plan's `must_haves.truths` as a non-inferable check — the planner records the intent, and the test body is authored later during execution.
<!-- vpmodule:atom:end backstop-an-edge-with-a-held-out-test -->
<!-- vpmodule:atom:begin dismiss-a-finding-only-with-a-written-reason -->
---
instruction_id: dismiss-a-finding-only-with-a-written-reason
title: Dismiss a finding only with a written reason
summary: A dismissal without a non-empty reason is rejected; the reason is the audit trail.
capability_tags:
  - triage-reports
pattern_tags:
  - decision-trail
conditions_applies_when: A finding does not apply and is about to be dismissed.
conditions_does_not_apply_when: The finding applies and is about to be resolved into a criterion.
artifact_contract_output_type: finding-dismissal
artifact_contract_required_data:
  - the reason the finding does not apply
artifact_contract_verified_by: the dismissal carries a non-empty reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-prohibition-findings.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-edge-coverage-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body requires a reason and audit trail when dismissing a finding, but the finding subject is unspecified and no listed content domain is grounded."
---

# Dismiss a finding only with a written reason
A dismissal **requires a non-empty reason**; silence is rejected.
The reason string is the audit trail.
A wrong dismissal is the exact silent failure this probe exists to prevent, so dismiss only when the reason is solid.
<!-- vpmodule:atom:end dismiss-a-finding-only-with-a-written-reason -->
<!-- vpmodule:atom:begin keep-an-unresolved-item-visible-as-an-assumption -->
---
instruction_id: keep-an-unresolved-item-visible-as-an-assumption
title: Keep an unresolved item visible as an assumption
summary: Deferring a constraint claims nothing about its safety; it stays visible as an explicit assumption for the next stage.
capability_tags:
  - triage-reports
pattern_tags:
  - dimension-sweep
conditions_applies_when: A finding cannot be decided yet.
conditions_does_not_apply_when: The finding can be decided now.
artifact_contract_output_type: unresolved-item-record
artifact_contract_required_data:
  - the item
  - the assumption it is marked as
artifact_contract_verified_by: the unresolved item stays visible in the document and is marked as an assumption
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-prohibition-findings.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-edge-coverage-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep an unresolved item visible as an assumption
Unlike a dismissal, deferring makes no claim that the prohibition is safe — it is an explicit, visible assumption the planner must surface, not silently drop.
Write the spec anyway — the spec is written with those rows marked `⚠ Prohibition unresolved — planner must treat as assumption`. Use this deliberately; you are choosing to ship a known gap.
The gate is *soft*: it never blocks you, but every unresolved prohibition stays visible in the spec's `## Prohibitions` section.
<!-- vpmodule:atom:end keep-an-unresolved-item-visible-as-an-assumption -->
<!-- vpmodule:atom:begin never-auto-dismiss-a-constraint -->
---
instruction_id: never-auto-dismiss-a-constraint
title: Never auto-dismiss a constraint
summary: "An automated run may resolve a constraint but never dismisses it: a dismissal needs a human reason."
capability_tags:
  - triage-reports
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A run resolves constraints without a human in the loop.
conditions_does_not_apply_when: A human decides each dismissal and records the reason.
artifact_contract_output_type: constraint-resolution-tally
artifact_contract_required_data:
  - the count resolved
  - the count left unresolved
  - the count dismissed
artifact_contract_verified_by: no constraint was dismissed without a human reason and the tally is logged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-prohibition-findings.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-edge-coverage-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - operations
---

# Never auto-dismiss a constraint
In `--auto`, Claude marks a prohibition `resolved` where it can write a defensible negative acceptance criterion (at the `test` or `judgment` tier), and leaves it `unresolved` otherwise.
It **never auto-dismisses** — dismissing a prohibition requires a human reason, because a wrong auto-dismissal is precisely the silent failure being eliminated.
Review the logged choices afterwards; auto mode is a fast first pass, not a substitute for judgement on a prohibition that carries risk.
<!-- vpmodule:atom:end never-auto-dismiss-a-constraint -->