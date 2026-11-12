---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-agent-po-assets-ticket-template-md-4ecd49c1-c01"
title: "bmad-method: skills/bmad-agent-po/assets/ticket-template.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-agent-po/assets/ticket-template.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-agent-po/assets/ticket-template.md\"}"
atom_ids:
  - match-the-example-for-detail-not-for-text
  - name-the-behaviour-that-must-not-change
  - record-a-user-choice-as-a-dated-decision
  - write-the-done-when-as-three-to-six-checks
atom_count: 4
atoms: "[{\"atom_id\":\"match-the-example-for-detail-not-for-text\",\"file_sha256\":\"5c059d54219737d3cf5acb61aba0bd123c1a88389df574cf858b2e314a210f5e\",\"content_sha256\":\"36864b0e66ee7e384b3343d38a8752da8dba9ec80659131cf09cf6b5eab0a975\",\"file_bytes\":1561,\"body_bytes\":208},{\"atom_id\":\"name-the-behaviour-that-must-not-change\",\"file_sha256\":\"bd425dc9c1c07aadafa90d76ecbe125377e362f7b2f10bfb0218c6f39aef162d\",\"content_sha256\":\"b4eee8941f0a64f85fe5ff88dd174e4e3809a0431dc7ba9f15b3d502a58421e7\",\"file_bytes\":1401,\"body_bytes\":200},{\"atom_id\":\"record-a-user-choice-as-a-dated-decision\",\"file_sha256\":\"f9510f4f8a796b3a0b153c1f6d847280d04f6ad573c97219a4e65558ba71b188\",\"content_sha256\":\"ac61e201c60eb18e22ce7553c314654702304df6ff73ab2cd19b73aaa2c4cf81\",\"file_bytes\":1889,\"body_bytes\":497},{\"atom_id\":\"write-the-done-when-as-three-to-six-checks\",\"file_sha256\":\"77987b9929b7e95ba0478b013b0708d3daab7c739182fbeedd077f7f3be012bb\",\"content_sha256\":\"fc446ac961c2082eba2667d271ecedec53066c85c44b92cb0ae971031ca11198\",\"file_bytes\":1591,\"body_bytes\":300}]"
carrier_sha256: 759989987788ca417a1e94f9690214bdef7c9fdef82e9e25333c00064b626bee
carrier_bytes: 6997
revision: 1
status: active
---
<!-- vpmodule:atom:begin match-the-example-for-detail-not-for-text -->
---
instruction_id: match-the-example-for-detail-not-for-text
title: "Match the example for detail, not for text"
summary: The placeholders of a template say what each section holds; its example shows the level of detail to match and is not copied.
capability_tags:
  - plan-implementation
pattern_tags:
  - output-formatting
conditions_applies_when: A template carries an example of a filled item.
conditions_does_not_apply_when: The template carries no example.
artifact_contract_output_type: detail-level-match
artifact_contract_required_data:
  - the level of detail the example shows
  - the text that is not copied
artifact_contract_verified_by: "the item matches the example's level of detail and copies none of its text"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/assets/ticket-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body only governs how to use an example in a filled template; it names no supported technical, product, business, UX, research, or concrete operational subject."
---

# Match the example for detail, not for text
Example, not part of the ticket: match its level of detail.
Its placeholders say what each section holds; its example is the level of detail to match, not copied.
<!-- vpmodule:atom:end match-the-example-for-detail-not-for-text -->
<!-- vpmodule:atom:begin name-the-behaviour-that-must-not-change -->
---
instruction_id: name-the-behaviour-that-must-not-change
title: Name the behaviour that must not change
summary: "The behaviour that has to stay as it is is written under Boundaries and names behaviour, not files."
capability_tags:
  - plan-implementation
pattern_tags:
  - structural-design
conditions_applies_when: A change could damage behaviour that is not part of the change.
conditions_does_not_apply_when: The change touches nothing beside its own new behaviour.
artifact_contract_output_type: boundary-list
artifact_contract_required_data:
  - the behaviour that must not change
  - the damage a valid implementation could cause
artifact_contract_verified_by: each boundary names behaviour and not a file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/assets/ticket-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Name the behaviour that must not change
Behavior that must stay as it is goes under Boundaries.
Must not change: [adjacent behavior a valid implementation could damage — name behavior, not files]
<!-- vpmodule:atom:end name-the-behaviour-that-must-not-change -->
<!-- vpmodule:atom:begin record-a-user-choice-as-a-dated-decision -->
---
instruction_id: record-a-user-choice-as-a-dated-decision
title: Record a user choice as a dated decision
summary: "Every choice the user makes while the work is cut is written as a dated decision line where the next reader will find it, and a declined suggestion is not raised again without new evidence."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The user makes a choice that changes the work.
conditions_does_not_apply_when: The choice is already recorded somewhere else.
artifact_contract_output_type: decision-line
artifact_contract_required_data:
  - the choice
  - the date
  - the place it is recorded
artifact_contract_verified_by: each choice carries a dated line where the next reader will find it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/validate.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/assets/ticket-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Record a user choice as a dated decision
Record each choice the user makes while slicing — a boundary, the tracer bullet, the sequencing, deferred scope, a declined suggestion — as a dated `Decision:` line in the container's Notes when it is made, not after approval.
A declined suggestion recorded as a `Decision:` line is not raised again unless new evidence changes its basis.
Decision: [a choice the user made, dated, so it is not asked again — a declined suggestion belongs here too]
<!-- vpmodule:atom:end record-a-user-choice-as-a-dated-decision -->
<!-- vpmodule:atom:begin write-the-done-when-as-three-to-six-checks -->
---
instruction_id: write-the-done-when-as-three-to-six-checks
title: Write the done when as three to six checks
summary: "A container's done condition is three to six checks at the altitude of the source's ids, taken from the source's measures and limits, and it is never deferred."
capability_tags:
  - plan-implementation
pattern_tags:
  - output-formatting
conditions_applies_when: A container is defined and has to say when it is done.
conditions_does_not_apply_when: "The container's done condition is already written down and needs no change."
artifact_contract_output_type: done-condition
artifact_contract_required_data:
  - the three to six checks
  - the source measures and limits they come from
artifact_contract_verified_by: "the done condition is three to six checks at the source's altitude"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/assets/ticket-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Write the done when as three to six checks
Done when is three to six checks at the altitude of the source's ids; it is the definition of the container and is never deferred.
Three to six checks the owner runs at the end, taken from the source's measures and limits. Closing every child is not one.
<!-- vpmodule:atom:end write-the-done-when-as-three-to-six-checks -->