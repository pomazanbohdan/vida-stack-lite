---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-help-modes-topic-md-8a12632b-c01"
title: "gsd-core: gsd-core/workflows/help/modes/topic.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/help/modes/topic.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/help/modes/topic.md\"}"
atom_ids:
  - announce-the-match-before-you-answer
  - name-the-valid-options-when-nothing-matches
atom_count: 2
atoms: "[{\"atom_id\":\"announce-the-match-before-you-answer\",\"file_sha256\":\"c2f851403f806c3c7886de387c8b4e8d1339020b6eb9e122e7e405304b7b9aa5\",\"content_sha256\":\"18b03f8556d361718ba4d4c139a4df0d20f53f067c23675ca79ddb3f8d51e501\",\"file_bytes\":1425,\"body_bytes\":272},{\"atom_id\":\"name-the-valid-options-when-nothing-matches\",\"file_sha256\":\"e92acf91cb0a1da335bcea4189c31a814750baed2628b6c45d27f9b8c72e8864\",\"content_sha256\":\"72a08dc6971e2367afb32151586baec75043dbe1f957d080fb4882066fb2c1dc\",\"file_bytes\":1364,\"body_bytes\":234}]"
carrier_sha256: 3d05737b789f17311e075f0199753cc56ec8c977528aad6a3ff07621ff76862c
carrier_bytes: 3062
revision: 1
status: active
---
<!-- vpmodule:atom:begin announce-the-match-before-you-answer -->
---
instruction_id: announce-the-match-before-you-answer
title: Announce the match before you answer
summary: "When a request names one of several known targets, the resolution is announced in one line - the matched name, the target, and the scope about to be emitted."
capability_tags:
  - communicate-concisely
pattern_tags:
  - output-formatting
conditions_applies_when: A request names a target that has to be resolved before the work starts.
conditions_does_not_apply_when: There is exactly one candidate and nothing was resolved.
artifact_contract_output_type: resolution-line
artifact_contract_required_data:
  - the matched name
  - the target it resolved to
  - the scope that will be emitted
artifact_contract_verified_by: one line states what was matched before the content is emitted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/help/modes/topic.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - operations
---

# Announce the match before you answer
If matched: emit a single resolved-routing preamble line so the user sees what was matched:
Use the canonical alias from the leftmost column. Use the literal heading text from the matched cell. State the scope you are about to emit.
<!-- vpmodule:atom:end announce-the-match-before-you-answer -->
<!-- vpmodule:atom:begin name-the-valid-options-when-nothing-matches -->
---
instruction_id: name-the-valid-options-when-nothing-matches
title: Name the valid options when nothing matches
summary: A request that matches nothing is answered with a one-line error and the list of the names that do exist - then the run stops.
capability_tags:
  - communicate-concisely
pattern_tags:
  - output-formatting
conditions_applies_when: A named target does not resolve to anything.
conditions_does_not_apply_when: The request resolves to a known target.
artifact_contract_output_type: unmatched-list
artifact_contract_required_data:
  - the one-line error
  - the list of the valid names
artifact_contract_verified_by: the error names the valid options and the run stops there
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/help/modes/topic.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body and conditions name no supported subject domain; assigning a facet would rely on context outside the source text.
---

# Name the valid options when nothing matches
If no match: emit a one-line error followed by a comma-separated list of the canonical topic names from the leftmost column (one per row, deduplicated).
Name the complete reference.
Stop.
<!-- vpmodule:atom:end name-the-valid-options-when-nothing-matches -->