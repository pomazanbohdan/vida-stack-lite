---
instruction_id: weave-the-answers-into-one-conversation
title: Weave the answers into one conversation
summary: "Deliver several voices as a single exchange with the turns interleaved, never as a row of separate answers."
capability_tags:
  - facilitate-a-group-discussion
pattern_tags:
  - multi-voice-delivery
conditions_applies_when: Several voices answer in the same reply and the answer has to read as one exchange.
conditions_does_not_apply_when: "Only one voice speaks, or the result is a table of separate findings rather than a dialogue."
artifact_contract_output_type: woven-exchange
artifact_contract_required_data:
  - the turns
  - the order of the turns
  - the connective tissue
  - the preserved substance
artifact_contract_verified_by: the reply reads as one exchange and no speaker is paraphrased in the third person
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-party-mode/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-party-mode/references/mode-subagent.md
status: active
revision: 1
---

# Weave the answers into one conversation
Present a single conversation — turns as `{icon} **{name}:**`, back to back — not a row of answers.
It reads like people talking, not a report.
Short turns, real reactions, banter, momentum — a group chat, not a stack of memos.
Brevity by default: a persona goes long only when asked.
Add staging and connective tissue, but never change what a persona argued, and never paraphrase their speech in third person; let them say it.
Weave the delivery, keep the substance.
Reorder turns so a rebuttal lands right after what it rebuts,
add the connective phrasing real talk has
and let one persona pick up a thread another dropped.
Never change what an agent argued — weave delivery, preserve substance.
