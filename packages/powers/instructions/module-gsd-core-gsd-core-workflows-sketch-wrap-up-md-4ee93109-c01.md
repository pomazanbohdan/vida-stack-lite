---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-sketch-wrap-up-md-4ee93109-c01"
title: "gsd-core: gsd-core/workflows/sketch-wrap-up.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/workflows/sketch-wrap-up.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/sketch-wrap-up.md\"}"
atom_ids:
  - curate-each-item-and-decide-it-individually
  - exclude-the-generated-junk-when-you-copy-the-sources
  - exit-when-there-is-nothing-new-to-process
  - propose-the-grouping-before-you-write-the-files
  - record-the-rejected-directions-and-why-they-failed
atom_count: 5
atoms: "[{\"atom_id\":\"curate-each-item-and-decide-it-individually\",\"file_sha256\":\"f0ef8ebe6ec92f8ae6eca445455503de801a2fb4fba2dd7651a64c65162ece1b\",\"content_sha256\":\"b95c4551b139f6e9fb57c9276d4e31113d5e1100e733fea7513157cc8a79f822\",\"file_bytes\":1563,\"body_bytes\":464},{\"atom_id\":\"exclude-the-generated-junk-when-you-copy-the-sources\",\"file_sha256\":\"df3437ce1e6b8d5b27bb8744433eee1413991b7523a08987bc0c1f46f51d3701\",\"content_sha256\":\"27c12e4734ad6aadfc948eab2832c383133ca95512757f853f46ab6d1e383677\",\"file_bytes\":1448,\"body_bytes\":234},{\"atom_id\":\"exit-when-there-is-nothing-new-to-process\",\"file_sha256\":\"59ede03441f9a51ab01cad83d0f3006f2c2fcb6af03b5edcd8125f0a7a0efb47\",\"content_sha256\":\"0fbd9275866bc7454a63daa74a78bf5a932656c83c623633e266b1e4ba856d62\",\"file_bytes\":1421,\"body_bytes\":224},{\"atom_id\":\"propose-the-grouping-before-you-write-the-files\",\"file_sha256\":\"d821a9f982d28563d09a43877794a60de9d9cf400cddfe8633325edcefb96243\",\"content_sha256\":\"d7d292f1bc3a49896a551875f9caf8e5461fc54b0d86d62c3c9acee802a0ea24\",\"file_bytes\":1308,\"body_bytes\":231},{\"atom_id\":\"record-the-rejected-directions-and-why-they-failed\",\"file_sha256\":\"3c1ffcd92ed75b7911aa05929253c7d1cb8f5d07733604d6aed6fb851179b104\",\"content_sha256\":\"3fd889a24a70bc725cf672181e56b8c09bf8c2cd37a6d3d67af463a897b8f983\",\"file_bytes\":1344,\"body_bytes\":161}]"
carrier_sha256: c1ecf068bb6eb438ff4469f9ef1c1bace65cc80c3291a1e482c1be51dc54563c
carrier_bytes: 7839
revision: 1
status: active
---
<!-- vpmodule:atom:begin curate-each-item-and-decide-it-individually -->
---
instruction_id: curate-each-item-and-decide-it-individually
title: Curate each item and decide it individually
summary: "Every candidate is presented on its own with the facts that matter, and the decision to include, exclude or partly include it is taken one item at a time."
capability_tags:
  - triage-reports
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A set of finished candidates has to be curated into a package.
conditions_does_not_apply_when: The whole set is accepted or rejected as one decision.
artifact_contract_output_type: curation-decisions
artifact_contract_required_data:
  - the item
  - its winner and tags
  - the decision
  - what was partly taken
artifact_contract_verified_by: every item has its own recorded decision
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sketch-wrap-up.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Curate each item and decide it individually
Present each unprocessed sketch in ascending order. For each sketch, show:
**Sketch number and name**
**Design question:** from frontmatter
**Winner:** which variant was selected (if any)
**Tags:** from frontmatter
**Key decisions:** summarize what was decided visually
**If "Partial":** Ask what specifically to include or exclude from this sketch's decisions.
**→ Include / Exclude / Partial / Let me look at it**
<!-- vpmodule:atom:end curate-each-item-and-decide-it-individually -->
<!-- vpmodule:atom:begin exclude-the-generated-junk-when-you-copy-the-sources -->
---
instruction_id: exclude-the-generated-junk-when-you-copy-the-sources
title: Exclude the generated junk when you copy the sources
summary: "When the source files of a package are copied, the generated and machine-owned files are left out."
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - package-lifecycle
conditions_applies_when: The files of a finished experiment are copied into a package.
conditions_does_not_apply_when: The package is a pointer to the originals and copies nothing.
artifact_contract_output_type: packaged-sources
artifact_contract_required_data:
  - the copied source files
  - the excluded file classes
artifact_contract_verified_by: "no dependency, cache, lock or system file travels with the package"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sketch-wrap-up.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike-wrap-up.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Exclude the generated junk when you copy the sources
Exclude node_modules, build artifacts, .DS_Store
`node_modules/`, `__pycache__/`, `.venv/`, build artifacts
Lock files (`package-lock.json`, `yarn.lock`, etc.)
`.git/`, .DS_Store
<!-- vpmodule:atom:end exclude-the-generated-junk-when-you-copy-the-sources -->
<!-- vpmodule:atom:begin exit-when-there-is-nothing-new-to-process -->
---
instruction_id: exit-when-there-is-nothing-new-to-process
title: Exit when there is nothing new to process
summary: A packaging run that finds no unprocessed candidates says so and stops; it does not repackage what is already packaged.
capability_tags:
  - curate-context
pattern_tags:
  - empty-result-policy
conditions_applies_when: A packaging run looks for candidates that have not been processed yet.
conditions_does_not_apply_when: There are unprocessed candidates to work on.
artifact_contract_output_type: nothing-to-do-report
artifact_contract_required_data:
  - the absence of unprocessed candidates
  - the command that would create them
artifact_contract_verified_by: the run stopped with the empty result reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sketch-wrap-up.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike-wrap-up.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Exit when there is nothing new to process
If no unprocessed sketches exist:
No unprocessed sketches found in `.planning/sketches/`.
If no unprocessed spikes exist:
No unprocessed spikes found in `.planning/spikes/`.
Exit.
<!-- vpmodule:atom:end exit-when-there-is-nothing-new-to-process -->
<!-- vpmodule:atom:begin propose-the-grouping-before-you-write-the-files -->
---
instruction_id: propose-the-grouping-before-you-write-the-files
title: Propose the grouping before you write the files
summary: "The curated items are proposed as groups, the grouping is approved, and each approved group becomes one file."
capability_tags:
  - curate-context
pattern_tags:
  - source-hierarchy
conditions_applies_when: Several curated items have to be organised into a package.
conditions_does_not_apply_when: The organisation is fixed by the format of the package.
artifact_contract_output_type: grouping-proposal
artifact_contract_required_data:
  - the groups
  - the items per group
  - the approval
artifact_contract_verified_by: the grouping was approved before any file was written and each group became one file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sketch-wrap-up.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Propose the grouping before you write the files
Propose design-area groupings, e.g.:
Present the grouping for approval — user may merge, split, rename, or rearrange
Each group becomes one reference file in the generated skill.
<!-- vpmodule:atom:end propose-the-grouping-before-you-write-the-files -->
<!-- vpmodule:atom:begin record-the-rejected-directions-and-why-they-failed -->
---
instruction_id: record-the-rejected-directions-and-why-they-failed
title: Record the rejected directions and why they failed
summary: "The curated reference records what was tried and rejected and why it did not work, not only the direction that won."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A curated reference is written from a set of tried directions.
conditions_does_not_apply_when: Only one direction was ever tried.
artifact_contract_output_type: curated-reference
artifact_contract_required_data:
  - the rejected directions
  - why they did not work
  - the sketches the synthesis came from
artifact_contract_verified_by: the reference names the rejected directions and the origin of the synthesis
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sketch-wrap-up.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body is a short design-direction record template; it does not establish one of the supported forms.
---

# Record the rejected directions and why they failed
[Design directions that were tried and rejected. Why they didn't work.]
Synthesized from sketches: NNN, NNN
<!-- vpmodule:atom:end record-the-rejected-directions-and-why-they-failed -->