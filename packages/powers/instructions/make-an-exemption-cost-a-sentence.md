---
instruction_id: make-an-exemption-cost-a-sentence
title: Make an exemption cost a sentence
summary: An exemption needs a permanent written reason; a promise to get to it later is not a reason.
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - decision-trail
conditions_applies_when: A file or a site has to be exempted from a check.
conditions_does_not_apply_when: The file can be brought under the rule and needs no exemption.
artifact_contract_output_type: exemption-record
artifact_contract_required_data:
  - the exempted path
  - the permanent reason
artifact_contract_verified_by: the exemption carries a non-empty reason and the reason survives scrutiny
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-eslint-coverage-findings.md
status: active
revision: 1
---

# Make an exemption cost a sentence
The `reason` is **structurally required** — an entry with a missing, empty, or whitespace-only reason fails the guard.
That is deliberate. The easy way to make a coverage metric look good is to add an exemption, so an exemption has to cost you a sentence you are willing to sign.
⚠️ **"Not linted yet" is not a reason.** An allowlist entry meaning *we will get to it* is a TODO wearing an exemption's badge, and it will outlive everyone who remembers it.
