---
instruction_id: compare-the-arms-and-read-the-delta
title: Compare the arms and read the delta
summary: "The tool and the bare model see the same inputs, the rubric is written after the first outputs, and only the difference between the arms counts."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A change to a tool is measured against what happens without it.
conditions_does_not_apply_when: There is no way to run the same input without the change.
artifact_contract_output_type: arm-comparison
artifact_contract_required_data:
  - the arm with the tool
  - the arm without it
  - the rubric written after the first outputs
  - the delta
artifact_contract_verified_by: "the delta between the arms was read, not the score of the arm with the tool"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/approaches/eval-loop.md
status: active
revision: 1
---

# Compare the arms and read the delta
Run with and without.
The skill and the bare model see the same inputs in parallel.
Write the rubric after the first outputs.
Each entry is binary and names one failure mode you saw; prefer graders computed from the transcript and files, and keep a model judge for short outputs only
An assertion that passes in both arms tests nothing the skill adds: sharpen it or drop it.
Three runs per case, because output varies run to run.
read the delta between arms, never the with-skill score alone.
Read the transcripts, not just the grades.
Change one thing, with its why, and cut any line whose removal did not change results.
A variant run
says whether the change, not chance, moved the score.
