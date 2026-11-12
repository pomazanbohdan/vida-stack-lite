---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-ux-heuristics-skill-md-235d8e0d-c02"
title: "wondelai-skills: skills/ux-heuristics/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/ux-heuristics/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/ux-heuristics/SKILL.md\"}"
atom_ids:
  - ux-heuristics-error-messages
  - ux-heuristics-error-prevention
  - ux-heuristics-flexibility
  - ux-heuristics-help
  - ux-heuristics-krug-laws
  - ux-heuristics-labels
  - ux-heuristics-method-selection
  - ux-heuristics-minimalist-design
atom_count: 8
atoms: "[{\"atom_id\":\"ux-heuristics-error-messages\",\"file_sha256\":\"f8f34bb11e520d6a503b5ce841ab77e10f4a4ea925b1de9741122469da09f581\",\"content_sha256\":\"6bbd35cfae628aef4c27cffbdce820cf0c731527afc98fd9bad831f831de5112\",\"file_bytes\":1253,\"body_bytes\":178},{\"atom_id\":\"ux-heuristics-error-prevention\",\"file_sha256\":\"a69996640fc811faea0c98e6436d27f771d6e50aee9eedd328f5172185df7f70\",\"content_sha256\":\"fd9e2655fb4b3145a9a6146f57f8e13db9c622e112724d6791a5479b30fb511e\",\"file_bytes\":1286,\"body_bytes\":204},{\"atom_id\":\"ux-heuristics-flexibility\",\"file_sha256\":\"9fb05e4870260fca44c9364db54b36266458e97c603eb122469571c2f0623a8c\",\"content_sha256\":\"7b8a63fc3989735936afd231da67eb8f61c7d02585413ecc7fa19e16d31ead2f\",\"file_bytes\":1275,\"body_bytes\":192},{\"atom_id\":\"ux-heuristics-help\",\"file_sha256\":\"b0a7e4078458a4b5367edf72cc19c4760902961fa14efc1f3ef1872c8497d8c2\",\"content_sha256\":\"9cb49dae4b720c6d863d8f0ac5dc9d4b98bbd3ccccb1a3a848bb6b2461717cd3\",\"file_bytes\":1135,\"body_bytes\":91},{\"atom_id\":\"ux-heuristics-krug-laws\",\"file_sha256\":\"5233fffd521e0f17c4cf8ac73f9ac766704a3d7e5b0224ef44d38b4879adb8bc\",\"content_sha256\":\"6c790897835706c7b56a64c6d7bc6a7ff3a3e5ac03d8d1571e175b0822ab15b1\",\"file_bytes\":1141,\"body_bytes\":102},{\"atom_id\":\"ux-heuristics-labels\",\"file_sha256\":\"cb63cf506c1705364df0ca6201d7a3e4b3dcdf633da44b064841365cbe45fb0c\",\"content_sha256\":\"967b8aa571a543c6a68c972c99a5a2dbabec8b1c2007a942be7e2ab6910b9b99\",\"file_bytes\":1270,\"body_bytes\":179},{\"atom_id\":\"ux-heuristics-method-selection\",\"file_sha256\":\"41baa162a2c4d6043bef0739a525a1da4c73e77779dc0f78b74f73c51873ec65\",\"content_sha256\":\"10642c49e67fc9dee4b14a6b2c048466ff8f625246a7e7d52b7c697c6a6fec31\",\"file_bytes\":1272,\"body_bytes\":193},{\"atom_id\":\"ux-heuristics-minimalist-design\",\"file_sha256\":\"cdfea5cc12c67258fe3cb0cebca4e4e07f5afffa1a410903bc06713682ce572e\",\"content_sha256\":\"8ba43544af0e25f72365d2468439821010d9a21799b20ba5fdb2f68e67d9c694\",\"file_bytes\":1234,\"body_bytes\":152}]"
carrier_sha256: 01915d3307bebdc2adb0bb2a951640bf5e8320e38ac88e870c17cfdf0fe54c9f
carrier_bytes: 10739
revision: 1
status: active
---
<!-- vpmodule:atom:begin ux-heuristics-error-messages -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-error-messages
title: Write actionable error messages
summary: "State what happened, why and how to fix it, in plain specific language that does not blame users and preserves input."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: Writing or reviewing error messages.
conditions_does_not_apply_when: A system log message that users never see.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The message explains the cause and the fix and preserves the user's input."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L143-L145"
status: active
revision: 1
---

# Write actionable error messages

Error messages should state what happened, why, and how to fix it; use plain, specific language, do not blame users, and preserve their input.
<!-- vpmodule:atom:end ux-heuristics-error-messages -->
<!-- vpmodule:atom:begin ux-heuristics-error-prevention -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-error-prevention
title: Prevent errors before they happen
summary: "Constrain inputs, autocomplete, default sensibly and warn about unsaved changes; distinguish slips from mistakes."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: Designing forms or high-risk interactions.
conditions_does_not_apply_when: A free-text field with no predictable error mode.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The design prevents likely slips and mistakes rather than only reporting them.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L131-L133"
status: active
revision: 1
---

# Prevent errors before they happen

Prevent problems with constrained inputs, autocomplete, sensible defaults, and unsaved-change warnings; distinguish prevention for slips from prevention for mistakes.
<!-- vpmodule:atom:end ux-heuristics-error-prevention -->
<!-- vpmodule:atom:begin ux-heuristics-flexibility -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-flexibility
title: Support novice and expert efficiency
summary: "Offer shortcuts, bulk actions, saved searches and command palettes with progressive disclosure."
capability_tags:
  - design-user-interface
pattern_tags:
  - progressive-disclosure
conditions_applies_when: Designing for users with different levels of experience.
conditions_does_not_apply_when: A single-use interface with no repeat tasks.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Experts have efficient paths without making the interface harder for novices.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L137-L139"
status: active
revision: 1
---

# Support novice and expert efficiency

Support novices and experts with efficiency features such as shortcuts, bulk actions, saved searches, and command palettes; use progressive disclosure.
<!-- vpmodule:atom:end ux-heuristics-flexibility -->
<!-- vpmodule:atom:begin ux-heuristics-help -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-help
title: Make help searchable and contextual
summary: "Provide help that is searchable, task-focused and available where the user needs it."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - technical-writing
conditions_applies_when: Designing in-product help or documentation.
conditions_does_not_apply_when: A product with no user-facing help surface.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Help is findable from the task and answers the user's actual question."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L146-L150"
status: active
revision: 1
---

# Make help searchable and contextual

Make help searchable, task-focused, and contextual.
<!-- vpmodule:atom:end ux-heuristics-help -->
<!-- vpmodule:atom:begin ux-heuristics-krug-laws -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-krug-laws
title: "Apply Krug's usability laws"
summary: Use the first three laws and the Trunk Test to make navigation and orientation obvious.
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Designing navigation or reviewing orientation.
conditions_does_not_apply_when: A single-page task with no navigation decision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Users can identify where they are and what they can do next.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L22-L25"
status: active
revision: 1
---

# Apply Krug's usability laws

Use Krug's first three laws and Trunk Test for navigation orientation.
<!-- vpmodule:atom:end ux-heuristics-krug-laws -->
<!-- vpmodule:atom:begin ux-heuristics-labels -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-labels
title: "Use clear, familiar labels"
summary: "Prefer plain, action-oriented labels, simplify labels that need explanation, and never use plain language to hide unfavorable terms."
capability_tags:
  - design-user-interface
pattern_tags:
  - technical-writing
conditions_applies_when: Writing interface labels or action copy.
conditions_does_not_apply_when: A label fixed by an external contract or platform.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Labels are understandable without explanation and do not obscure consequences.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L26-L54"
status: active
revision: 1
---

# Use clear, familiar labels

Use clear, plain, familiar labels and action-oriented copy; simplify labels needing explanation; never use plain language to hide unfavorable terms.
<!-- vpmodule:atom:end ux-heuristics-labels -->
<!-- vpmodule:atom:begin ux-heuristics-method-selection -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-method-selection
title: Choose the right evaluation method
summary: "Use heuristic evaluation before user testing, user testing after fixes, A/B tests for optimization and analytics for ongoing review."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Planning usability evaluation.
conditions_does_not_apply_when: A one-off visual check with no evaluation question.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The chosen method matches the evaluation stage and question.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L220-L228"
status: active
revision: 1
---

# Choose the right evaluation method

Use heuristic evaluation before user testing, user testing after fixes, A/B tests for optimization, ongoing analytics review; follow stated time/findings.
<!-- vpmodule:atom:end ux-heuristics-method-selection -->
<!-- vpmodule:atom:begin ux-heuristics-minimalist-design -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-minimalist-design
title: Make every element earn its place
summary: "Show what matters now, hide what does not, and use one primary call to action per page."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Reviewing page density or competing actions.
conditions_does_not_apply_when: An information-dense view that is intentionally the primary task.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each element supports the current task and one primary action is clear.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L140-L142"
status: active
revision: 1
---

# Make every element earn its place

Ensure every element earns its place, show what matters now, hide what does not, and use one primary CTA per page.
<!-- vpmodule:atom:end ux-heuristics-minimalist-design -->