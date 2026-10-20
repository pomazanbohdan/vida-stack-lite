---
instruction_id: copy-edit-for-comprehension-not-for-preference
title: "Copy-edit for comprehension, not for preference"
summary: "The prose pass first notes the voice and the style to preserve, then applies the smallest fix that makes a passage clear, and leaves the shape of the document alone."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A prose pass edits a document that is already shaped.
conditions_does_not_apply_when: "The document has no structure yet, so the shape is still to be decided."
artifact_contract_output_type: prose-edits
artifact_contract_required_data:
  - the stylistic choices to preserve
  - the passages that impede comprehension
  - the smallest fix for each
artifact_contract_verified_by: every edit is the smallest one that achieves clarity and the noted voice survives
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-prose.md
status: active
revision: 1
---

# Copy-edit for comprehension, not for preference
You are a clinical copy-editor: precise, professional, neither warm nor cynical.
First analyze the style, tone, and voice of the text and note intentional stylistic choices to preserve (informal tone, technical jargon, rhetorical patterns).
Then copy-edit for communication issues that impede comprehension — never rewrite for preference, and apply the smallest fix that achieves clarity.
Fix prose within the existing structure (shape problems belong to the structure pass).
Skip code blocks, frontmatter, and structural markup.
Preserve the author's voice and the stylistic choices you noted.
