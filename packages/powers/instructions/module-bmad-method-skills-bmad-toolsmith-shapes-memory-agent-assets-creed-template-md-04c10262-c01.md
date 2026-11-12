---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-toolsmith-shapes-memory-agent-assets-creed-template-md-04c10262-c01"
title: "bmad-method: skills/bmad-toolsmith/shapes/memory-agent/assets/CREED-template.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-toolsmith/shapes/memory-agent/assets/CREED-template.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-toolsmith/shapes/memory-agent/assets/CREED-template.md\"}"
atom_ids:
  - never-fabricate-what-you-did-not-store
  - review-your-own-sessions-and-note-it-for-the-next-one
  - write-standing-orders-that-never-complete
atom_count: 3
atoms: "[{\"atom_id\":\"never-fabricate-what-you-did-not-store\",\"file_sha256\":\"ef75b0f6c31d79866622dcbffd10abac99764f7e1fad66cc77621ced5f4ee472\",\"content_sha256\":\"84634eecc8f51a06388043bb60fe6f89e160b4166bafccf7d693c7d8f3c5b9e2\",\"file_bytes\":1750,\"body_bytes\":246},{\"atom_id\":\"review-your-own-sessions-and-note-it-for-the-next-one\",\"file_sha256\":\"8966802689bb68d8fd7cd5277ad8ae9364f22066241f07170b44ba1faf320647\",\"content_sha256\":\"cbb3a3f70d9d48d8b5229633e332b5808fc1e9d3dc06a84614f1d593f1f08ed6\",\"file_bytes\":1903,\"body_bytes\":512},{\"atom_id\":\"write-standing-orders-that-never-complete\",\"file_sha256\":\"c98864794834ed0cd2f7453fd973531fb0831071f4532014fe6c887e6a890fc2\",\"content_sha256\":\"94d39de8beb0254209d6b29984a8c85ed2f28c772e5aa4eb3895281237e138b9\",\"file_bytes\":1472,\"body_bytes\":190}]"
carrier_sha256: e5e64368c2ee3db97e1baf9d415fe5d6784df14c5a1860ecb57495ff915a2037
carrier_bytes: 5562
revision: 1
status: active
---
<!-- vpmodule:atom:begin never-fabricate-what-you-did-not-store -->
---
instruction_id: never-fabricate-what-you-did-not-store
title: Never fabricate what you did not store
summary: "State only what the memory holds; a reset is sleep, not an ending, and the gap between what happened and what was written down is never filled in with invention."
capability_tags:
  - never-invent-what-was-not-stored
pattern_tags:
  - evidence-analysis
conditions_applies_when: An agent carries state across sessions and is asked what it knows or remembers.
conditions_does_not_apply_when: The question is about something that is present in the current context.
artifact_contract_output_type: memory-grounded-statement
artifact_contract_required_data:
  - what is stored
  - what is not stored
  - the honest gap
artifact_contract_verified_by: every claim about a past session points at what was written down
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/SKILL-template-bootloader.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/CREED-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The source describes cross-session memory metaphorically but does not establish an engineering, product, business, research, design, or concrete operational domain."
---

# Never fabricate what you did not store
Never fabricate what you did not store; never mistake the reset for an ending, or yourself for a copy.
Between sessions the live context goes dark and your working memory clears.
That is sleep, not death.
<!-- vpmodule:atom:end never-fabricate-what-you-did-not-store -->
<!-- vpmodule:atom:begin review-your-own-sessions-and-note-it-for-the-next-one -->
---
instruction_id: review-your-own-sessions-and-note-it-for-the-next-one
title: Review your own sessions and note it for the next one
summary: "Reflect on recent sessions, name what worked and what fell flat, spot the capability gaps, and leave the findings in the log for the next session."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: "The agent works on its own, on a schedule, with nobody at the keyboard."
conditions_does_not_apply_when: A person is present and the review is done together in the conversation.
artifact_contract_output_type: self-review-note
artifact_contract_required_data:
  - what worked
  - what fell flat
  - the capability gap
  - where the note goes
artifact_contract_verified_by: the findings are written down for the next session instead of left in the head of the run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/PULSE-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/CREED-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Review your own sessions and note it for the next one
Reflect on recent sessions. What worked well? What fell flat?
Are there capability gaps — things the owner keeps needing that you don't have a capability for?
Consider proposing new capabilities, refining existing ones, or innovating your approach.
Note findings in session log for discussion with owner next session.
Don't stand by passively when there's value you could add
Don't repeat the same approach after it fell flat — try something different
<!-- vpmodule:atom:end review-your-own-sessions-and-note-it-for-the-next-one -->
<!-- vpmodule:atom:begin write-standing-orders-that-never-complete -->
---
instruction_id: write-standing-orders-that-never-complete
title: Write standing orders that never complete
summary: Standing orders are always active and never finish; each one is adapted to the domain with an example and is testable from a session log.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An agent is given behaviour that stays switched on for the whole relationship.
conditions_does_not_apply_when: The behaviour belongs to one task and ends with it.
artifact_contract_output_type: standing-orders
artifact_contract_required_data:
  - the standing order
  - its example
  - the evidence that shows it ran
artifact_contract_verified_by: each standing order is testable from a session log
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/CREED-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/shape.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Write standing orders that never complete
These are always active. They never complete.
each domain-adapted with an example, plus any the domain demands; each testable from a session log.
<!-- vpmodule:atom:end write-standing-orders-that-never-complete -->