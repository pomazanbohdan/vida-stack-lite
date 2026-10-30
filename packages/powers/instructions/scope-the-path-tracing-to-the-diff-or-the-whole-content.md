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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-edge-case-hunter.md
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
