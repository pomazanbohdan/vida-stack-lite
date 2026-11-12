---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-review-references-lens-edge-case-hunter-md-8087eac5-c01"
title: "bmad-method: skills/bmad-review/references/lens-edge-case-hunter.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-review/references/lens-edge-case-hunter.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-review/references/lens-edge-case-hunter.md\"}"
atom_ids:
  - bound-the-edge-case-finding-to-four-fields
  - scope-the-path-tracing-to-the-diff-or-the-whole-content
atom_count: 2
atoms: "[{\"atom_id\":\"bound-the-edge-case-finding-to-four-fields\",\"file_sha256\":\"d31dee8c89af773ca070a91919cace2b5ae042ebf9283f67124ccdf2a82d8a76\",\"content_sha256\":\"5e1fbdfbc45a336aa73a00ee96cd5e72e3f4a0bade0e9bd51c00b9335288e74a\",\"file_bytes\":1719,\"body_bytes\":491},{\"atom_id\":\"scope-the-path-tracing-to-the-diff-or-the-whole-content\",\"file_sha256\":\"7a4104c670563f24908d3c0c87a9619e13429feadf9bc268fd1e71d911097087\",\"content_sha256\":\"072f620bb4ea37d6dfa350b3a69f02f51ca3effca3b91effe3b731b7067e1716\",\"file_bytes\":1521,\"body_bytes\":325}]"
carrier_sha256: 8099f7289ff725c268504b76891eb8d9b0f671e3447458bd983332b066172de7
carrier_bytes: 3549
revision: 1
status: active
---
<!-- vpmodule:atom:begin bound-the-edge-case-finding-to-four-fields -->
---
instruction_id: bound-the-edge-case-finding-to-four-fields
title: Bound the edge-case finding to four fields
summary: "An edge-case finding carries exactly four fields, and each field has a stated bound: one line for the trigger, a single-line code sketch for the guard, fifteen words for the consequence."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - exhaustive-path-enumeration
conditions_applies_when: An unhandled path was found and the finding is written out.
conditions_does_not_apply_when: The lens declares its own findings shape and rendering.
artifact_contract_output_type: edge-case-finding
artifact_contract_required_data:
  - the location
  - the trigger condition
  - the guard sketch
  - the potential consequence
artifact_contract_verified_by: the finding has exactly the four fields and each stays inside its stated bound
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-edge-case-hunter.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bound the edge-case finding to four fields
Each edge-case finding contains exactly these four fields:
```json
[{
  "location": "file:start-end (or file:line when single line, or file:hunk when exact line unavailable)",
  "trigger_condition": "one-line description (max 15 words)",
  "guard_snippet": "minimal code sketch that closes the gap (single-line escaped string, no raw newlines or unescaped quotes)",
  "potential_consequence": "what could actually go wrong (max 15 words)"
}]
```
<!-- vpmodule:atom:end bound-the-edge-case-finding-to-four-fields -->
<!-- vpmodule:atom:begin scope-the-path-tracing-to-the-diff-or-the-whole-content -->
---
instruction_id: scope-the-path-tracing-to-the-diff-or-the-whole-content
title: Scope the path tracing to the diff or to the whole content
summary: "A diff is traced through its hunks and the boundaries the changed lines reach; anything else is traced in full, because the whole content is the scope."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - exhaustive-path-enumeration
conditions_applies_when: A path tracing runs over a piece of content and the scope has to be fixed.
conditions_does_not_apply_when: The scope was already fixed by the caller.
artifact_contract_output_type: path-tracing-scope
artifact_contract_required_data:
  - the scope
  - the kind of content it was
artifact_contract_verified_by: "a diff is traced only through its hunks and what they reach, and anything else is traced in full"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-edge-case-hunter.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Scope the path tracing to the diff or to the whole content
When the content is a diff, scan only the diff hunks and list boundaries that are directly reachable from the changed lines and lack an explicit guard in the diff.
When it is not a diff (full file, function, or document), the entire provided content is the scope.
<!-- vpmodule:atom:end scope-the-path-tracing-to-the-diff-or-the-whole-content -->