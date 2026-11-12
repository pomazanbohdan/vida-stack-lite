---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-evals-readme-md-7415b9ee-c01"
title: "addy-skills: evals/README.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:evals/README.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"evals/README.md\"}"
atom_ids:
  - evaluate-skill-changes-blind
  - every-skill-ships-with-its-own-case-file
  - fix-the-description-not-the-eval
  - keep-sibling-descriptions-from-colliding
  - pair-each-negative-trigger-with-the-sibling-that-owns-it
  - pin-the-model-and-the-tool-version-when-you-report-numbers
  - state-that-the-skill-applies-even-when-the-work-is-pasted-inline
  - watch-the-rank-1-rate-and-never-lower-the-floor
atom_count: 8
atoms: "[{\"atom_id\":\"evaluate-skill-changes-blind\",\"file_sha256\":\"6656ee7f322dbeac699321eed7f18c6705fc9210633aebea93a8ecda8f1dddbd\",\"content_sha256\":\"0b4c51834d2f8abbbc6d6864f53dab7d4f07c927ae3e640a06ae841da105e613\",\"file_bytes\":3379,\"body_bytes\":2132},{\"atom_id\":\"every-skill-ships-with-its-own-case-file\",\"file_sha256\":\"f55d7f4650baaa00545c8089dcd9b666d38c1a2feeacf86d6d184c9487f8d5e0\",\"content_sha256\":\"df881ed13e8e9e65e50e97655e1f0c09d11596000d42fa7ac62df833579f5800\",\"file_bytes\":1716,\"body_bytes\":575},{\"atom_id\":\"fix-the-description-not-the-eval\",\"file_sha256\":\"f47871e81cf55decb785d3dee9b9aa7c675de4671af202266ff5747ef1e24224\",\"content_sha256\":\"e2fbb12d0719f386828207c96f9367bfc345692ac6d9af4806d0f1c20e3c04a8\",\"file_bytes\":2053,\"body_bytes\":743},{\"atom_id\":\"keep-sibling-descriptions-from-colliding\",\"file_sha256\":\"c75bfc703514c0683b793ed57269dc1be9a2888a4fcdea0579ae37588c0a47c8\",\"content_sha256\":\"9fead424730de7615a13308b6b1ccbd085ef592f718b3214dc8ac011e8476cc2\",\"file_bytes\":1488,\"body_bytes\":436},{\"atom_id\":\"pair-each-negative-trigger-with-the-sibling-that-owns-it\",\"file_sha256\":\"4ab78b575dc411e3b55b53be9077b341b8d3d22678dac252e999100b521aad17\",\"content_sha256\":\"954de2b1fff4ab28b34b52107691edf845ea5a60e33fe3980e2dcac391e66ddd\",\"file_bytes\":1560,\"body_bytes\":381},{\"atom_id\":\"pin-the-model-and-the-tool-version-when-you-report-numbers\",\"file_sha256\":\"d88e376f26e1b0efd90e8fb3bb61e49951cbf0205dfae9fdfad6fc1ebfdadf75\",\"content_sha256\":\"b0f7c6bd2d61ff0e7c0769e8cc3ce84e5e65313c93c65912aa7f314511146519\",\"file_bytes\":2437,\"body_bytes\":1148},{\"atom_id\":\"state-that-the-skill-applies-even-when-the-work-is-pasted-inline\",\"file_sha256\":\"6bbab0c3c794bd73a6eab368c6d971fd866d8c7cf83cc02ef542d4a68326fb31\",\"content_sha256\":\"54fb27b41d2183ef934eec78594550bae7b5f3b45bd218137cf87458ae684883\",\"file_bytes\":2330,\"body_bytes\":1090},{\"atom_id\":\"watch-the-rank-1-rate-and-never-lower-the-floor\",\"file_sha256\":\"166dcb12d21e1eee14d36686e548a7d3ca590404e5aa73893d0e32f99d0d34b4\",\"content_sha256\":\"232c90a4f0cc17c9161a7d09d9241c13d112b546e40c94ffbade1f354e4363fb\",\"file_bytes\":1629,\"body_bytes\":483}]"
carrier_sha256: d673faef20635fd23da757350f27294a6701a784b26f2ba25f25edb487575c27
carrier_bytes: 17785
revision: 1
status: active
---
<!-- vpmodule:atom:begin evaluate-skill-changes-blind -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=evals/README.md
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
<!-- vpmodule:atom:end evaluate-skill-changes-blind -->
<!-- vpmodule:atom:begin every-skill-ships-with-its-own-case-file -->
---
instruction_id: every-skill-ships-with-its-own-case-file
title: Every skill ships with its own case file
summary: "A new skill arrives with its case file: at least three positive triggers, two negative triggers and one behavioral eval, and an execution eval that is backed by a fixture."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A skill is added to the catalogue.
conditions_does_not_apply_when: The skill is a one-off hint that is not kept.
artifact_contract_output_type: eval-case-file
artifact_contract_required_data:
  - the positive triggers
  - the negative triggers
  - the behavioral eval
  - the fixture
artifact_contract_verified_by: "the case file holds at least three positive triggers, two negative triggers and one behavioral eval"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=evals/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Every skill ships with its own case file
Every skill ships with an eval file.
When you add a skill, add its case file
with at least 3 positive triggers, 2 negative triggers, and 1 behavioral eval.
Execution evals must be backed by
a fixture directory;
use `kind: "dialogue"` only when the skill's deliverable is genuinely the conversation itself.
Claiming `dialogue` is a human-reviewed exemption, not a general escape hatch for execution skills.
Missing case files, incomplete case counts, unknown kinds, invalid fixture paths, and absent required fixtures are CI errors.
<!-- vpmodule:atom:end every-skill-ships-with-its-own-case-file -->
<!-- vpmodule:atom:begin fix-the-description-not-the-eval -->
---
instruction_id: fix-the-description-not-the-eval
title: "Fix the description, not the eval"
summary: "A routing check is a lexical approximation: it catches a description that misses the vocabulary users say and a description so broad it outranks the right skill, and both are fixed in the description."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A trigger check fails to route a realistic prompt to its skill.
conditions_does_not_apply_when: The check fails for a reason the description cannot cause.
artifact_contract_output_type: description-fix
artifact_contract_required_data:
  - the prompt that failed to route
  - the vocabulary the description lacked
  - the changed description
artifact_contract_verified_by: the changed description makes the realistic prompt rank the skill first
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=evals/README.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/ship.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Fix the description, not the eval
The routing check
is a **lexical approximation** of routing (stemmed TF-IDF over descriptions). It cannot judge semantics — that's the behavioral tier's job — but it catches the two failure modes that dominate real trigger bugs: a description missing the vocabulary users say (false negative), and an over-broad description that outranks the right skill (false positive).
A routing-check failure
usually means *fix the description*, not the eval.
If a realistic prompt can't rank because the description lacks its vocabulary, that is a real finding — improve the description.

When the description is revised from failures, change its contexts and anchors, never paste a failed query's words into it.
<!-- vpmodule:atom:end fix-the-description-not-the-eval -->
<!-- vpmodule:atom:begin keep-sibling-descriptions-from-colliding -->
---
instruction_id: keep-sibling-descriptions-from-colliding
title: Keep sibling descriptions from colliding
summary: "Two skills that do the same kind of work must not describe it the same way: the pairwise description similarity is checked and a near-collision is an error."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: Two skills in the same catalogue do the same kind of work.
conditions_does_not_apply_when: The catalogue holds one skill.
artifact_contract_output_type: collision-check
artifact_contract_required_data:
  - the pair of descriptions compared
  - the similarity
  - the verdict
artifact_contract_verified_by: no two descriptions near-collide
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=evals/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep sibling descriptions from colliding
What neither provides is a **deterministic, CI-safe** check for a multi-skill *catalog* — does each skill's description carry the vocabulary users actually say, and do two skills' descriptions collide?
The collision check errors at ≥75% pairwise description similarity and warns at ≥50%.
Positive prompts rank their skill top-k; negative prompts don't; no two descriptions near-collide.
<!-- vpmodule:atom:end keep-sibling-descriptions-from-colliding -->
<!-- vpmodule:atom:begin pair-each-negative-trigger-with-the-sibling-that-owns-it -->
---
instruction_id: pair-each-negative-trigger-with-the-sibling-that-owns-it
title: Pair each negative trigger with the sibling that owns it
summary: "A negative prompt names the skill that should own it, and the check asserts that owner outranks the skill under test, so the negative cannot pass vacuously."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "A skill's trigger test has negative prompts that must not route to it."
conditions_does_not_apply_when: The skill has no sibling that could own a prompt.
artifact_contract_output_type: trigger-case
artifact_contract_required_data:
  - the negative prompt
  - the sibling skill that owns it
  - the assertion that the owner outranks
artifact_contract_verified_by: the owner skill outranks the skill under test for the negative prompt
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=evals/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Pair each negative trigger with the sibling that owns it
`negative` prompts belong to a *different* skill; this skill must not rank first for them.
Declare that skill in `owner` where you can: the runner then asserts the owner **outranks** this skill, turning the negative into a real pairwise routing test instead of one that can pass vacuously when the prompt matches nothing.
<!-- vpmodule:atom:end pair-each-negative-trigger-with-the-sibling-that-owns-it -->
<!-- vpmodule:atom:begin pin-the-model-and-the-tool-version-when-you-report-numbers -->
---
instruction_id: pin-the-model-and-the-tool-version-when-you-report-numbers
title: Pin the model and the tool version when you report numbers
summary: "Skill invocation is stochastic, so the report is read instead of the exit code, and the model and the tool version are recorded with every number."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: "A measurement of the agent's behaviour is about to be reported."
conditions_does_not_apply_when: The result is a deterministic check with no model in the loop.
artifact_contract_output_type: run-record
artifact_contract_required_data:
  - the pinned model
  - the tool version
  - the turn budget
  - the counts read from the report
artifact_contract_verified_by: the reported numbers name the model and the tool version they came from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=evals/README.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/cross-ai-peer-review.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Pin the model and the tool version when you report numbers
Two practical rules from the same day: pin the model and record the tool version whenever you report numbers, because the tool updates itself and the default model changed twice between morning and evening;
and give a case a turn budget of 10 or more,
since the model may reach a skill through its slash command
which costs two turns.
Skill invocation is stochastic: the review skill fired in 5 of 7 runs on the phrasing the case uses, and
a test-first skill
fired in 2 of 7 runs on the test-first prompt, so read `Δ` and the report rather than the exit code, or pass the threshold the CI example in the docs does.
In one run the review skill did not fire and the reply still used its severity taxonomy as headings, which no baseline run did in nine; the loaded skill descriptions may shape the reply even without an invocation.
Phrasing matters, and the description is the lever.
The fix records the model *and its provenance*.
Provenance is what makes the value trustworthy
A recorded `unknown` is a real answer — a wrong model name attributed to a review would be worse than none.
<!-- vpmodule:atom:end pin-the-model-and-the-tool-version-when-you-report-numbers -->
<!-- vpmodule:atom:begin state-that-the-skill-applies-even-when-the-work-is-pasted-inline -->
---
instruction_id: state-that-the-skill-applies-even-when-the-work-is-pasted-inline
title: State that the skill applies even when the work is pasted inline
summary: "The description has to say the skill applies even when the request is pasted inline, because that is the case the model treats as something it can do by itself."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "A skill's description is written and the model bypasses it on a request it could do by itself."
conditions_does_not_apply_when: The skill fires reliably on every phrasing.
artifact_contract_output_type: description-clause
artifact_contract_required_data:
  - the clause that states the skill applies
  - the case it covers
artifact_contract_verified_by: the skill fires on the pasted case that the model would otherwise do by itself
compatibility_excludes: []
compatibility_requires:
  - optimize-guidance-triggers
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=evals/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - research
---

# State that the skill applies even when the work is pasted inline
Describing what the skill adds did not help, and neither did naming diffs and pull requests on their own; what made the difference was saying that the skill applies even when the diff is pasted inline, which is the case the model was treating as "I can just do this myself".
The same clause works for simplify, write a commit message or changelog from a pasted diff, and split a pasted change into commits: name those requests and say the skill applies even when the work is pasted inline.
Here the tail alone was not enough; what worked was naming the three requests and saying the skill applies even when the code is pasted inline and the request does not mention tests. That clause took the four prompts from 6 of 24 to 19 of 24 (add tests 6 of 6, fix a bug 6 of 6, change behavior 1 of 6), and left eight adjacent must-not-fire prompts at 0 of 24 under every variant tried.
The one-line behavior change is the floor: the trace shows a single-turn edit with no tool call, the model does not consider a procedure for it.
<!-- vpmodule:atom:end state-that-the-skill-applies-even-when-the-work-is-pasted-inline -->
<!-- vpmodule:atom:begin watch-the-rank-1-rate-and-never-lower-the-floor -->
---
instruction_id: watch-the-rank-1-rate-and-never-lower-the-floor
title: Watch the rank-1 rate and never lower the floor
summary: "The rate that matters is the share of positive prompts that rank their skill first; the floor keeps headroom, rises as routing improves and is never lowered to make a regression pass."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A trigger check runs over a catalogue of skills and reports a rank-1 rate.
conditions_does_not_apply_when: The check reports only pass or fail with no rate.
artifact_contract_output_type: routing-metric
artifact_contract_required_data:
  - the rank-1 rate
  - the floor in force
  - the direction of the change
artifact_contract_verified_by: the floor was never lowered to make a regression pass
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=evals/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Watch the rank-1 rate and never lower the floor
The routing run
prints a **trigger rank-1 rate** (share of positive prompts that rank their skill first, not merely top-k).
CI runs with
the routing floor at 95, leaving useful headroom below the checked-in 100% baseline so an unrelated description edit does not immediately turn CI red.
Raise the floor as routing improves; never lower it to make a regression pass.
Falling numbers mean descriptions are drifting toward each other.
<!-- vpmodule:atom:end watch-the-rank-1-rate-and-never-lower-the-floor -->