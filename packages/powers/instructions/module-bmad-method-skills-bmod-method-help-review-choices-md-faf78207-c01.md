---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmod-method-help-review-choices-md-faf78207-c01"
title: "bmad-method: skills/bmod-method/help/review-choices.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmod-method/help/review-choices.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmod-method/help/review-choices.md\"}"
atom_ids:
  - name-the-reason-review-is-slow
  - stop-the-review-when-the-findings-are-minor
atom_count: 2
atoms: "[{\"atom_id\":\"name-the-reason-review-is-slow\",\"file_sha256\":\"34108984df8ccde149bdff60fd7ed32d4ac8ffa764895e18e4206798735d5a45\",\"content_sha256\":\"c67bb025d5797b4469453c1d55b28ace62f4e11710ccbaedc39bb2e7181387e5\",\"file_bytes\":1339,\"body_bytes\":265},{\"atom_id\":\"stop-the-review-when-the-findings-are-minor\",\"file_sha256\":\"12ae1748293e3364e1188906fcbf3c2126a759f0ddecfd32412d72444b272984\",\"content_sha256\":\"e46f3559df991cf1960bf67c1e6b77092309169a04ce9342c7d2013f19f8b625\",\"file_bytes\":1727,\"body_bytes\":458}]"
carrier_sha256: e5a0d8f6acf869341878e715c63bb29778acd23d7d1013137afdc0457c9c540a
carrier_bytes: 3327
revision: 1
status: active
---
<!-- vpmodule:atom:begin name-the-reason-review-is-slow -->
---
instruction_id: name-the-reason-review-is-slow
title: Name the reason review is slow
summary: "A thorough review takes time on purpose; name the actual cause - too many rules in the file the reviewers read, very large sources, or a platform without parallel reviewers - and offer the shallower pass."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review takes longer than the user expected.
conditions_does_not_apply_when: The review has not run yet.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the cause
  - the shallower pass offered
artifact_contract_verified_by: the report names the cause and offers the shallower run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/review-choices.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Name the reason review is slow
It is thorough on purpose and can take half an hour or more.
Offer a quick pass instead.
`AGENTS.md` has too many rules, or source files are very large. Reviewers read both.
The platform has no subagents or runs them one at a time.
<!-- vpmodule:atom:end name-the-reason-review-is-slow -->
<!-- vpmodule:atom:begin stop-the-review-when-the-findings-are-minor -->
---
instruction_id: stop-the-review-when-the-findings-are-minor
title: Stop the review when the findings are minor
summary: "Stop the pass when the findings are mostly minor notes about unlikely corner cases; real findings on a third pass point outside the change, at a weak spec or unclear repo rules, and the user has to fix those."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review pass has come back with findings.
conditions_does_not_apply_when: A finding is Critical or Important.
artifact_contract_output_type: review-verdict
artifact_contract_required_data:
  - the findings by severity
  - the stop decision
artifact_contract_verified_by: the pass stops when only minor notes about unlikely corner cases remain
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/review-choices.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/validation-skills.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Stop the review when the findings are minor
Stop when findings are mostly minor notes about unlikely corner cases.
Real findings on a third pass point outside the change: a weak spec or unclear repo rules. Tell the user to fix that.
more than two rounds on one change usually points to a problem outside the change, such as weak planning or a messy codebase.
The depth a build ran at, skipped included, is the user's choice and no reason for another pass.
<!-- vpmodule:atom:end stop-the-review-when-the-findings-are-minor -->