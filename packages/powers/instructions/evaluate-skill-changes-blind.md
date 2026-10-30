---
instruction_id: evaluate-skill-changes-blind
title: Evaluate skill changes blind
summary: "Compare instruction variants on the same organic prompt with a blinded judge and one rubric, and read the chain from transcripts rather than self-report."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: "You change an instruction, skill, or prompt and want to know whether the change actually helps."
conditions_does_not_apply_when: The change is purely editorial and does not claim to affect behavior.
artifact_contract_output_type: blind-comparison
artifact_contract_required_data:
  - variant
  - rubric
  - prompt
  - results
  - verdict
artifact_contract_verified_by: the same prompt run across candidates and judged blind on one rubric
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/eval.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=evals/README.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Evaluate skill changes blind
You own the experiment design: plan, blind, run, synthesize.
Frame what variant is under test and what behavior counts as success.
Write the rubric of three to six concrete criteria for the judge only.
Hold the rubric back from candidates.
Set up sanitized environments with one candidate working directory per variant.
Plant any context an organic task would have: a project skeleton, the instructions the candidate would naturally read.
Author one organic prompt: what a user would type, with no leakage of what is being measured.
No eval, test, judge, experiment, rubric, score, compare, benchmark, candidate, or arena in any directory, file, or prompt the candidate sees.
The candidate prompt states the goal, not the meta.
Do not ask the candidate to list which skills, principles, or files they applied.
Ask for design notes generally and grade chain-following from code shape, not self-report.
Sanitize directory and slug names; use project-shaped names a user might pick.
Do not tell the candidate other candidates exist.
Spawn candidates on different models, each in its own sanitized directory, with the same prompt.
Spawn one blinded judge on a different model family.
The judge can know it is judging but sees outputs by sanitized label only, never by model name.
When comparing two variants, one judge scores both sets in a single pass on one scale, blind to which set each came from.
Verify the chain from transcripts, not self-report: look at which files each candidate actually opened.
Grade chain-following from the files actually read plus the shape of the code, never from the candidate's own claims.
Read every candidate output yourself end to end and compare it to the judge's verdict.
Disagreement means a model is biased or the rubric is ambiguous.
Synthesize and recommend whether to promote the variant.
Expectations are verifiable statements a grader checks against the relevant artifact — behaviors, not phrasings.
a `tool_used: Skill` grader only says whether the skill fired; in a two-arm run it is excluded from the score, so pair it with a grader on the reply itself.
