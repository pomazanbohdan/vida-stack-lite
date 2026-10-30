---
instruction_id: mine-the-review-ratings-for-pain-and-for-loyalty
title: Mine the review ratings for pain and for loyalty
summary: "The lowest ratings carry the pain and the highest ratings carry the reasons users stay; read both ends of the scale, and in a competitor's reviews the complaints are the wedge."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: "Complaints, pains or loyalty are to be evidenced from user reviews."
conditions_does_not_apply_when: No review corpus exists for the product or the competitor in question.
artifact_contract_output_type: review-evidence
artifact_contract_required_data:
  - the low-rated reviews mined for pain
  - the high-rated reviews mined for what keeps users
  - "the competitor's complaints used as a wedge"
artifact_contract_verified_by: every finding names the rating band it was mined from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/market.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/competitive.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/user-voice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - business
  - research
---

# Mine the review ratings for pain and for loyalty
1–3★ reviews are the gold for pains
their customers' 1–3★ reviews are your wedge
mine 1–3★ reviews for pain *and* 5★ for why they stay
