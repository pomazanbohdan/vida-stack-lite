---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-user-profiling-md-527a759f-c01"
title: "gsd-core: gsd-core/references/user-profiling.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/references/user-profiling.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/user-profiling.md\"}"
atom_ids:
  - quote-only-the-behavioral-signal-and-attribute-every-quote
  - score-an-underspecified-dimension-as-unscored-not-as-low
  - weight-recent-sessions-over-old-ones-when-they-conflict
atom_count: 3
atoms: "[{\"atom_id\":\"quote-only-the-behavioral-signal-and-attribute-every-quote\",\"file_sha256\":\"d6c043b4fe6e26cc7392d1a555dbe6e72cf7947b08018109e081672656887d42\",\"content_sha256\":\"1a0ecf88e267d3a86cf7dae4e31d336ff5585fcbbb5cd49e29e1a740f8ca7f43\",\"file_bytes\":1592,\"body_bytes\":530},{\"atom_id\":\"score-an-underspecified-dimension-as-unscored-not-as-low\",\"file_sha256\":\"e04ede39bb64bd44f526db94db78586960e201f00338a47828fd239688d8530b\",\"content_sha256\":\"b42dd1dadddfd67cdabf8293c555dcc47d6c8d727d5dbcfe890cfd4d37ee886b\",\"file_bytes\":1385,\"body_bytes\":338},{\"atom_id\":\"weight-recent-sessions-over-old-ones-when-they-conflict\",\"file_sha256\":\"335c40f9f2ca602825dc88477a2f7351f5f2a8ac672d03f8f9eefe13c95053be\",\"content_sha256\":\"a2fff7aa92c64ef87cacb1cf769d9e78b68a920764266cf29ede21ac4ac90e6d\",\"file_bytes\":1444,\"body_bytes\":366}]"
carrier_sha256: 10408b95d234eb236b4b2096103eec0e9971f17430169336c90c016f8e9c7e4b
carrier_bytes: 4932
revision: 1
status: active
---
<!-- vpmodule:atom:begin quote-only-the-behavioral-signal-and-attribute-every-quote -->
---
instruction_id: quote-only-the-behavioral-signal-and-attribute-every-quote
title: Quote only the behavioral signal and attribute every quote
summary: A quote is trimmed to the part that shows the pattern and always carries the project it came from.
capability_tags:
  - redact-sensitive-data
pattern_tags:
  - evidence-redaction
conditions_applies_when: A quote from a source is put into an analysis.
conditions_does_not_apply_when: The text is not a quotation.
artifact_contract_output_type: quoted-evidence
artifact_contract_required_data:
  - the quote
  - the signal it demonstrates
  - the project it came from
artifact_contract_verified_by: every quote is trimmed to about a hundred characters and names its project
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/user-profiling.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Quote only the behavioral signal and attribute every quote
Trim quotes to the behavioral signal -- the part that demonstrates the pattern
Target approximately 100 characters per quote
Preserve the meaningful fragment, not the full message
If the signal is in the middle of a long message, use "..." to indicate trimming
Never include the full 500-character message when 50 characters capture the signal
Every evidence quote must include the project name
Project attribution enables verification and shows cross-project patterns
<!-- vpmodule:atom:end quote-only-the-behavioral-signal-and-attribute-every-quote -->
<!-- vpmodule:atom:begin score-an-underspecified-dimension-as-unscored-not-as-low -->
---
instruction_id: score-an-underspecified-dimension-as-unscored-not-as-low
title: "Score an underspecified dimension as unscored, not as low"
summary: "A dimension with too little data is scored unscored with empty evidence, never as a weak rating."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A dimension of an assessment has too little data to rate.
conditions_does_not_apply_when: The dimension has enough data to rate.
artifact_contract_output_type: dimension-score
artifact_contract_required_data:
  - the confidence
  - the summary
  - the evidence count
artifact_contract_verified_by: the dimension is unscored with an empty evidence list
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/user-profiling.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Score an underspecified dimension as unscored, not as low
Set confidence to `UNSCORED`
Set summary to: "Insufficient data -- no clear signals detected for this dimension."
Set evidence_quotes to empty array `[]`
Set evidence_count to `0`
All dimensions scored LOW or UNSCORED. Recommend questionnaire fallback as primary profile source
<!-- vpmodule:atom:end score-an-underspecified-dimension-as-unscored-not-as-low -->
<!-- vpmodule:atom:begin weight-recent-sessions-over-old-ones-when-they-conflict -->
---
instruction_id: weight-recent-sessions-over-old-ones-when-they-conflict
title: Weight recent sessions over old ones when they conflict
summary: "When an old pattern and a recent one disagree, the recent one wins the rating and the change is noted."
capability_tags:
  - redact-sensitive-data
pattern_tags:
  - claim-freshness-window
conditions_applies_when: Evidence from different times points in different directions.
conditions_does_not_apply_when: All evidence comes from the same period.
artifact_contract_output_type: recency-weighting
artifact_contract_required_data:
  - the window
  - the weight
  - the evolution that was noted
artifact_contract_verified_by: the recent pattern decided the rating and the change is recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/user-profiling.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Weight recent sessions over old ones when they conflict
Recent sessions (last 30 days) should be weighted approximately 3x compared to older sessions when analyzing patterns.
When patterns conflict between recent and older sessions, the recent pattern takes precedence for the rating, but note the evolution: "recently shifted from terse-direct to conversational"
<!-- vpmodule:atom:end weight-recent-sessions-over-old-ones-when-they-conflict -->