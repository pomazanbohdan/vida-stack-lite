---
instruction_id: an-absence-of-metadata-binds-nothing
title: An absence of metadata binds nothing
summary: A project that declares no supported version constrains neither the version you rule out nor the one you standardise on.
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - source-cited-decisions
conditions_applies_when: A compatibility claim rests on a field the upstream does not publish.
conditions_does_not_apply_when: The upstream publishes a constraint that decides the question.
artifact_contract_output_type: compatibility-claim
artifact_contract_required_data:
  - the missing field
  - the versions the absence says nothing about
artifact_contract_verified_by: the claim is not treated as a constraint and no version bound is taken from the absence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/verify-a-dependency-compatibility-claim.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - research
---

# An absence of metadata binds nothing
A project that declares no supported versions has said nothing about the version you are ruling out *and* nothing about the version you are standardizing on. The same evidence would "prove" both, so it settles neither.
An absence in the docs is not this. "The docs do not mention 3.14" is the same silence you started with.
That is the same inference with the sign flipped, and it fails for the same reason. If you want to standardize *on* a version, the evidence for that is a declared constraint that covers it, a matching classifier, or a probe that succeeds — never the absence of a prohibition.
