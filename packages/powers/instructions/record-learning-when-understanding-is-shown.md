---
instruction_id: record-learning-when-understanding-is-shown
title: Record learning when understanding is shown
summary: "Record a learning when understanding is demonstrated, prior knowledge is disclosed, a misconception is corrected, or the mission shifts; never record mere coverage."
capability_tags:
  - teach-with-workspace
pattern_tags:
  - teaching-workspace
conditions_applies_when: A teaching session produces evidence about the learner.
conditions_does_not_apply_when: "Material was merely covered, or the fact is already a terse glossary term."
artifact_contract_output_type: learning-record
artifact_contract_required_data:
  - what was learned
  - why it matters
  - evidence
artifact_contract_verified_by: the record states why it changes what to teach next
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/teach/LEARNING-RECORD-FORMAT.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body governs pedagogical learner records and prior knowledge; no supported domain follows without broadening operations beyond its defined workflow sense.
---

# Record learning when understanding is shown
Learning records capture non-obvious lessons, key insights, and stated prior knowledge that will steer future sessions. They are used to calculate the zone of proximal development. Create the directory lazily: only when the first record is written.
Write one when any of these is true:
1. **The user demonstrated genuine understanding of something non-trivial**: not just exposure, but evidence they can use the concept correctly. This sets a new floor for what to teach next.
2. **The user disclosed prior knowledge**: "I already know X." Record it so future sessions don't re-teach it. Also record the _depth_ claimed.
3. **A misconception was corrected**: the user previously believed something wrong and now sees why. These are high-value: they predict future stumbling blocks for related topics.
4. **The mission shifted in response to learning**: the user discovered they cared about something different than they thought. Cross-link to the mission and update it.
### What does _not_ qualify
- Material that was merely covered. Coverage is not learning. Wait for evidence.
- Anything already captured tersely in the glossary as a term definition. Don't duplicate.
- Session-by-session activity logs. Learning records are not a journal: they are decision-grade insights.
### Supersession
When a later record contradicts an earlier one (the user's understanding deepened or corrected), mark the old record `Status: superseded by LR-NNNN` rather than deleting it. The history of how understanding evolved is itself useful signal.
