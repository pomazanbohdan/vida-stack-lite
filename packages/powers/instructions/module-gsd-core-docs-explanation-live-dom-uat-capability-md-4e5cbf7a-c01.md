---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-explanation-live-dom-uat-capability-md-4e5cbf7a-c01"
title: "gsd-core: docs/explanation/live-dom-uat-capability.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/explanation/live-dom-uat-capability.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/explanation/live-dom-uat-capability.md\"}"
atom_ids:
  - assert-the-unchanged-surface-as-an-absence
  - confine-the-reach-to-one-purpose-built-role
  - keep-the-empty-result-and-the-failed-check-apart
atom_count: 3
atoms: "[{\"atom_id\":\"assert-the-unchanged-surface-as-an-absence\",\"file_sha256\":\"761a2a5f61ffe279bfb539f9b799e85070f152652b624dc15a7c51f00e3be3e3\",\"content_sha256\":\"d3a2da78b231d816c63d4af613644594cad6f9a46c0df944f4b0a0e6351ce9f0\",\"file_bytes\":1308,\"body_bytes\":146},{\"atom_id\":\"confine-the-reach-to-one-purpose-built-role\",\"file_sha256\":\"93fb8b20ab5fa2b7663467a859d3904a38cd56e582fa7ee5105c337dc2c47345\",\"content_sha256\":\"6334dca2359e69aa6196d4d7ca5bbf723b1001855cb9adc4f7842de534c87325\",\"file_bytes\":1432,\"body_bytes\":272},{\"atom_id\":\"keep-the-empty-result-and-the-failed-check-apart\",\"file_sha256\":\"a6435e30af7c158db5549394725acd704033b1ca51fea9f84a0a7bbf308aa88a\",\"content_sha256\":\"afd99e6a735ed2a2579a66af43a3f241b6306fd09a81deb3b425ac6edc6320e9\",\"file_bytes\":1621,\"body_bytes\":424}]"
carrier_sha256: 524b38e4e1b25b477f7f82ef31caca66dfac728b318fd841fb2d04f9e61f3ffa
carrier_bytes: 4800
revision: 1
status: active
---
<!-- vpmodule:atom:begin assert-the-unchanged-surface-as-an-absence -->
---
instruction_id: assert-the-unchanged-surface-as-an-absence
title: Assert the unchanged surface as an absence
summary: A surface that must not change is asserted as an absence — the thing that must not be there is checked — because that is the only way the unchanged state is observable.
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: A capability surface of a role must not widen.
conditions_does_not_apply_when: The surface is expected to change.
artifact_contract_output_type: absence-invariant
artifact_contract_required_data:
  - the surface that must not change
  - what is asserted to be absent
  - the configurations it is asserted in
artifact_contract_verified_by: the forbidden surface was asserted to be absent in every configuration
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/live-dom-uat-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Assert the unchanged surface as an absence
- That is a tested invariant, asserted as an absence, because that is the only way it is observable.
<!-- vpmodule:atom:end assert-the-unchanged-surface-as-an-absence -->
<!-- vpmodule:atom:begin confine-the-reach-to-one-purpose-built-role -->
---
instruction_id: confine-the-reach-to-one-purpose-built-role
title: Confine the reach to one purpose-built role
summary: "A reach that is only needed by one job is given to a role built for that job, so the generalist keeps its narrow and auditable surface."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - control-tiering
conditions_applies_when: A role needs a reach that only one kind of work requires.
conditions_does_not_apply_when: The reach is needed by every kind of work.
artifact_contract_output_type: purpose-built-role
artifact_contract_required_data:
  - the role that gets the reach
  - the generalist that keeps its surface
  - the work the new role exists for
artifact_contract_verified_by: "the reach is confined to the purpose-built role and the generalist's surface is unchanged"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/live-dom-uat-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Confine the reach to one purpose-built role
- Browser reach is confined to one agent that only exists to look at a DOM.
- So widening the executor would trade a narrow, auditable surface for a permanent broad one, to solve a problem that a narrower surface also solves.
<!-- vpmodule:atom:end confine-the-reach-to-one-purpose-built-role -->
<!-- vpmodule:atom:begin keep-the-empty-result-and-the-failed-check-apart -->
---
instruction_id: keep-the-empty-result-and-the-failed-check-apart
title: Keep the empty result and the failed check apart
summary: "A report states which of the two it is — there was nothing to check, or the check could not run and why — and the two are never collapsed into a single verdict."
capability_tags:
  - define-output-format
pattern_tags:
  - empty-result-policy
conditions_applies_when: A check reports an outcome and the report can say that the check did not run.
conditions_does_not_apply_when: The check always runs and its verdict is the only possible outcome.
artifact_contract_output_type: outcome-report
artifact_contract_required_data:
  - the outcome
  - the reason code
  - what the outcome means
artifact_contract_verified_by: a report that could not look is never read as a report that found no issues
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/live-dom-uat-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep the empty result and the failed check apart
- The artifact separates **`nothing_to_report`** (there were no UI criteria) from **`could_not_look`** (there were criteria, and the check did not happen — with a reason code saying which). Collapsing those two is what produced the ambiguous run notes that opened the original report. A report claiming *no issues* when it never opened a browser is worse than no report.
<!-- vpmodule:atom:end keep-the-empty-result-and-the-failed-check-apart -->