---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-toolsmith-approaches-eval-loop-md-59991dfa-c01"
title: "bmad-method: skills/bmad-toolsmith/approaches/eval-loop.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-toolsmith/approaches/eval-loop.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-toolsmith/approaches/eval-loop.md\"}"
atom_ids:
  - compare-the-arms-and-read-the-delta
  - stop-the-loop-on-its-stated-conditions
atom_count: 2
atoms: "[{\"atom_id\":\"compare-the-arms-and-read-the-delta\",\"file_sha256\":\"8313deb68ae260330ea421915e672bb6f5023e2f34282dcc47328c3a7140c7e5\",\"content_sha256\":\"b55b3b22cd426097436f0c868641493842ab8343a5a30ca274f18f90a640f89b\",\"file_bytes\":2107,\"body_bytes\":835},{\"atom_id\":\"stop-the-loop-on-its-stated-conditions\",\"file_sha256\":\"3172193dfb7deef432bbe960510eab72f5f16d72b964560fceeef9216082a7cf\",\"content_sha256\":\"9ac3afd6fc35679a016232ecbdc2a08f86ff01ce1cb33eada3ff44cf01c29435\",\"file_bytes\":1791,\"body_bytes\":700}]"
carrier_sha256: 46585960c2c399cebee298ffd48c34b0114f0f2daccad2a55ff3f03ad733344b
carrier_bytes: 4159
revision: 1
status: active
---
<!-- vpmodule:atom:begin compare-the-arms-and-read-the-delta -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/approaches/eval-loop.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
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
**comparison** — same question, different approaches.
Build back-to-back, then head-to-head comparison.
<!-- vpmodule:atom:end compare-the-arms-and-read-the-delta -->
<!-- vpmodule:atom:begin stop-the-loop-on-its-stated-conditions -->
---
instruction_id: stop-the-loop-on-its-stated-conditions
title: Stop the loop on its stated conditions
summary: "The loop ends on its stated conditions, and before it ends the run says what the cases do not cover."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
  - experiment-design
conditions_applies_when: A measurement loop over a tool is running.
conditions_does_not_apply_when: The loop was never started.
artifact_contract_output_type: loop-stop
artifact_contract_required_data:
  - the condition that stopped the loop
  - the cases that still fail
  - what the cases do not cover
artifact_contract_verified_by: the stop condition is met and the uncovered ground is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/approaches/eval-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - research
---

# Stop the loop on its stated conditions
Every grader passes three runs: done.
The user says it is good enough: done, and tell them which cases still fail.
Two rounds move nothing: the cases are the problem, not the words. Re-examine them for weak assertions, inputs too tidy to fail, or a rubric grading what the bare model already does.
The with-skill arm loses to the bare model and stays behind: the model has caught up. Say so plainly and propose retiring the skill, not patching it.
Before leaving the loop, say in one line what the cases do not cover and whether any assertion passed for a trivial reason. A passing run on easy cases is not proof; the user decides whether to add harder ones.
<!-- vpmodule:atom:end stop-the-loop-on-its-stated-conditions -->