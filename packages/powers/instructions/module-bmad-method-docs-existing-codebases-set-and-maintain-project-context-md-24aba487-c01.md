---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-existing-codebases-set-and-maintain-project-context-md-24aba487-c01"
title: "bmad-method: docs/existing-codebases/set-and-maintain-project-context.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:docs/existing-codebases/set-and-maintain-project-context.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/existing-codebases/set-and-maintain-project-context.md\"}"
atom_ids:
  - every-referenced-file-exists-and-opens
  - keep-a-rule-until-what-it-is-about-is-gone
  - prefer-a-prohibition-that-names-the-permitted-alternative
atom_count: 3
atoms: "[{\"atom_id\":\"every-referenced-file-exists-and-opens\",\"file_sha256\":\"27c02633aa4ddde58c2af93997a562636a8ecfd2b369a54a29a1c0a1be75d677\",\"content_sha256\":\"0d5e552ed800a578b0d1cde0c9354b4a66d1b7887179abed94c03e0e0175d690\",\"file_bytes\":1967,\"body_bytes\":581},{\"atom_id\":\"keep-a-rule-until-what-it-is-about-is-gone\",\"file_sha256\":\"2db8b0b4a8e20675d10db31e507af7de9a4fdaec577bf3a9e5b4b8b50ae14497\",\"content_sha256\":\"e5e2f78af8311fdc0bd77dc71097b4a5894a4fbe0690fc5fbdd3d077245067a6\",\"file_bytes\":1946,\"body_bytes\":662},{\"atom_id\":\"prefer-a-prohibition-that-names-the-permitted-alternative\",\"file_sha256\":\"00b1c41d7aec408f20b9c55546cc0c6a0475ce8ee47d047cbcbf1e8f172bc471\",\"content_sha256\":\"a9badd31419dc6346081e3e553e7b29ff47f56348b596f853f6654dd7af10b2b\",\"file_bytes\":1709,\"body_bytes\":372}]"
carrier_sha256: 91a86d0414b7430422ecf4166fcffd0650898f0b78aad81a719458f6dc8c0c78
carrier_bytes: 6069
revision: 1
status: active
---
<!-- vpmodule:atom:begin every-referenced-file-exists-and-opens -->
---
instruction_id: every-referenced-file-exists-and-opens
title: Every referenced file exists and opens
summary: "Every file and link an item names exists and opens, no placeholder is left unfilled, and every assumption is marked."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A work item or a set of them is checked.
conditions_does_not_apply_when: Nothing in the set points at a file or a link.
artifact_contract_output_type: reference-check
artifact_contract_required_data:
  - each reference
  - the result of opening it
  - the placeholders left unfilled
artifact_contract_verified_by: every referenced file and link was opened and no placeholder is left
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/validate-checks.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/set-and-maintain-project-context.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/planner-reachability-check.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Every referenced file exists and opens
Every file or link referenced exists and opens; no unfilled placeholder; every assumption is marked.
It checks every path a line names
and reads your `package.json`, `Makefile`, and CI config — not to copy the scripts, since an agent reads those directly, but to know what they already answer so the block adds only the right commands to use, the corrections, and the caveats.
Planner MUST validate that each plan step references reachable files and APIs
Unreachable steps MUST be flagged during planning, not discovered during execution
<!-- vpmodule:atom:end every-referenced-file-exists-and-opens -->
<!-- vpmodule:atom:begin keep-a-rule-until-what-it-is-about-is-gone -->
---
instruction_id: keep-a-rule-until-what-it-is-about-is-gone
title: Keep a rule until what it is about is gone
summary: "Remove a rule only when its subject is gone or now enforced by a tool, or when a human removes it; a quiet period never retires it."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "A rule in the repository's instructions is under review for removal."
conditions_does_not_apply_when: "The rule is stale, wrong, harmful or contradictory."
artifact_contract_output_type: rule-retention-decision
artifact_contract_required_data:
  - the rule
  - the ground for removal
  - who removed it
artifact_contract_verified_by: the removal names a ground other than the absence of recent failures
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/theory-of-project-context.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/set-and-maintain-project-context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep a rule until what it is about is gone
A rule stays until what it is about is gone, or you retire it.
A policy or pitfall is removed only when what it is about is gone — deleted, or now enforced by a tool — or when a human removes it.
Absence of recent failures is never grounds: a working rule erases the evidence that it is still needed.
The same protection covers every instruction a human wrote.
It goes only when it is stale or wrong, already enforced by a hook or a check, harmful or contradictory, or you approve the deletion as a line item — never because it looks derivable, and never because it is discoverable somewhere in the repository.
<!-- vpmodule:atom:end keep-a-rule-until-what-it-is-about-is-gone -->
<!-- vpmodule:atom:begin prefer-a-prohibition-that-names-the-permitted-alternative -->
---
instruction_id: prefer-a-prohibition-that-names-the-permitted-alternative
title: Prefer a prohibition that names the permitted alternative
summary: "Write the negative constraint rather than the positive one, and always name the permitted alternative next to the ban."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - directive-form-policy
conditions_applies_when: "A rule in the repository's instructions can be written as a prohibition or as positive guidance."
conditions_does_not_apply_when: A guardrail cannot be phrased positively at all.
artifact_contract_output_type: constraint-form-choice
artifact_contract_required_data:
  - the prohibition
  - the permitted alternative
artifact_contract_verified_by: the prohibition names what is allowed instead
compatibility_excludes:
  - write-directive-rules
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/theory-of-project-context.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/set-and-maintain-project-context.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Prefer a prohibition that names the permitted alternative
Negative constraints over positive guidance, which measured better, and which is why a prohibition here always names the permitted alternative.
Conventions that differ from ecosystem defaults, because an agent follows the norm unless told otherwise.
A fact nobody would get wrong by default is not worth a line.
<!-- vpmodule:atom:end prefer-a-prohibition-that-names-the-permitted-alternative -->