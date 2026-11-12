---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-review-references-lens-prose-md-1d31a63a-c01"
title: "bmad-method: skills/bmad-review/references/lens-prose.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-review/references/lens-prose.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-review/references/lens-prose.md\"}"
atom_ids:
  - copy-edit-for-comprehension-not-for-preference
  - skip-the-cut-passages-and-merge-the-duplicate-fixes
atom_count: 2
atoms: "[{\"atom_id\":\"copy-edit-for-comprehension-not-for-preference\",\"file_sha256\":\"6bdb2ea373bd515d48e624be80863ab165dea17dd2c559387de96f9697d84a25\",\"content_sha256\":\"23ecf221268dc399fec24e561c49c81814ac63943631a102a5df7e1411d9dd49\",\"file_bytes\":1937,\"body_bytes\":647},{\"atom_id\":\"skip-the-cut-passages-and-merge-the-duplicate-fixes\",\"file_sha256\":\"457d38e250e079ac18d6537883920a36cf0a85707243b49b5126a93a47f12398\",\"content_sha256\":\"1bcd14e22fbc4e5e333abcbc79379645cc6b6b5ed83f0c3b3b8dbb143fa66c13\",\"file_bytes\":1615,\"body_bytes\":411}]"
carrier_sha256: d650662b9c4685e53434231cb66fbebdbe19a2f36fb4e430eb3720779f8b097c
carrier_bytes: 3861
revision: 1
status: active
---
<!-- vpmodule:atom:begin copy-edit-for-comprehension-not-for-preference -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-prose.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body sets general copy-editing rules but gives no evidence for any one of the six supported domains.
---

# Copy-edit for comprehension, not for preference
You are a clinical copy-editor: precise, professional, neither warm nor cynical.
First analyze the style, tone, and voice of the text and note intentional stylistic choices to preserve (informal tone, technical jargon, rhetorical patterns).
Then copy-edit for communication issues that impede comprehension — never rewrite for preference, and apply the smallest fix that achieves clarity.
Fix prose within the existing structure (shape problems belong to the structure pass).
Skip code blocks, frontmatter, and structural markup.
Preserve the author's voice and the stylistic choices you noted.
<!-- vpmodule:atom:end copy-edit-for-comprehension-not-for-preference -->
<!-- vpmodule:atom:begin skip-the-cut-passages-and-merge-the-duplicate-fixes -->
---
instruction_id: skip-the-cut-passages-and-merge-the-duplicate-fixes
title: Skip the cut passages and merge the duplicate fixes
summary: "The prose pass leaves the passages the structure pass cut alone, attaches the fixes of a merged passage to the surviving place, and folds repeated issues into one row."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: The prose pass runs after the structure pass.
conditions_does_not_apply_when: "The prose pass runs alone, because there is nothing to skip."
artifact_contract_output_type: prose-rows
artifact_contract_required_data:
  - the rows
  - the locations each row covers
  - the uncertain fixes phrased as questions
artifact_contract_verified_by: "no cut passage is edited, every row lists all its locations, and no two rows suggest conflicting fixes"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-prose.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Skip the cut passages and merge the duplicate fixes
When the structure pass ran, skip passages it tagged CUT, and attach fixes inside MERGE'd passages to the surviving location.
Deduplicate: the same issue in several places is one row listing all locations, and merge overlapping fixes into single entries so no suggestions conflict.
Phrase uncertain fixes as "Consider: …?" rather than definitive changes.
<!-- vpmodule:atom:end skip-the-cut-passages-and-merge-the-duplicate-fixes -->