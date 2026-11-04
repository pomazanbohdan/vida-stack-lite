---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-phases
title: Run phases in order behind the gates
summary: "Run phases in listed order, each assuming the prior artifact; enter, skip or defer per the rules, but Phases 1-2 gate all downstream work and must address a measured leak with a researched reason; read the methods reference when running a Brief."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - phase-gate
conditions_applies_when: Entering any phase.
conditions_does_not_apply_when: A phase whose prior artifact does not exist.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The prior artifact exists and Phases 1-2 are satisfied before downstream work.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L66-L69"
status: active
revision: 1
---

# Run phases in order behind the gates

Run phases in listed order, each assuming the prior phase artifact exists. Entry, skipping, or deferral follows Operating Rules; Phases 1-2 gate downstream work, which must address a measured leak with a researched reason. When running a phase from its fallback Brief because its constituent skill is unavailable, read references/methods.md first; the Brief is only a summary and that reference contains the full methods, checklists, formulas, and benchmarks.
