---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: traction-eos-score
title: Score the six EOS components
summary: "Score the business by the six Quick Diagnostic components, state which pass, and apply the stated bands."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing an EOS implementation.
conditions_does_not_apply_when: A code review that does not assess the business.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, each component's status and the band."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/traction-eos/SKILL.md; sha256=1d58e30d368779e98823324434df5bb31eccb76897737a880c3e855edccdc96a; locator=skills/traction-eos/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the business against the six Quick Diagnostic rows

Score the business by how many of the six Quick Diagnostic rows pass; each component is either in place or not, and rocks consistently hitting 80%+ completion qualifies the top band. Bands: 9-10 = all six rows pass and rocks hit 80%+; 7-8 = five rows pass, one component weak; 5-6 = three to four rows pass; 3-4 = one to two rows pass; <=2 = no operating rhythm. Always state the current score, the failing diagnostic rows and the next action for each.
