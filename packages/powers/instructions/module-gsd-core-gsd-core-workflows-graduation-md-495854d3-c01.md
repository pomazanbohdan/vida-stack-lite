---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-graduation-md-495854d3-c01"
title: "gsd-core: gsd-core/workflows/graduation.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/graduation.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/graduation.md\"}"
atom_ids:
  - a-dismissed-item-never-resurfaces
  - skip-silently-when-there-is-not-enough-data
  - surface-promotion-candidates-without-promoting-them
atom_count: 3
atoms: "[{\"atom_id\":\"a-dismissed-item-never-resurfaces\",\"file_sha256\":\"76ac8bc2fec1bb807d40f7383339f19e447034204772640af0a0e5a01f0ef8b9\",\"content_sha256\":\"1b1cc2fbb2cc39d0c56ca9e0692ac5fd0f05646fffab1ed7e58a911e3d823dbc\",\"file_bytes\":1461,\"body_bytes\":317},{\"atom_id\":\"skip-silently-when-there-is-not-enough-data\",\"file_sha256\":\"500b9c6fbfffd9931dd1492c58f7d33cb033ac557ecc0c5d24aad65e603e63a1\",\"content_sha256\":\"f9d0c200ab7e58f005e734cd6c3d74fc2d4dfb15579770a60a62d85f67965bf3\",\"file_bytes\":1218,\"body_bytes\":241},{\"atom_id\":\"surface-promotion-candidates-without-promoting-them\",\"file_sha256\":\"b1738d2e40848dcb5634509fff6b5159efa379cd15be8905d9e01a34512a9f04\",\"content_sha256\":\"e6624e2f5cd1326d843ac7627ed1ce51175d7c2d14dc2237cb631c8fd1288c35\",\"file_bytes\":1649,\"body_bytes\":490}]"
carrier_sha256: 35f8a0948e85ea1ef781e25f76ac1449746bba83333bcce7fdde982732e7d13f
carrier_bytes: 4755
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-dismissed-item-never-resurfaces -->
---
instruction_id: a-dismissed-item-never-resurfaces
title: A dismissed item never resurfaces
summary: An item that was promoted or dismissed is skipped by name on the next scan; an item that was deferred comes back only after the phase it was deferred to has completed.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A recurring-item scan runs again over the same material.
conditions_does_not_apply_when: The scan runs for the first time over this material.
artifact_contract_output_type: promotion-candidate-list
artifact_contract_required_data:
  - the items skipped
  - the reason each was skipped
  - the candidates that remain
artifact_contract_verified_by: no promoted or dismissed item was offered again and a deferred item waited for its condition
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/graduation.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# A dismissed item never resurfaces
Skip items that already contain `**Graduated:**` — they have been promoted and must not re-surface
Skip any cluster whose `cluster_id` matches a `dismissed` entry.
Skip any cluster whose `cluster_id` matches a `deferred` entry where `deferred_until` phase has not yet completed.
<!-- vpmodule:atom:end a-dismissed-item-never-resurfaces -->
<!-- vpmodule:atom:begin skip-silently-when-there-is-not-enough-data -->
---
instruction_id: skip-silently-when-there-is-not-enough-data
title: Skip silently when there is not enough data
summary: "With too few phases or too few items to compare, the scan prints nothing at all rather than a thin report."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - empty-result-policy
conditions_applies_when: The scan found too few phases or too few items to compare.
conditions_does_not_apply_when: There was enough data to cluster.
artifact_contract_output_type: silent-skip
artifact_contract_required_data:
  - the reason the scan was skipped
artifact_contract_verified_by: nothing was printed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/graduation.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
  - operations
---

# Skip silently when there is not enough data
**Skip silently (print nothing) if:**
completed prior phases exist (not enough data)
**Skip silently (print nothing) if total items across all LEARNINGS.md files in the window is fewer than 5.**
<!-- vpmodule:atom:end skip-silently-when-there-is-not-enough-data -->
<!-- vpmodule:atom:begin surface-promotion-candidates-without-promoting-them -->
---
instruction_id: surface-promotion-candidates-without-promoting-them
title: Surface promotion candidates without promoting them
summary: "Recurring items are clustered across the recent phases and the candidates are offered for a decision; nothing is promoted until the developer says so, and the promotion is one atomic commit."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - human-in-the-loop
conditions_applies_when: The recent phases produced learning records that can be compared.
conditions_does_not_apply_when: The promotion feature is switched off.
artifact_contract_output_type: promotion-candidates
artifact_contract_required_data:
  - the clusters
  - the phases each cluster appeared in
  - the decision per cluster
artifact_contract_verified_by: nothing was promoted without an explicit approval
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/graduation.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Surface promotion candidates without promoting them
This workflow clusters recurring items across the last N phases' LEARNINGS.md files and surfaces promotion candidates to the developer via HITL. No item is promoted without explicit developer approval.
only surface clusters with distinct source phases
(not just total items — same item repeated in one phase still counts as 1 distinct phase)
Commit both the target file and all annotated LEARNINGS.md files in a single atomic commit:
<!-- vpmodule:atom:end surface-promotion-candidates-without-promoting-them -->