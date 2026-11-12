---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-spec-phase-md-d88fb1e1-c02"
title: "gsd-core: gsd-core/workflows/spec-phase.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/workflows/spec-phase.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/spec-phase.md\"}"
atom_ids:
  - reject-a-vague-requirement
  - reuse-an-existing-artifact-in-an-unattended-run
  - rotate-the-interview-perspective
  - treat-the-probe-rows-as-a-floor-not-a-ceiling
  - write-the-boundaries-as-two-explicit-lists
atom_count: 5
atoms: "[{\"atom_id\":\"reject-a-vague-requirement\",\"file_sha256\":\"efb93b4335d5566a596f27cc9b28ff50dddb7a7b841b75ee823f1ca9a889ab2a\",\"content_sha256\":\"fcd156231caefa7790079b9c04a232a20b39acbfc1af391468f4ab5a784e59ee\",\"file_bytes\":1592,\"body_bytes\":428},{\"atom_id\":\"reuse-an-existing-artifact-in-an-unattended-run\",\"file_sha256\":\"a4b7915882ab8d5f2d4a2ad91b0d6a76c538373bcdad93e15d8153bd6561c4e4\",\"content_sha256\":\"d7083098f3487f7d8f31a051fd2dc64088a9ec01a46b9f288619537559cff048\",\"file_bytes\":1811,\"body_bytes\":494},{\"atom_id\":\"rotate-the-interview-perspective\",\"file_sha256\":\"324f092ce0acc63c89f9ca188f52ab8a048a225a7b671bda0c3ae8c698845ed8\",\"content_sha256\":\"8fac120ca293b3a3e09f17a64e3feab484ee56f1b77e427ef776fb87e8761fd3\",\"file_bytes\":1593,\"body_bytes\":448},{\"atom_id\":\"treat-the-probe-rows-as-a-floor-not-a-ceiling\",\"file_sha256\":\"d7efe0fa7c1b2a422abc9d2d09a1d008bf7f80b963ae9f979cfb2cb0b545bca6\",\"content_sha256\":\"2c3d1ca6c658f357b78df6ffdb802ae85e2fcc83438ca8776b88d4e6ce5fcb61\",\"file_bytes\":1628,\"body_bytes\":462},{\"atom_id\":\"write-the-boundaries-as-two-explicit-lists\",\"file_sha256\":\"69d6d861aa1bb2855b80a7103db2fdc3d1d6bc6342287147fc43c748d4c50139\",\"content_sha256\":\"9e7582649217913c90068ac9b18902f4000abb4ecd7b062dfc2082cd048c3279\",\"file_bytes\":1403,\"body_bytes\":323}]"
carrier_sha256: 57396c87e95cd306b88d3d4904fb8ea05a5ca231f097883931ec20a35916b8c2
carrier_bytes: 8700
revision: 1
status: active
---
<!-- vpmodule:atom:begin reject-a-vague-requirement -->
---
instruction_id: reject-a-vague-requirement
title: Reject a vague requirement
summary: "A requirement that could describe any system is refused; each one states a specific testable condition, what exists now, what it should become and how the change is verified."
capability_tags:
  - clarify-requirements
pattern_tags:
  - testable-criteria
conditions_applies_when: A requirement is written down and it may be too vague to build against.
conditions_does_not_apply_when: The requirement is already specific and verifiable.
artifact_contract_output_type: requirement-set
artifact_contract_required_data:
  - the requirement
  - the current state
  - the target state
  - the acceptance criterion
artifact_contract_verified_by: "no requirement is vague and each carries current state, target state and criterion"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
---

# Reject a vague requirement
**Vague requirements are rejected:**
✗ "The system should be fast"
✗ "Improve user experience"
✓ "API endpoint responds in < 200ms at p95 under 100 concurrent requests"
✓ "CLI command exits with code 1 and prints to stderr on invalid input"
One specific, testable statement
Current state (what exists now)
Target state (what it should become)
Acceptance criterion (how to verify it was met)
<!-- vpmodule:atom:end reject-a-vague-requirement -->
<!-- vpmodule:atom:begin reuse-an-existing-artifact-in-an-unattended-run -->
---
instruction_id: reuse-an-existing-artifact-in-an-unattended-run
title: Reuse an existing artifact in an unattended run
summary: "When nobody is present to answer, an artifact that already exists is reused as it is; regenerating it would overwrite answers a person had already recorded."
capability_tags:
  - execute-plan
pattern_tags:
  - unattended-execution
conditions_applies_when: An unattended run finds an artifact that a previous run already wrote.
conditions_does_not_apply_when: The run is attended and the person is asked what to do with the existing artifact.
artifact_contract_output_type: artifact-reuse-decision
artifact_contract_required_data:
  - the existing artifact
  - the option taken
  - the reason it was not regenerated
artifact_contract_verified_by: the existing artifact was kept and nothing a person had recorded was overwritten
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ui-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Reuse an existing artifact in an unattended run
An unattended run reuses an existing artifact rather than regenerating it (#4776): "Update it" re-scores and rewrites the spec, discarding answers a person already recorded in it, and nobody is present to notice.
Skip is the auto choice because it is the only non-destructive one: "Update" re-runs the researcher, which rewrites the whole contract and drops answers a person already recorded in it, and "View" exits without verifying anything.
<!-- vpmodule:atom:end reuse-an-existing-artifact-in-an-unattended-run -->
<!-- vpmodule:atom:begin rotate-the-interview-perspective -->
---
instruction_id: rotate-the-interview-perspective
title: Rotate the interview perspective
summary: "The interview moves through a fixed cast of perspectives — the researcher, the simplifier, the boundary keeper, the failure analyst and the seed closer — because each one surfaces a different blindspot."
capability_tags:
  - facilitate-a-group-discussion
pattern_tags:
  - standing-cast
conditions_applies_when: An interview runs in rounds towards a specification.
conditions_does_not_apply_when: The questions are already known and only need to be asked.
artifact_contract_output_type: interview-cast
artifact_contract_required_data:
  - the perspectives
  - the round each one leads
  - the question each one asks
artifact_contract_verified_by: every round ran the perspective it was assigned
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - research
---

# Rotate the interview perspective
Rotate through these perspectives — each naturally surfaces different blindspots:
**Researcher (rounds 1–2):** Ground the discussion in current reality.
**Simplifier (round 2):** Surface minimum viable scope.
**Boundary Keeper (round 3):** Lock the perimeter.
**Failure Analyst (round 4):** Find the edge cases that invalidate requirements.
**Seed Closer (rounds 5–6):** Lock remaining undecided territory.
<!-- vpmodule:atom:end rotate-the-interview-perspective -->
<!-- vpmodule:atom:begin treat-the-probe-rows-as-a-floor-not-a-ceiling -->
---
instruction_id: treat-the-probe-rows-as-a-floor-not-a-ceiling
title: "Treat the probe rows as a floor, not a ceiling"
summary: "The rows a detector proposes are the floor that has to be resolved; the detector may have missed categories, so its rows are unioned with your own classification instead of narrowing it."
capability_tags:
  - harden-validation
pattern_tags:
  - defense-in-depth
conditions_applies_when: A detector proposes rows that have to be resolved and the detector is known to be lossy.
conditions_does_not_apply_when: The detector is exhaustive.
artifact_contract_output_type: resolution-set
artifact_contract_required_data:
  - the proposed rows
  - the rows you added
  - the resolution of every row
artifact_contract_verified_by: every proposed row was resolved and no proposed row was dropped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Treat the probe rows as a floor, not a ceiling
Start from the edge-probe rows RENDERED above — the deterministic `items[]` are the FLOOR:
every proposed `(requirement_id, category)` MUST be resolved below
none silently dropped.
Then raise any applicable category the engine MISSED — the rows are a floor, never a ceiling:
Union the engine's rows with your own classification (relevance filter — see the taxonomy in the reference); do not narrow to them.
<!-- vpmodule:atom:end treat-the-probe-rows-as-a-floor-not-a-ceiling -->
<!-- vpmodule:atom:begin write-the-boundaries-as-two-explicit-lists -->
---
instruction_id: write-the-boundaries-as-two-explicit-lists
title: Write the boundaries as two explicit lists
summary: "The scope of a piece of work is written as an in-scope list and an out-of-scope list, never as narrative prose, and the section may not be empty."
capability_tags:
  - clarify-requirements
pattern_tags:
  - scope-routing
conditions_applies_when: The scope of a piece of work is written down.
conditions_does_not_apply_when: The scope is fixed and not written anywhere.
artifact_contract_output_type: scope-boundaries
artifact_contract_required_data:
  - the in-scope list
  - the out-of-scope list
  - the reason for each exclusion
artifact_contract_verified_by: both boundaries are explicit lists and the section is not empty
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
---

# Write the boundaries as two explicit lists
**Boundaries must be explicit lists:**
"In scope" — what this phase produces
"Out of scope" — what it explicitly does NOT do (with brief reasoning)
Boundaries section is MANDATORY — cannot be empty
"In scope" and "Out of scope" must be explicit lists, not narrative prose
<!-- vpmodule:atom:end write-the-boundaries-as-two-explicit-lists -->