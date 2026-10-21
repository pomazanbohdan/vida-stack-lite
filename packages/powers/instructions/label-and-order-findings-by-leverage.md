---
instruction_id: label-and-order-findings-by-leverage
title: Label every finding and order it by leverage
summary: Give each review comment a severity label and put the findings that matter first.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A review produced findings that the author will act on.
conditions_does_not_apply_when: There are no findings to report.
artifact_contract_output_type: labelled-findings
artifact_contract_required_data:
  - the label of each finding
  - the order of the findings
  - the action each label demands
artifact_contract_verified_by: every comment carries a label and the ordering starts with correctness and security
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
---

# Label every finding and order it by leverage

Label every comment with its severity so the author knows what's required vs optional:

| Prefix | Meaning | Author Action |
|--------|---------|---------------|
| **Critical:** | Blocks merge | Security vulnerability, data loss, broken functionality |
| **Important:** | Must address before merge | Required change |
| **Minor:** | Optional | Worth considering but not required; the author may ignore — formatting, style preferences; informational only — no action needed — context for future reference |

This prevents authors from treating all feedback as mandatory and wasting time on optional suggestions.

**Lead with what matters.** Order findings by leverage: correctness and security first, then structural regressions and missed simplifications, then everything else. Don't bury a real issue under cosmetic nits — a few high-conviction comments beat a long list. If you have one structural problem and ten nits, the structural problem *is* the review.

Review comments without severity labels — makes it unclear what's required vs optional
