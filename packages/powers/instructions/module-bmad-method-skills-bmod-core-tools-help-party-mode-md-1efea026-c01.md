---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmod-core-tools-help-party-mode-md-1efea026-c01"
title: "bmad-method: skills/bmod-core-tools/help/party-mode.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmod-core-tools/help/party-mode.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmod-core-tools/help/party-mode.md\"}"
atom_ids:
  - carry-the-objections-back-to-the-owner-of-the-document
  - keep-a-debate-out-of-the-verdict
  - remember-the-outcomes-of-a-session-not-the-transcript
atom_count: 3
atoms: "[{\"atom_id\":\"carry-the-objections-back-to-the-owner-of-the-document\",\"file_sha256\":\"7beef431c05194a6f3085106d2c3672f5db897f56a74e5ff04306a271a643bf5\",\"content_sha256\":\"3df3c150f42ee0db773c7c7638a15ff9690644da89f781e2f440577591d952c7\",\"file_bytes\":1418,\"body_bytes\":193},{\"atom_id\":\"keep-a-debate-out-of-the-verdict\",\"file_sha256\":\"67898e122c4fa8d9f853c6de06849d98e8bb19d94c61c7d9aa62bbb2c4cf142f\",\"content_sha256\":\"fd209ef0dfae1d9fab8a41482ea0d92173453aacdd64fca76a210c7ba52646f1\",\"file_bytes\":1627,\"body_bytes\":210},{\"atom_id\":\"remember-the-outcomes-of-a-session-not-the-transcript\",\"file_sha256\":\"0dbf1adce41078e553c5c84545b267b4ed10b98ab5b216551b81ab8311e3a13b\",\"content_sha256\":\"7ead5643f9564dbd673b1fb79b482c3f4be3b66a4ff9f9ebbe5618abaaea329d\",\"file_bytes\":1612,\"body_bytes\":317}]"
carrier_sha256: 4d8839f523dc6800da7eb5c36579ae55165f1b2259d00b9ee647b01cb6a50bff
carrier_bytes: 5108
revision: 1
status: active
---
<!-- vpmodule:atom:begin carry-the-objections-back-to-the-owner-of-the-document -->
---
instruction_id: carry-the-objections-back-to-the-owner-of-the-document
title: Carry the objections back to the owner of the document
summary: "A room that reacts to a draft produces objections, and the best of them are carried back to whoever owns the document, so the draft is changed in the place that owns it."
capability_tags:
  - facilitate-a-group-discussion
pattern_tags:
  - requirements-clarification
conditions_applies_when: A group of voices has reacted to a draft document.
conditions_does_not_apply_when: The exchange produced no objection to the draft.
artifact_contract_output_type: carried-objections
artifact_contract_required_data:
  - the objections the room raised
  - the best of them
  - the owner of the document they go back to
artifact_contract_verified_by: the objections reach the owner of the document and are not left in the discussion
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/party-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - product
---

# Carry the objections back to the owner of the document
On a draft: have the room react to a PRD, a design, or a plan, then carry the best objections back to the skill that owns the document.
<!-- vpmodule:atom:end carry-the-objections-back-to-the-owner-of-the-document -->
<!-- vpmodule:atom:begin keep-a-debate-out-of-the-verdict -->
---
instruction_id: keep-a-debate-out-of-the-verdict
title: Keep a debate out of the verdict
summary: "Several distinct voices argue a question out with the user in the room, so an angle surfaces that one voice would miss; the exchange debates and does not verify facts or rank findings."
capability_tags:
  - facilitate-a-group-discussion
pattern_tags:
  - dialectical-discussion
conditions_applies_when: Several perspectives are asked to argue a question out in one exchange.
conditions_does_not_apply_when: "The work is a verification or a ranked finding list, not a discussion."
artifact_contract_output_type: discussion-outcome
artifact_contract_required_data:
  - the angles each voice raised
  - the objection the exchange produced
  - that no fact was verified and no finding was ranked
artifact_contract_verified_by: the exchange reports angles and stops short of a verification or a ranking
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/party-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body separates multi-voice debate from fact checking and finding ranking but names no supported subject domain; assigning a domain from conversation format would infer the question's subject."
---

# Keep a debate out of the verdict
Several distinct voices argue a question out with the user in the room, so an angle surfaces that one voice would miss.
It debates; it does not verify facts or rank findings.
<!-- vpmodule:atom:end keep-a-debate-out-of-the-verdict -->
<!-- vpmodule:atom:begin remember-the-outcomes-of-a-session-not-the-transcript -->
---
instruction_id: remember-the-outcomes-of-a-session-not-the-transcript
title: "Remember the outcomes of a session, not the transcript"
summary: "A cast of voices remembers earlier sessions as a short log of outcomes and memorable moments, not a transcript; memory is on by default for the default room, only when it is turned on for a saved party, and a shipped party starts fresh each time."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A group of voices or a session is given a memory that survives it.
conditions_does_not_apply_when: The exchange is closed and nothing has to survive it.
artifact_contract_output_type: session-memory
artifact_contract_required_data:
  - the outcomes and the memorable moments
  - the rule that no transcript is kept
  - who remembers by default and who starts fresh
artifact_contract_verified_by: what is kept is a short log of outcomes and no transcript
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/party-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Remember the outcomes of a session, not the transcript
A party can remember earlier sessions as a short log of outcomes and memorable moments, not a transcript.
The default room remembers unless memory is turned off.
A saved party remembers only when its memory is turned on.
Shipped parties start fresh each time.
<!-- vpmodule:atom:end remember-the-outcomes-of-a-session-not-the-transcript -->