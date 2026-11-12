---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-resolve-prohibition-findings-md-5110ba10-c01"
title: "gsd-core: docs/how-to/resolve-prohibition-findings.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/how-to/resolve-prohibition-findings.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/resolve-prohibition-findings.md\"}"
atom_ids:
  - hold-an-unwired-check-fail-closed
  - pick-the-verification-tier-of-a-prohibition
  - write-a-must-not-as-a-checkable-acceptance-criterion
atom_count: 3
atoms: "[{\"atom_id\":\"hold-an-unwired-check-fail-closed\",\"file_sha256\":\"0509ce3479f7da0e39affdceb1402dcf7545f6bf49077775c0368aa0c0ee6e3b\",\"content_sha256\":\"8748e6fc5c7dee02637cae8395985238724f83537cc739a36aa7fe774f625735\",\"file_bytes\":1444,\"body_bytes\":377},{\"atom_id\":\"pick-the-verification-tier-of-a-prohibition\",\"file_sha256\":\"7c107897c5c693608740e929c2d158d4e6f9dc2f2ce170c2e42dceaab6801e4f\",\"content_sha256\":\"5605d0d4d0a4a996f8ae9765c07fca73ed897d5ec3364907a9d6aaa9c61fe3d6\",\"file_bytes\":1697,\"body_bytes\":597},{\"atom_id\":\"write-a-must-not-as-a-checkable-acceptance-criterion\",\"file_sha256\":\"0b1da92cbbf991fccdd379473b52405b0a2d368154f708f3fda31bf3f222e2dc\",\"content_sha256\":\"3bff0e7045931c7f5ad871007ba8d60fc4fcf7ce85da377ee39e4da551fc2237\",\"file_bytes\":2054,\"body_bytes\":877}]"
carrier_sha256: 4a671bdfa75799cd96c572928fe846565f060b23ee1b3d7cb498f4862b0a4cf0
carrier_bytes: 5624
revision: 1
status: active
---
<!-- vpmodule:atom:begin hold-an-unwired-check-fail-closed -->
---
instruction_id: hold-an-unwired-check-fail-closed
title: Hold an unwired check fail-closed
summary: "A check that is not wired yet reports as flagged or unverified, never as a silent pass."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A negative check has been declared but its mechanical check is not wired yet.
conditions_does_not_apply_when: The mechanical check exists and runs.
artifact_contract_output_type: unwired-check-report
artifact_contract_required_data:
  - the check that is declared
  - the state it is reported in
artifact_contract_verified_by: the check is reported as flagged or unverified and never as a pass
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-prohibition-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Hold an unwired check fail-closed
At verify time, a `test`-tier prohibition whose mechanical check is not yet wired is held **fail-closed** — it reports as flagged/unverified, never as a silent pass — so a prohibition can never quietly disappear between spec and verification.
A `judgment`-tier prohibition routes to a judgment-based review rather than a green/red test.
<!-- vpmodule:atom:end hold-an-unwired-check-fail-closed -->
<!-- vpmodule:atom:begin pick-the-verification-tier-of-a-prohibition -->
---
instruction_id: pick-the-verification-tier-of-a-prohibition
title: Pick the verification tier of a prohibition
summary: A prohibition that a mechanical check can prove is routed to a test; one that cannot is routed to a judgment-based review.
capability_tags:
  - harden-validation
pattern_tags:
  - testable-criteria
conditions_applies_when: A prohibition is about to be resolved into an acceptance criterion.
conditions_does_not_apply_when: The prohibition is already backed by a wired mechanical check.
artifact_contract_output_type: prohibition-tier
artifact_contract_required_data:
  - the tier
  - the evidence that decides the tier
artifact_contract_verified_by: the tier is one of test or judgment and the criteria for it are written down
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-prohibition-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Pick the verification tier of a prohibition
**`test`** — a mechanical check can prove it: a negative test, a lint rule, an assertion that the audit log contains no raw SSN. Choose this when a green/red check exists.
**`judgment`** — the prohibition is real but cannot be reduced to a mechanical test (e.g. "the framing is not manipulative"). It records intent and routes to a judgment-based review rather than a passing test.
Pick the tier honestly — see [what happens downstream](#what-happens-to-resolved-findings-downstream) for why a `test`-tier prohibition is held to a stricter bar.
<!-- vpmodule:atom:end pick-the-verification-tier-of-a-prohibition -->
<!-- vpmodule:atom:begin write-a-must-not-as-a-checkable-acceptance-criterion -->
---
instruction_id: write-a-must-not-as-a-checkable-acceptance-criterion
title: Write a must-NOT as a checkable acceptance criterion
summary: A constraint the author assumed but never wrote becomes an acceptance criterion the verifier can enforce before any code exists.
capability_tags:
  - clarify-requirements
pattern_tags:
  - testable-criteria
conditions_applies_when: A specification surfaces a must-NOT constraint for one requirement.
conditions_does_not_apply_when: The constraint is already written as an acceptance criterion.
artifact_contract_output_type: prohibition-decision
artifact_contract_required_data:
  - the must-NOT statement
  - the requirement it belongs to
  - the acceptance criterion it becomes
artifact_contract_verified_by: the must-NOT appears as a line in the acceptance criteria of the specification
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-prohibition-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Write a must-NOT as a checkable acceptance criterion
Turn each must-NOT the spec phase surfaces into an explicit, checkable spec decision — so a constraint the author assumed but never wrote (the reminder that must not shame the user, the model that must not proxy on protected attributes, the log that must not store raw PII) becomes an acceptance criterion the verifier can enforce *before* any code exists, instead of an unwritten intent a literal `✅ done` can silently violate.
Each finding is one **bespoke** must-NOT for one requirement — a values, safety, fairness, privacy, or transparency constraint the probe kept after dropping routine-engineering noise.
A finding is phrased as a must-NOT statement, for example:
Claude writes a must-NOT line into the spec's **Acceptance Criteria**, marks the prohibition `resolved`, and you pick its **verification tier**
<!-- vpmodule:atom:end write-a-must-not-as-a-checkable-acceptance-criterion -->