---
instruction_id: scope-the-packaged-requirements-to-the-ideas-you-wrapped
title: Scope the packaged requirements to the ideas you wrapped
summary: "The requirements that travel with a package are the ones of the ideas it actually covers, grouped by idea; the requirements of an unrelated idea never join them."
capability_tags:
  - curate-context
pattern_tags:
  - stable-identity
conditions_applies_when: Findings of several ideas are packaged together.
conditions_does_not_apply_when: The package covers exactly one idea.
artifact_contract_output_type: scoped-requirements
artifact_contract_required_data:
  - the idea per group
  - the requirements of those ideas
  - the grouping of the list
artifact_contract_verified_by: no requirement of an idea outside the package travelled with it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spike-wrap-up.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - operations
---

# Scope the packaged requirements to the ideas you wrapped
Non-negotiable design decisions pulled ONLY from the Requirements list of the idea key(s) that own the spikes in this feature-area group
Never include a requirement from an idea key that has no spike in this group.
Union of the Requirements lists for every idea key represented among the spikes being wrapped in this session — never the whole MANIFEST.md.
If this wrap-up spans more than one idea key, group the list by idea key so a future reader can tell which requirement belongs to which idea.
