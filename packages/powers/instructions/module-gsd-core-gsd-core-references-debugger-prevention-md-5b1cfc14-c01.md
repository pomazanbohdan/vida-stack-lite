---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-debugger-prevention-md-5b1cfc14-c01"
title: "gsd-core: gsd-core/references/debugger-prevention.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/debugger-prevention.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/debugger-prevention.md\"}"
atom_ids:
  - name-the-gate-that-should-have-caught-it
  - state-the-recurrence-guard-concretely-and-verify-it
atom_count: 2
atoms: "[{\"atom_id\":\"name-the-gate-that-should-have-caught-it\",\"file_sha256\":\"3d1c16496a0b09ec63d04379a8ce80ff123d3e71b1698a965e2547ba2c710c34\",\"content_sha256\":\"b029afa9beeb0d0ffa57b359177d547f0c3bfdeba6ffa33f6ae67bfa50ceb884\",\"file_bytes\":1678,\"body_bytes\":566},{\"atom_id\":\"state-the-recurrence-guard-concretely-and-verify-it\",\"file_sha256\":\"102ad945fed9ec38ab9f2d8294bff2045795651732c80520cef993d152dcbdad\",\"content_sha256\":\"d3776a924a992124a8f379ad55c064ac4a3c21c1abf12536e0da78cbc5c5b450\",\"file_bytes\":2159,\"body_bytes\":1040}]"
carrier_sha256: f126e5a9ffdcdc26801a92416b1c5edf67d0fcac6a6b5547a4faeb3ce1cb6793
carrier_bytes: 4134
revision: 1
status: active
---
<!-- vpmodule:atom:begin name-the-gate-that-should-have-caught-it -->
---
instruction_id: name-the-gate-that-should-have-caught-it
title: Name the gate that should have caught it
summary: "The postmortem names the existing check that should have caught the class of bug; \"no gate existed\" is itself the finding."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - non-blaming-analysis
conditions_applies_when: A resolved failure is written up.
conditions_does_not_apply_when: The failure was not a defect but a planned limitation.
artifact_contract_output_type: why-not-caught
artifact_contract_required_data:
  - the gate that should have caught it
  - why it did not
  - the reason no blame is assigned
artifact_contract_verified_by: "the gate is named, or the absence of a gate is stated as the finding"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/debugger-prevention.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Name the gate that should have caught it
Name the **existing gate** that should have caught this bug class and didn't — a test, a type check, a lint rule, code review, the verify step, the build.
If the honest answer is "no gate existed for this class," that itself is the finding (and the recurrence guard below is "add the gate").
Blame-free: treat "agent error" / "human error" as a prompt for *"why was that error possible?"* — not a terminal cause.
A postmortem that stops at "the engineer made a mistake" prevents nothing
Never assign blame to a person.
<!-- vpmodule:atom:end name-the-gate-that-should-have-caught-it -->
<!-- vpmodule:atom:begin state-the-recurrence-guard-concretely-and-verify-it -->
---
instruction_id: state-the-recurrence-guard-concretely-and-verify-it
title: State the recurrence guard concretely and verify it
summary: "The guard is a named artifact — a file, a rule, a test — and it is verified to exist before it is recorded."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - non-blaming-analysis
conditions_applies_when: A recurrence guard is recorded for a resolved failure.
conditions_does_not_apply_when: Nothing is being recorded for a future reader.
artifact_contract_output_type: recurrence-guard
artifact_contract_required_data:
  - the kind of guard
  - the exact location of the artifact
  - the check that shows it exists
artifact_contract_verified_by: the artifact was checked to exist before it was recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/debugger-prevention.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# State the recurrence guard concretely and verify it
The **concrete artifact** that prevents this class from returning.
a **regression test** (already produced by Test-First Debugging — reference it),
an **assertion / precondition** (fail loud at runtime if the bad condition recurs),
a **type refinement** (make the bad state unrepresentable — the strongest guard in a typed codebase
a **config-default change** (eliminate the misconfiguration that enabled the bug — flip the default so the unsafe path is opt-in, not the path of least resistance),
a **lint rule / broken-window ledger entry** (fail the build / surface in review),
State the guard concretely (which file, which rule, which test name) — not "add a test" but "the regression test at `tests/foo.test.cjs:42` now covers this class."
**Verify the artifact exists before recording it** (the test passes, the type compiles, the lint rule is registered) — a stale or unverified path is worse than none, since a future Phase-0 match would surface it as if it were real.
<!-- vpmodule:atom:end state-the-recurrence-guard-concretely-and-verify-it -->