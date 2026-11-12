---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-review-references-editorial-common-md-8f41f3ca-c01"
title: "bmad-method: skills/bmad-review/references/editorial-common.md module"
summary: "Carrier for 6 atomic instructions from bmad-method:skills/bmad-review/references/editorial-common.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-review/references/editorial-common.md\"}"
atom_ids:
  - calibrate-the-editorial-findings-to-the-reader-type
  - ground-the-length-estimate-in-word-counts
  - keep-the-editorial-content-sacrosanct
  - let-the-style-guide-in-effect-win
  - open-with-the-one-sentence-read-of-purpose-and-audience
  - render-the-editorial-findings-as-a-table
atom_count: 6
atoms: "[{\"atom_id\":\"calibrate-the-editorial-findings-to-the-reader-type\",\"file_sha256\":\"8bcd8dadfcf7db0d586f0c30af5b6b3e7f79d31e5d994e1e9ebcaa79f926c269\",\"content_sha256\":\"e5c568ec14b02b77ebb6cbb59a1894cdb5826257af06fc873153366af4c8a4cc\",\"file_bytes\":3070,\"body_bytes\":1818},{\"atom_id\":\"ground-the-length-estimate-in-word-counts\",\"file_sha256\":\"20bc0d16f25f59754ae34997d02284a80aa8d11c8aac3fc1326cc190c46c1e45\",\"content_sha256\":\"ce088c27b6af826c00a74bd878c76be3f0e08b888561aeb0e89d8bac7f98e068\",\"file_bytes\":1613,\"body_bytes\":315},{\"atom_id\":\"keep-the-editorial-content-sacrosanct\",\"file_sha256\":\"d56122992b6c0924050ea2fdefc9a526d4ff3f99bdd82532a811991cc4ae64bf\",\"content_sha256\":\"4e5984ad9fc416e5bf1ef4f0c46137573b5d8d646c6441a77fb37e43cf6f313d\",\"file_bytes\":1409,\"body_bytes\":304},{\"atom_id\":\"let-the-style-guide-in-effect-win\",\"file_sha256\":\"aa218d7a8e171d53ea4622c093ebf55c3b96a2bdfda126c876278d9e9076cf97\",\"content_sha256\":\"8bb93d69a27d01959ad466d826f2ca32228289a796a8926e3b9226821b4c098c\",\"file_bytes\":1381,\"body_bytes\":294},{\"atom_id\":\"open-with-the-one-sentence-read-of-purpose-and-audience\",\"file_sha256\":\"3180e0e70b51a279ec7e7e2bf34917d856b80ca9e1a93ef30f32bf29eea98a8d\",\"content_sha256\":\"36fcdf13a918b3b8e56d6637ebbae8e28b28a8c0166c40c07c3125535983c763\",\"file_bytes\":1511,\"body_bytes\":331},{\"atom_id\":\"render-the-editorial-findings-as-a-table\",\"file_sha256\":\"749db6cc6a93f978c914888e9b2344235ecf21b8e235b2b06c94af55b6bc6249\",\"content_sha256\":\"461b8ed7fb4871a8d1efb3e0f82084a74eed9c860882bb2d21061f69698b0f01\",\"file_bytes\":2424,\"body_bytes\":1142}]"
carrier_sha256: 476f9de384a5d91a168f45effab031d91e52fab8c4bbc5b05dc3ce21cfc87c8b
carrier_bytes: 12269
revision: 1
status: active
---
<!-- vpmodule:atom:begin calibrate-the-editorial-findings-to-the-reader-type -->
---
instruction_id: calibrate-the-editorial-findings-to-the-reader-type
title: Calibrate the editorial findings to the reader type
summary: "Every editorial finding is calibrated to the reader it serves: a human reader gets flow, warmth and reinforcement preserved; a model reader gets precision, explicit terms and no hedging."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: An editorial pass produces findings for a document with a known or inferable reader.
conditions_does_not_apply_when: The reader is already fixed and the findings were calibrated to it.
artifact_contract_output_type: reader-calibrated-findings
artifact_contract_required_data:
  - the reader type
  - the findings calibrated to it
artifact_contract_verified_by: "every finding matches the reader type, and no element that serves that reader is cut without a flag"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/editorial-common.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Calibrate the editorial findings to the reader type
Calibrate every finding to the reader type — stated in the request,
else the configured one.
**humans** (default) — optimize for clarity, flow, and natural progression. These elements serve comprehension and engagement; preserve them unless clearly wasteful, and flag any recommendation that would cut one:
- Visual aids: diagrams, images, and flowcharts anchor understanding
- Expectation-setting: "What You'll Learn" helps readers confirm they're in the right place
- Reader's journey: organize content as a linear progression, not a database
- Mental models: overview before details prevents cognitive overload
- Warmth: encouraging tone reduces anxiety for new users
- Whitespace: admonitions and callouts provide visual breathing room
- Summaries: recaps help retention; they're reinforcement, not redundancy
- Examples: concrete illustrations make abstract concepts accessible
- Engagement: flow techniques (transitions, variety) are functional, not fluff — they maintain attention
**llm** — optimize for precision and unambiguity. An LLM-targeted document may run longer where explicitness pays and shorter where warmth was cut:
- Dependency-first: define concepts before usage to minimize hallucination risk
- Cut emotional language, encouragement, and orientation sections
- Reference well-known standards ("conventional commits", "REST APIs") instead of re-teaching them; be explicit where a concept is not well-known — and either way, ground the expectation with an example
- Consistent terminology: same word for same concept throughout
- No hedging ("might", "could", "generally") — direct statements
- Prefer structured formats (tables, lists, YAML) over prose
- Unambiguous references: no unclear antecedents ("it", "this", "the above")
<!-- vpmodule:atom:end calibrate-the-editorial-findings-to-the-reader-type -->
<!-- vpmodule:atom:begin ground-the-length-estimate-in-word-counts -->
---
instruction_id: ground-the-length-estimate-in-word-counts
title: Ground the length estimate in word counts
summary: "Every word-impact estimate and the reduction summary come from measured counts; when the count cannot be measured, the numbers are marked as estimates."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: An editorial pass states how much a cut would save.
conditions_does_not_apply_when: The pass states no word impact at all.
artifact_contract_output_type: word-impact
artifact_contract_required_data:
  - the measured counts
  - the estimated reduction
  - whether the numbers are measured or estimated
artifact_contract_verified_by: "every stated word impact traces to a measured count, or is marked as an estimate"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/editorial-common.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body governs editorial word-count estimates but provides no defensible substantive domain within the six supported values; assigning one would require adding project context.
---

# Ground the length estimate in word counts
When the content is a file, get exact word counts — document total and per heading section —
Ground every word-impact estimate and the reduction summary in those numbers.
If the content was pasted or the script cannot run, estimate and mark the numbers as estimates.
<!-- vpmodule:atom:end ground-the-length-estimate-in-word-counts -->
<!-- vpmodule:atom:begin keep-the-editorial-content-sacrosanct -->
---
instruction_id: keep-the-editorial-content-sacrosanct
title: Keep the editorial content sacrosanct
summary: "An editorial review judges how a document is organized and expressed, never what it says, and it proposes the fixes instead of making them."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A document is reviewed by an editorial pass.
conditions_does_not_apply_when: The review judges whether the document is technically correct.
artifact_contract_output_type: editorial-review
artifact_contract_required_data:
  - the suggested fixes
  - the idea that was not challenged
artifact_contract_verified_by: no finding challenges an idea and every fix is a suggestion the author can reject
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/editorial-common.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Keep the editorial content sacrosanct
Review a document as a clinical editor and return suggested fixes the author can accept or reject row by row.
**Content is sacrosanct.** Never challenge ideas — only how they're organized and expressed. Propose, don't execute: the author decides what to accept.
<!-- vpmodule:atom:end keep-the-editorial-content-sacrosanct -->
<!-- vpmodule:atom:begin let-the-style-guide-in-effect-win -->
---
instruction_id: let-the-style-guide-in-effect-win
title: Let the style guide in effect win
summary: "A style guide named in the request beats the configured one, and the guide in effect beats every generic principle of the editorial pass."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: An editorial pass runs and a style guide is in effect.
conditions_does_not_apply_when: No style guide applies to the document.
artifact_contract_output_type: style-guide-precedence
artifact_contract_required_data:
  - the style guide in effect
  - where it came from
artifact_contract_verified_by: "no finding contradicts the style guide in effect, and the guide in effect is named"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/editorial-common.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Let the style guide in effect win
A style guide stated in the request wins over the configured one for that run.
Where the style guide in effect conflicts with a generic principle here — including the reader calibration — the style guide wins.
Nothing overrides content being sacrosanct.
<!-- vpmodule:atom:end let-the-style-guide-in-effect-win -->
<!-- vpmodule:atom:begin open-with-the-one-sentence-read-of-purpose-and-audience -->
---
instruction_id: open-with-the-one-sentence-read-of-purpose-and-audience
title: Open with the one-sentence read of purpose and audience
summary: "The output opens with one sentence naming who the document is for and what it is for, so the author can correct a wrong premise before acting on the findings."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: An editorial pass starts and the purpose or the audience is not given.
conditions_does_not_apply_when: The request states the purpose and the audience outright.
artifact_contract_output_type: purpose-read
artifact_contract_required_data:
  - the audience
  - the goal
  - where the read came from
artifact_contract_verified_by: the output opens with the one-sentence read and it names the audience and the goal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/editorial-common.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Open with the one-sentence read of purpose and audience
Infer purpose and audience from the content and standing context when not provided, and open the output with your one-sentence read — "this document exists to help [audience] accomplish [goal]" — so the author can correct a wrong premise before acting on the findings.
<!-- vpmodule:atom:end open-with-the-one-sentence-read-of-purpose-and-audience -->
<!-- vpmodule:atom:begin render-the-editorial-findings-as-a-table -->
---
instruction_id: render-the-editorial-findings-as-a-table
title: Render the editorial findings as a table
summary: "The editorial findings are one table of pass, original text, revised text and changes, ordered by comprehension impact, with the rest rolled into one closing line."
capability_tags:
  - define-output-format
pattern_tags:
  - technical-writing
  - output-formatting
conditions_applies_when: The editorial passes are written up.
conditions_does_not_apply_when: No pass found anything; then the result is stated plainly.
artifact_contract_output_type: editorial-findings-table
artifact_contract_required_data:
  - the table of rows
  - the purpose and audience read
  - the chosen structure model
  - the closing summary
  - the number of fixes left out
artifact_contract_verified_by: "the table carries the four columns, the rows are ordered by impact, and the summary states the reduction and the length target"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/editorial-common.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Render the editorial findings as a table
The editorial lenses render as a findings table rather than the canonical JSON fields. One findings table serves both passes:
| Pass | Original Text | Revised Text | Changes |
Structure rows name the section or passage in **Original Text** and carry the tagged disposition (with move target or condensed rewrite) in **Revised Text**; prose rows quote the exact text and its revision.
Order rows by comprehension impact; when a long document would produce more rows than an author can realistically act on, present the highest-impact rows and roll the rest into one closing line — "N further minor fixes; ask to expand."
Above the table, give the purpose/audience read plus — when the structure pass ran — the chosen structure model.
When the structure pass ran, close with a summary: total recommendations, estimated reduction (words and % of original, computed from the word-metrics counts) if all are accepted, whether a provided length target is met, and any comprehension trade-offs (cuts that sacrifice reader engagement for brevity).
A pass that finds nothing is a valid result; say so.
<!-- vpmodule:atom:end render-the-editorial-findings-as-a-table -->