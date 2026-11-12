---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-spike-and-sketch-md-f6fb615f-c01"
title: "gsd-core: docs/how-to/spike-and-sketch.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/how-to/spike-and-sketch.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/spike-and-sketch.md\"}"
atom_ids:
  - carry-pre-validated-decisions-forward-as-locked
  - prove-feasibility-before-visual-direction
  - write-the-hypothesis-before-the-code-and-verdict-with-evidence
atom_count: 3
atoms: "[{\"atom_id\":\"carry-pre-validated-decisions-forward-as-locked\",\"file_sha256\":\"fdc0ec02c455c424d1460455a1563496d5e95baaaa78629cea18eaf04e21825b\",\"content_sha256\":\"745d0f239ddb4840fe1815be9ec6104093e575dd6760a73a51ae1147a11d2d5c\",\"file_bytes\":1453,\"body_bytes\":388},{\"atom_id\":\"prove-feasibility-before-visual-direction\",\"file_sha256\":\"fd1cda7eb5d62f6b55bf7179ab42eb945480ea3f0594777e75038599f201e680\",\"content_sha256\":\"bddaf0d34f1ef3e531b03902ab02a313ecc09255ba7518b56f9c06a3fd484217\",\"file_bytes\":1524,\"body_bytes\":466},{\"atom_id\":\"write-the-hypothesis-before-the-code-and-verdict-with-evidence\",\"file_sha256\":\"2d5646c5313f20fbfa9d813955bd09a01e2837fc62ca73b961e5e752fe24bf42\",\"content_sha256\":\"06170800120daba56c0696ee232b135e7d6ac6d74be5430ff8798467d21f584c\",\"file_bytes\":1397,\"body_bytes\":300}]"
carrier_sha256: 87a517cdc7ee8277e25f03a04fd00e25fc9e57c79dc006fd184a84ea35b0714c
carrier_bytes: 4847
revision: 1
status: active
---
<!-- vpmodule:atom:begin carry-pre-validated-decisions-forward-as-locked -->
---
instruction_id: carry-pre-validated-decisions-forward-as-locked
title: Carry pre-validated decisions forward as locked
summary: A decision that was already validated in an earlier experiment is loaded as locked and is not asked again.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - frozen-intent
conditions_applies_when: A decision from an earlier experiment is available when the next stage starts.
conditions_does_not_apply_when: The decision was never validated.
artifact_contract_output_type: carried-forward-decisions
artifact_contract_required_data:
  - the decision
  - the source it was validated in
artifact_contract_verified_by: the carried decision is marked locked and is not re-asked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/spike-and-sketch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
---

# Carry pre-validated decisions forward as locked
pre-validated decisions (layout, colour palette, typography, spacing) are treated as locked and are not re-asked.
The planner also reads spike findings when a `spike-findings-*` skill is present, so validated technical choices (which library, which protocol, which data format) flow directly into task plans without repeated explanation.
<!-- vpmodule:atom:end carry-pre-validated-decisions-forward-as-locked -->
<!-- vpmodule:atom:begin prove-feasibility-before-visual-direction -->
---
instruction_id: prove-feasibility-before-visual-direction
title: Prove feasibility before visual direction
summary: A spike proves the approach is buildable and a sketch proves the design is worth building; run the spike first.
capability_tags:
  - design-experiments
pattern_tags:
  - explore-then-exploit
conditions_applies_when: Both the technical approach and the visual direction are undecided.
conditions_does_not_apply_when: The technical approach is already proven.
artifact_contract_output_type: feasibility-then-direction
artifact_contract_required_data:
  - the feasibility question
  - the visual question
artifact_contract_verified_by: the feasibility verdict precedes the visual direction
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/spike-and-sketch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
---

# Prove feasibility before visual direction
Spikes answer binary feasibility questions with executable code and a VALIDATED / INVALIDATED / PARTIAL verdict. Sketches answer visual questions with 2–3 browser-comparable HTML variants.
They are complementary — a spike proves the approach is buildable, a sketch proves the design is worth building.
| "What's the right technical approach, and what should it look like?" | Both, in order: spike first, then sketch |
<!-- vpmodule:atom:end prove-feasibility-before-visual-direction -->
<!-- vpmodule:atom:begin write-the-hypothesis-before-the-code-and-verdict-with-evidence -->
---
instruction_id: write-the-hypothesis-before-the-code-and-verdict-with-evidence
title: Write the hypothesis before the code and the verdict with evidence
summary: The hypothesis is written before any code and the verdict carries evidence.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A feasibility experiment is about to be built.
conditions_does_not_apply_when: The experiment is a throwaway with no question to answer.
artifact_contract_output_type: experiment-record
artifact_contract_required_data:
  - the hypothesis written before the code
  - the verdict
  - the evidence behind it
artifact_contract_verified_by: the hypothesis predates the code and the verdict names its evidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/spike-and-sketch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Write the hypothesis before the code and the verdict with evidence
A **Given / When / Then** hypothesis written before any code
A **VALIDATED**, **INVALIDATED**, or **PARTIAL** verdict with evidence
Working code (not pseudocode)
An investigation trail documenting edge cases, pivots, and surprises
<!-- vpmodule:atom:end write-the-hypothesis-before-the-code-and-verdict-with-evidence -->