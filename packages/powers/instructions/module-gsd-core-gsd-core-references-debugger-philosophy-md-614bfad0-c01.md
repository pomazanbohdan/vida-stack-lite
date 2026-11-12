---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-debugger-philosophy-md-614bfad0-c01"
title: "gsd-core: gsd-core/references/debugger-philosophy.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/references/debugger-philosophy.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/debugger-philosophy.md\"}"
atom_ids:
  - ask-the-reporter-about-what-happened-not-what-is-wrong
  - generate-independent-hypotheses-before-investigating-one
  - restart-the-investigation-when-the-model-explains-nothing
  - treat-your-own-code-as-foreign-when-debugging-it
atom_count: 4
atoms: "[{\"atom_id\":\"ask-the-reporter-about-what-happened-not-what-is-wrong\",\"file_sha256\":\"d1b04e212efc74d3287b0b29d84ecd3ebd3eefc44dc62f01b2311f50d7dd6190\",\"content_sha256\":\"4b76a4228c5c6d9badb8c177b169e6542f913ae9907a9aa35fffdee524fe9519\",\"file_bytes\":1486,\"body_bytes\":349},{\"atom_id\":\"generate-independent-hypotheses-before-investigating-one\",\"file_sha256\":\"2cdcd3db848deba1e54e99d5978140bb9fd61100f57b7fbe717349ed1a2c13c6\",\"content_sha256\":\"a60a7093b1ca46f2f5fc5782545e758905095a484e4d6f08f0ace9669af30a22\",\"file_bytes\":1611,\"body_bytes\":454},{\"atom_id\":\"restart-the-investigation-when-the-model-explains-nothing\",\"file_sha256\":\"1ef30f7c0d3efba6bb9ea9181cdd7134b13cbd6cdf1aa08cd1f2a70c5848f4a0\",\"content_sha256\":\"c8e88103f9f8cf2591c85feedc020fa56584c312855c1dba4e1abbad6324186b\",\"file_bytes\":1721,\"body_bytes\":467},{\"atom_id\":\"treat-your-own-code-as-foreign-when-debugging-it\",\"file_sha256\":\"bf144c5fb795c676d795905306b65b9f49ee681434df263c11d36674578e5824\",\"content_sha256\":\"dbdcb4989e544abedfeec82c37502efcc540d9735e7acad787401099ac1bfd8a\",\"file_bytes\":1701,\"body_bytes\":575}]"
carrier_sha256: 22ed31fef740f6469cc779065477668ecb3c85186a4a473bdf0ebe3f668a60ae
carrier_bytes: 7180
revision: 1
status: active
---
<!-- vpmodule:atom:begin ask-the-reporter-about-what-happened-not-what-is-wrong -->
---
instruction_id: ask-the-reporter-about-what-happened-not-what-is-wrong
title: "Ask the reporter about what happened, not what is wrong"
summary: "The reporter is asked what they expected, what happened and what they saw; the cause, the file and the fix are investigated, not asked."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A bug report is received and the details are still missing.
conditions_does_not_apply_when: The cause is already known.
artifact_contract_output_type: reporter-questions
artifact_contract_required_data:
  - what was expected
  - what actually happened
  - the errors that were seen
  - when it started
artifact_contract_verified_by: "no question asks the reporter for a cause, a file or a fix"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/debugger-philosophy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Ask the reporter about what happened, not what is wrong
The user knows:
What they expected to happen
What actually happened
Error messages they saw
When it started / if it ever worked
The user does NOT know (don't ask):
What's causing the bug
Which file has the problem
What the fix should be
Ask about experience. Investigate the cause yourself.
<!-- vpmodule:atom:end ask-the-reporter-about-what-happened-not-what-is-wrong -->
<!-- vpmodule:atom:begin generate-independent-hypotheses-before-investigating-one -->
---
instruction_id: generate-independent-hypotheses-before-investigating-one
title: Generate independent hypotheses before you investigate one
summary: "Several independent hypotheses are generated before the first one is investigated, and disconfirming evidence is sought actively."
capability_tags:
  - debug-root-cause
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A failure is about to be investigated.
conditions_does_not_apply_when: The cause is already confirmed by evidence.
artifact_contract_output_type: hypothesis-set
artifact_contract_required_data:
  - the independent hypotheses
  - the disconfirming evidence sought
  - the hypothesis that survived
artifact_contract_verified_by: more than one independent hypothesis was generated before the investigation started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/debugger-philosophy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Generate independent hypotheses before you investigate one
Actively seek disconfirming evidence. "What would prove me wrong?"
Generate 3+ independent hypotheses before investigating any
Treat each bug as novel until evidence suggests otherwise
Every 30 min: "If I started fresh, is this still the path I'd take?"
Embrace not knowing: "I don't know why this fails" = good (now you can investigate). "It must be X" = dangerous (you've stopped thinking).
<!-- vpmodule:atom:end generate-independent-hypotheses-before-investigating-one -->
<!-- vpmodule:atom:begin restart-the-investigation-when-the-model-explains-nothing -->
---
instruction_id: restart-the-investigation-when-the-model-explains-nothing
title: Restart the investigation when the model explains nothing
summary: "When the investigation stops explaining the behaviour, it is restarted from the facts that are known and the ones that are ruled out."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: "The investigation has produced several fixes that did not work, or cannot explain the behaviour."
conditions_does_not_apply_when: The investigation is still producing evidence.
artifact_contract_output_type: restart-record
artifact_contract_required_data:
  - what is known for certain
  - what was ruled out
  - the new hypotheses
  - the point the investigation restarts from
artifact_contract_verified_by: "the known facts, the ruled-out branches and the new hypotheses are written down before the work resumes"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/debugger-philosophy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Restart the investigation when the model explains nothing
Consider starting over when:
2+ hours with no progress - You're likely tunnel-visioned
3+ "fixes" that didn't work - Your mental model is wrong
You can't explain the current behavior - Don't add changes on top of confusion
The fix works but you don't know why - This isn't fixed, this is luck
Write down what you know for certain
Write down what you've ruled out
List new hypotheses (different from before)
<!-- vpmodule:atom:end restart-the-investigation-when-the-model-explains-nothing -->
<!-- vpmodule:atom:begin treat-your-own-code-as-foreign-when-debugging-it -->
---
instruction_id: treat-your-own-code-as-foreign-when-debugging-it
title: Treat your own code as foreign when you debug it
summary: "Your own code is read as if someone else wrote it: the design decisions are hypotheses and the behaviour of the code is the truth."
capability_tags:
  - debug-root-cause
pattern_tags:
  - adversarial-self-review
conditions_applies_when: The code under investigation was written by the same agent.
conditions_does_not_apply_when: The code was written by someone else.
artifact_contract_output_type: self-audit
artifact_contract_required_data:
  - the design decisions that are questioned
  - the code that was touched
  - the admission that is made
artifact_contract_verified_by: "the implementation decisions are treated as hypotheses, not facts"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/debugger-philosophy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Treat your own code as foreign when you debug it
When debugging code you wrote, you're fighting your own mental model.
Treat your code as foreign - Read it as if someone else wrote it
Question your design decisions - Your implementation decisions are hypotheses, not facts
Admit your mental model might be wrong - The code's behavior is truth; your model is a guess
Prioritize code you touched - If you modified 100 lines and something breaks, those are prime suspects
The hardest admission: "I implemented this wrong." Not "requirements were unclear" - YOU made an error.
<!-- vpmodule:atom:end treat-your-own-code-as-foreign-when-debugging-it -->