---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-advisor-researcher-compact-md-569b62b3-c01"
title: "gsd-core: agents/gsd-advisor-researcher.compact.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:agents/gsd-advisor-researcher.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-advisor-researcher.compact.md\"}"
atom_ids:
  - give-a-conditional-recommendation-not-a-single-winner
  - name-the-only-viable-option-instead-of-padding-the-list
  - state-complexity-as-impact-surface-and-risk
atom_count: 3
atoms: "[{\"atom_id\":\"give-a-conditional-recommendation-not-a-single-winner\",\"file_sha256\":\"df239768386e31e1ac12b1d7934de71d471eff34f9ea75788a3c3dee76519af9\",\"content_sha256\":\"d0166199fb928871f44b500028f3bfc19b3cfafea3f85688f62009f4c328a595\",\"file_bytes\":1510,\"body_bytes\":241},{\"atom_id\":\"name-the-only-viable-option-instead-of-padding-the-list\",\"file_sha256\":\"3643d6edabbbc04c4d0e1ef0a90857798666258c9e69f25f647b92687b5dcc46\",\"content_sha256\":\"200fa54866fd189018448568b52d1a22f5f7111e161dabfbe3c771401a815caf\",\"file_bytes\":1503,\"body_bytes\":233},{\"atom_id\":\"state-complexity-as-impact-surface-and-risk\",\"file_sha256\":\"a14ebc45b2af0909d600eb327d08d131f1f1c6c8f6b1e59c58f4a9ee2f1c828b\",\"content_sha256\":\"7932331deff02399368937c00278eabe69f49e4faadde91263144ed2f918bb82\",\"file_bytes\":1431,\"body_bytes\":212}]"
carrier_sha256: ee6dba952ecec14587fa77ba7625aefa953120557a5c820416f0a1046a0d7871
carrier_bytes: 4919
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-a-conditional-recommendation-not-a-single-winner -->
---
instruction_id: give-a-conditional-recommendation-not-a-single-winner
title: "Give a conditional recommendation, not a single winner"
summary: Each option carries the condition under which it is the right one; no option is declared the universal winner.
capability_tags:
  - assess-change-impact
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Several viable options are presented and a recommendation is written for each of them.
conditions_does_not_apply_when: Exactly one option is viable and the others are rejected on evidence.
artifact_contract_output_type: option-comparison
artifact_contract_required_data:
  - the options
  - the condition attached to each option
artifact_contract_verified_by: every recommendation names the condition under which it applies
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-advisor-researcher.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-advisor-researcher.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - business
---

# Give a conditional recommendation, not a single winner
Recommendation = conditional ("Rec if mobile-first", "Rec if SEO matters"). Not single-winner ranking.
Do NOT rank options or declare a single winner (use conditional recommendations)
<!-- vpmodule:atom:end give-a-conditional-recommendation-not-a-single-winner -->
<!-- vpmodule:atom:begin name-the-only-viable-option-instead-of-padding-the-list -->
---
instruction_id: name-the-only-viable-option-instead-of-padding-the-list
title: Name the only viable option instead of padding the list
summary: "When one option survives, it is named on its own; no alternative is invented to fill the list."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: The set of viable options is written out for a decision.
conditions_does_not_apply_when: Several genuinely viable options exist and each is named.
artifact_contract_output_type: option-comparison
artifact_contract_required_data:
  - the viable options
artifact_contract_verified_by: no option appears that the evidence did not support
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-advisor-researcher.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-advisor-researcher.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body governs how to present options for an unspecified decision and provides no supported subject domain for classifying the decision itself.
---

# Name the only viable option instead of padding the list
If only 1 viable option exists, state it directly rather than inventing filler alternatives.
Do NOT invent filler options to pad the table -- only genuinely viable approaches
<!-- vpmodule:atom:end name-the-only-viable-option-instead-of-padding-the-list -->
<!-- vpmodule:atom:begin state-complexity-as-impact-surface-and-risk -->
---
instruction_id: state-complexity-as-impact-surface-and-risk
title: State complexity as impact surface and risk
summary: "The cost of an option is written as the surface it touches plus the risk it carries, never as a duration."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: An option or approach is compared and its cost has to be written down.
conditions_does_not_apply_when: "A duration was measured and is reported as a measurement, not as a prediction."
artifact_contract_output_type: option-comparison
artifact_contract_required_data:
  - the impact surface
  - the risk it carries
artifact_contract_verified_by: the comparison states impact surface and risk and no time estimate
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-advisor-researcher.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-advisor-researcher.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# State complexity as impact surface and risk
Complexity = impact surface + risk (e.g., "3 files, new dep -- Risk: memory, scroll state"). NEVER time estimates.
Do NOT use time estimates in the Complexity column
<!-- vpmodule:atom:end state-complexity-as-impact-surface-and-risk -->