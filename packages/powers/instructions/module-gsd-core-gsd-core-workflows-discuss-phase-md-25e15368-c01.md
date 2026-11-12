---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-discuss-phase-md-25e15368-c01"
title: "gsd-core: gsd-core/workflows/discuss-phase.md module"
summary: "Carrier for 7 atomic instructions from gsd-core:gsd-core/workflows/discuss-phase.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/discuss-phase.md\"}"
atom_ids:
  - answer-the-three-questions-before-you-pass-a-blocking-anti-pattern
  - do-not-re-ask-what-the-spec-already-locks
  - follow-up-on-a-freeform-answer-in-plain-text
  - name-the-gray-areas-specifically
  - never-proceed-on-an-empty-answer
  - record-every-referenced-document-with-its-full-path
  - say-when-the-phase-needs-no-discussion
atom_count: 7
atoms: "[{\"atom_id\":\"answer-the-three-questions-before-you-pass-a-blocking-anti-pattern\",\"file_sha256\":\"cb4f179d1924996ede025becfae8ae8a29271792c6bd8abb2115990f46532f59\",\"content_sha256\":\"2c334bc6b4113e859e280ba270ec6f2e85a3dd5d2d62119e4655f12619fafbe2\",\"file_bytes\":1777,\"body_bytes\":555},{\"atom_id\":\"do-not-re-ask-what-the-spec-already-locks\",\"file_sha256\":\"d05a765e05c13dc58a2acd446cbec021d8d542e6e1773233acc737655f8ad326\",\"content_sha256\":\"8f46a41282ee0dc3446ad1a863e23c176958d8e4f220e16e8b0cce49990bf2ec\",\"file_bytes\":1599,\"body_bytes\":335},{\"atom_id\":\"follow-up-on-a-freeform-answer-in-plain-text\",\"file_sha256\":\"8659c938007e53ec64191caaf8fdfc490ab57aa163388694ed229ec02f258029\",\"content_sha256\":\"14168ea162e974ef4ce4395ee7ecf29580a0c4764eb77661898dd61d1d48527c\",\"file_bytes\":1591,\"body_bytes\":379},{\"atom_id\":\"name-the-gray-areas-specifically\",\"file_sha256\":\"39ef4528ab6347438e20d760c485b65f13eafa4bcb229e2b6439431740285426\",\"content_sha256\":\"bfc6c0d382043d0c1728076cf8a7c23cf7637339165d6b7217c8bb311035637b\",\"file_bytes\":1602,\"body_bytes\":407},{\"atom_id\":\"never-proceed-on-an-empty-answer\",\"file_sha256\":\"7d7513006b713e3de47c647f9e4a87893a2cfa16fc6c1cb250de3c598a01ea20\",\"content_sha256\":\"4900931ea69faff3e93122b38d3184d9ee3e5ebac361a8dcd786327824cc0989\",\"file_bytes\":1284,\"body_bytes\":197},{\"atom_id\":\"record-every-referenced-document-with-its-full-path\",\"file_sha256\":\"ceea7e1d20f7e553bc1c09bddab7917858fa177cdfa1c39c2b418df2e90e8d48\",\"content_sha256\":\"0feae78cde7fb777e5a999deadeb4a3d61d6da353b76a2f770be49759492fb50\",\"file_bytes\":2076,\"body_bytes\":686},{\"atom_id\":\"say-when-the-phase-needs-no-discussion\",\"file_sha256\":\"c6ea4574a038b59571345b6bd8d564a5666977143c0b998e0b27b7dfc3b925d9\",\"content_sha256\":\"8c1f538a652af9edd5dd7edd82dccb551562f320ed91304c3beed9ba76f5212b\",\"file_bytes\":1215,\"body_bytes\":204}]"
carrier_sha256: faf42e267ce45bdfc7c5401c9a70c43ba4872dca71ba34f85f5b67ed7d07c701
carrier_bytes: 12157
revision: 1
status: active
---
<!-- vpmodule:atom:begin answer-the-three-questions-before-you-pass-a-blocking-anti-pattern -->
---
instruction_id: answer-the-three-questions-before-you-pass-a-blocking-anti-pattern
title: Answer the three questions before you pass a blocking anti-pattern
summary: A recorded blocker is passed only after the three questions are answered in writing.
capability_tags:
  - verify-work-results
pattern_tags:
  - technical-debt
conditions_applies_when: A recorded anti-pattern is marked as blocking the work.
conditions_does_not_apply_when: "The recorded item is a warning or a note, not a blocker."
artifact_contract_output_type: anti-pattern-review
artifact_contract_required_data:
  - the anti-pattern
  - how it manifested
  - the structural mechanism that prevents it
artifact_contract_verified_by: all three answers are written before the work continues
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Answer the three questions before you pass a blocking anti-pattern
the agent must demonstrate understanding of each by answering all three questions for each one:
1. **What is this anti-pattern?** — Describe it in your own words.
2. **How did it manifest?** — Explain the specific failure that caused it to be recorded.
3. **What structural mechanism (not acknowledgment) prevents it?** — Name the concrete step or enforcement mechanism that stops recurrence.
Write these answers inline before continuing.
stop and ask the user for clarification.
<!-- vpmodule:atom:end answer-the-three-questions-before-you-pass-a-blocking-anti-pattern -->
<!-- vpmodule:atom:begin do-not-re-ask-what-the-spec-already-locks -->
---
instruction_id: do-not-re-ask-what-the-spec-already-locks
title: Do not re-ask what the spec already locks
summary: What the specification already locks is not asked again and not copied into the decisions.
capability_tags:
  - clarify-requirements
pattern_tags:
  - frozen-intent
conditions_applies_when: "A written specification already locks the requirements, boundaries and acceptance criteria."
conditions_does_not_apply_when: No specification exists and the requirements are still open.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - the locked requirements
  - the remaining implementation decisions
artifact_contract_verified_by: "no question is asked about what to build or why, and the locked text is not copied into the decisions"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/templates/context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Do not re-ask what the spec already locks
Do NOT generate gray areas about WHAT to build or WHY. Only generate gray areas about HOW to implement.
Do NOT duplicate requirements text
from the spec into the decisions.
agents read the spec directly.
The `<decisions>` section contains only implementation decisions from this discussion.
<!-- vpmodule:atom:end do-not-re-ask-what-the-spec-already-locks -->
<!-- vpmodule:atom:begin follow-up-on-a-freeform-answer-in-plain-text -->
---
instruction_id: follow-up-on-a-freeform-answer-in-plain-text
title: Follow up on a freeform answer in plain text
summary: A freeform answer is followed up as plain text and reflected back before the next question.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The user answered a question with freeform text instead of choosing an option.
conditions_does_not_apply_when: The user picked one of the offered options.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - the reflected input
  - the follow-up question
artifact_contract_verified_by: the follow-up is asked as plain text and the input is reflected back before the next question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/modes/default.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Follow up on a freeform answer in plain text
If user picks "Other" to provide freeform input (e.g., "let me describe it", "something else", or an open-ended reply), ask your follow-up as plain text — NOT another AskUserQuestion.
Wait for them to type at the normal prompt, then reflect their input back and confirm before resuming AskUserQuestion or the next numbered batch.
<!-- vpmodule:atom:end follow-up-on-a-freeform-answer-in-plain-text -->
<!-- vpmodule:atom:begin name-the-gray-areas-specifically -->
---
instruction_id: name-the-gray-areas-specifically
title: Name the gray areas specifically
summary: "The open decisions are named for this piece of work, not by generic category label."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The open decisions of a unit of work are being listed for the user to choose from.
conditions_does_not_apply_when: The decision is technical implementation detail that the team settles itself.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - the area name
  - the specific ambiguity
  - the code context that touches it
artifact_contract_verified_by: no area is named with a generic category label
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body gives generic user-choice clarification guidance and excludes team-owned technical details, but identifies no supported product or other domain."
---

# Name the gray areas specifically
Gray areas are **implementation decisions the user cares about** — things that could go multiple ways and would change the result.
**Don't use generic category labels** (UI, UX, Behavior). Generate specific gray areas.
**Claude handles these (don't ask):** technical implementation details, architecture patterns, performance optimization, scope (roadmap defines this).
<!-- vpmodule:atom:end name-the-gray-areas-specifically -->
<!-- vpmodule:atom:begin never-proceed-on-an-empty-answer -->
---
instruction_id: never-proceed-on-an-empty-answer
title: Never proceed on an empty answer
summary: An empty answer is retried once and then turned into a plain list; the run never continues on nothing.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A question was asked and the answer came back empty.
conditions_does_not_apply_when: The answer contains text.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - the options
  - the retry count
artifact_contract_verified_by: the run did not continue on an empty answer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/modes/text.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Never proceed on an empty answer
Never proceed with empty input.
**Any other empty response:** retry once with the same parameters; if still empty, present options as a plain-text numbered list.
<!-- vpmodule:atom:end never-proceed-on-an-empty-answer -->
<!-- vpmodule:atom:begin record-every-referenced-document-with-its-full-path -->
---
instruction_id: record-every-referenced-document-with-its-full-path
title: Record every referenced document with its full path
summary: A document the user names is read at once and recorded with a full path for the agents that come after.
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: "The user names a document, specification or decision record during a discussion."
conditions_does_not_apply_when: The reference is an informal mention with no document behind it.
artifact_contract_output_type: reference-list
artifact_contract_required_data:
  - the document path
  - what it decides
artifact_contract_verified_by: every entry carries a full relative path and is marked as one the downstream agents must read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/modes/default.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/templates/context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Record every referenced document with its full path
When the user references a doc, spec, or ADR during any answer — e.g., "read adr-014", "check the MCP spec", "per browse-spec.md" — immediately:
Read the referenced doc (or confirm it exists)
Add it to the canonical refs accumulator with full relative path
Use what you learned from the doc to inform subsequent questions
These user-referenced docs are often MORE important than ROADMAP.md refs because they represent docs the user specifically wants downstream agents to follow. Never drop them.
Every entry needs a full relative path — not just a name.
**Downstream agents MUST read these before planning or implementing.**
<!-- vpmodule:atom:end record-every-referenced-document-with-its-full-path -->
<!-- vpmodule:atom:begin say-when-the-phase-needs-no-discussion -->
---
instruction_id: say-when-the-phase-needs-no-discussion
title: Say when the phase needs no discussion
summary: "The run says so when the analysis found no open decision worth the user's attention."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "The analysis found no open decision worth the user's attention."
conditions_does_not_apply_when: At least one meaningful open decision was found.
artifact_contract_output_type: skip-assessment
artifact_contract_required_data:
  - the reason no discussion is needed
artifact_contract_verified_by: the assessment names the reason the discussion is not needed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Say when the phase needs no discussion
**Skip assessment** — If no meaningful gray areas exist (pure infrastructure, clear-cut implementation, all already decided), the phase may not need discussion.
<!-- vpmodule:atom:end say-when-the-phase-needs-no-discussion -->