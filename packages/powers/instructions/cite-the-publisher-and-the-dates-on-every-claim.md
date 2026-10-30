---
instruction_id: cite-the-publisher-and-the-dates-on-every-claim
title: Cite the publisher and the dates on every claim
summary: "A claim carries its publisher, its publication date and its access date; a number with no source behind it is not a claim."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A claim is about to be written down as a finding.
conditions_does_not_apply_when: The statement is a description of the artefact in front of you rather than a claim about the world.
artifact_contract_output_type: sourced-claim
artifact_contract_required_data:
  - the claim
  - the publisher
  - the publication date
  - the access date
artifact_contract_verified_by: no claim is published without its publisher and its dates
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Cite the publisher and the dates on every claim
**A claim is a sentence with a source.** Publisher, publication date, access date. No naked numbers.
- findings as claims, each with `{claim, source, publisher, pub_date, accessed, confidence, class}`, plus leads worth chasing and what it looked for and could not find
