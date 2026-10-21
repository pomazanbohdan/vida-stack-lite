---
instruction_id: use-a-targeted-edit-not-a-whole-file-write-when-you-fix-a-claim
title: "Use a targeted edit, not a whole-file write, when you fix a claim"
summary: A correction replaces the smallest piece of text that identifies the wrong claim; the rest of the file is never rewritten.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-minimization
conditions_applies_when: A wrong claim inside an existing document is corrected.
conditions_does_not_apply_when: The document is created from scratch.
artifact_contract_output_type: documentation-update
artifact_contract_required_data:
  - the corrected claim
artifact_contract_verified_by: only the wrong claim was replaced and the rest of the file is unchanged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-writer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-writer.compact.md
status: active
revision: 1
---

# Use a targeted edit, not a whole-file write, when you fix a claim
NEVER use the Write tool on an existing file in fix mode. Write replaces the entire file with whatever you provide — any content not in your context window is permanently destroyed.
Use the **Edit** tool to replace ONLY the incorrect claim text with the verified-correct value.
Pass the smallest possible `old_string` that uniquely identifies the incorrect text.
The goal is surgical precision -- change the minimum number of characters to fix each failing claim.
