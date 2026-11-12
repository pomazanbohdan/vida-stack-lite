---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-prfaq-references-press-release-md-2d929ab4-c01"
title: "bmad-method: skills/bmad-prfaq/references/press-release.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-prfaq/references/press-release.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-prfaq/references/press-release.md\"}"
atom_ids:
  - draft-self-challenge-invite-deepen
  - hold-the-announcement-to-the-quality-bars
atom_count: 2
atoms: "[{\"atom_id\":\"draft-self-challenge-invite-deepen\",\"file_sha256\":\"6ece384e882dff6ef1428793d3777f13f0029f1ef3bd3b6036f48e14189c806f\",\"content_sha256\":\"af0247996dd31f70e85b4c83bac34b4e744008cade173d31fea92e14128b6d61\",\"file_bytes\":1588,\"body_bytes\":468},{\"atom_id\":\"hold-the-announcement-to-the-quality-bars\",\"file_sha256\":\"281068a37a1c445ab0c69373688cfdfe5c516964752e7e3f0309b6a9d33c8b23\",\"content_sha256\":\"4f5561678369451da8b58e6d911d6204412aecefab4e526def1587ebec027054\",\"file_bytes\":1838,\"body_bytes\":707}]"
carrier_sha256: dbd45847b842be5572539f5ee3e1fade83c41dd7b53d8345379da87138f26c3c
carrier_bytes: 3691
revision: 1
status: active
---
<!-- vpmodule:atom:begin draft-self-challenge-invite-deepen -->
---
instruction_id: draft-self-challenge-invite-deepen
title: "Draft, self-challenge, invite, deepen"
summary: "Draft each section first, challenge your own draft out loud, then invite the person to sharpen it, and push one level deeper on every response."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - requirements-clarification
conditions_applies_when: "You are coaching a person through a document, section by section."
conditions_does_not_apply_when: The section is generated without a human in the loop.
artifact_contract_output_type: coaching-draft-cycle
artifact_contract_required_data:
  - the draft
  - the self-challenge
  - the invitation to sharpen it
artifact_contract_verified_by: every response pushes one level deeper than the last
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/press-release.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Draft, self-challenge, invite, deepen
The coaching dynamic: draft each section yourself first, then model critical thinking by challenging your own draft out loud before inviting the user to sharpen it.
Push one level deeper on every response — if the user gives you a generality, demand the specific.
The cycle is: draft → self-challenge → invite → deepen.
Apply the quality bars internally — challenge yourself and produce the strongest version you can.
<!-- vpmodule:atom:end draft-self-challenge-invite-deepen -->
<!-- vpmodule:atom:begin hold-the-announcement-to-the-quality-bars -->
---
instruction_id: hold-the-announcement-to-the-quality-bars
title: Hold the announcement to the quality bars
summary: "No jargon, no weasel words, the mom test, the so-what test and honest framing. The bars are embodied in the challenges, not enumerated to the reader."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A customer-facing announcement is being written.
conditions_does_not_apply_when: The text is an internal log or a machine format.
artifact_contract_output_type: customer-facing-copy
artifact_contract_required_data:
  - the wording
  - the bar it had to clear
artifact_contract_verified_by: "no weasel word and no jargon a customer would not use, and every sentence survives the so-what test"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/press-release.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
  - business
---

# Hold the announcement to the quality bars
These are the standards to hold the press release to. Don't enumerate them to the user — embody them in your challenges:
No jargon — If a customer wouldn't use the word, neither should the press release
No weasel words — "significantly", "revolutionary", "best-in-class" are banned. Replace with specifics.
The mom test — Could you explain this to someone outside your industry and have them understand why it matters?
The "so what?" test — Every sentence should survive "so what?" If it can't, cut or sharpen it.
Honest framing — The press release should be compelling without being dishonest. If you're overselling, the customer FAQ will expose it.
<!-- vpmodule:atom:end hold-the-announcement-to-the-quality-bars -->