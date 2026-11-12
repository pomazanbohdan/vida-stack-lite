---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-project-context-skill-md-9baf9f2a-c01"
title: "bmad-method: skills/bmad-project-context/SKILL.md module"
summary: "Carrier for 7 atomic instructions from bmad-method:skills/bmad-project-context/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-project-context/SKILL.md\"}"
atom_ids:
  - admit-a-pitfall-only-on-observed-evidence
  - ask-only-what-no-scan-can-answer
  - exclude-what-the-repository-already-states
  - keep-the-line-until-the-check-is-live
  - show-the-ledger-beside-the-replacement
  - verify-a-command-claim-against-the-script-that-runs-it
  - verify-that-a-nested-instruction-file-is-loaded
atom_count: 7
atoms: "[{\"atom_id\":\"admit-a-pitfall-only-on-observed-evidence\",\"file_sha256\":\"863eaf6d77fa01d0adf7cd0db3cd8a04476c5dbd9dc22971f6a24b2e455a63dc\",\"content_sha256\":\"6ab7bc6a62645f91ca338007a4fd792ed4c5cd43d7c8163d70412ca5f194426a\",\"file_bytes\":1808,\"body_bytes\":563},{\"atom_id\":\"ask-only-what-no-scan-can-answer\",\"file_sha256\":\"1640019ef8be6f9638735ee28a3cf119a2336abfb4f5a280dda72abf5b6808ec\",\"content_sha256\":\"8fdaec8139409129e09abe6a971bcb8d5ec407191349144d08cbf2678fc8e524\",\"file_bytes\":1883,\"body_bytes\":711},{\"atom_id\":\"exclude-what-the-repository-already-states\",\"file_sha256\":\"eef78f9e6ae6f1c3151aff988a7ca5cff849f8cd37a3f164c43136bfd5730678\",\"content_sha256\":\"f636fcea5bc18440bb2515c806db92c73beac011e68a2f0faeb4dfc654af7158\",\"file_bytes\":1705,\"body_bytes\":433},{\"atom_id\":\"keep-the-line-until-the-check-is-live\",\"file_sha256\":\"32e5f52b770d9e4a5d8c886b5386fbb9c763c496a7dc7846b1c630e0235846e2\",\"content_sha256\":\"7a8a93ba28cc22480c24b716ffee88aa04390174577f87d4758988cad79e6459\",\"file_bytes\":2199,\"body_bytes\":768},{\"atom_id\":\"show-the-ledger-beside-the-replacement\",\"file_sha256\":\"570bff8b6e07a7b5d9b2df489834541c1872aa0de5465b21c7366a79c0460910\",\"content_sha256\":\"dcc72bdf8d46672c5df1762f90cb5a736b983d415ce75394d5e2aca783d7beb5\",\"file_bytes\":2229,\"body_bytes\":1050},{\"atom_id\":\"verify-a-command-claim-against-the-script-that-runs-it\",\"file_sha256\":\"71407238d9c7bf670b0d5089933250308227dfbe45de8500cca93aff60e1c92b\",\"content_sha256\":\"9ec19bb98248995e5501edbba8311603c87c30986dd623bac7f3b21b1f5ab139\",\"file_bytes\":1482,\"body_bytes\":288},{\"atom_id\":\"verify-that-a-nested-instruction-file-is-loaded\",\"file_sha256\":\"682d7079320665618927342446cc4babf410bdb2a90a78d6ca078851a19ff207\",\"content_sha256\":\"715aad8dae4705aeccb459b63a1ec44a8d5ad215db2e7de83e994370dea22829\",\"file_bytes\":2432,\"body_bytes\":1083}]"
carrier_sha256: 45f8347c27408656dfc6b10c41885ea927eb3fd4e1dbf2612af47d78cb67941f
carrier_bytes: 14725
revision: 1
status: active
---
<!-- vpmodule:atom:begin admit-a-pitfall-only-on-observed-evidence -->
---
instruction_id: admit-a-pitfall-only-on-observed-evidence
title: Admit a pitfall only on observed evidence
summary: "A pitfall is written only after the mistake it warns about actually happened; a surprising scan finding is a question, not a line."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A pitfall is being added to the instructions of a repository.
conditions_does_not_apply_when: The mistake is already recorded and its evidence is on file.
artifact_contract_output_type: pitfall-line
artifact_contract_required_data:
  - the observed mistake
  - the evidence
  - the line
artifact_contract_verified_by: the pitfall names a mistake that has actually occurred
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-project-context/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-project-context/references/best-practices.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - research
---

# Admit a pitfall only on observed evidence
Pitfalls with observed evidence — a recorded lesson, the maintainer's recollection, the same mistake fixed repeatedly in history, or one this session made and caught.
A repo yields hundreds of trap-looking facts and none of them predict real mistakes; only observed behavior does.
A surprising scan finding is a question to ask, not a line to write.
Capture one observed agent mistake as it happens — the only admissible source for a pitfall.
One occurrence is noted; a recurring or costly mistake earns a line now
<!-- vpmodule:atom:end admit-a-pitfall-only-on-observed-evidence -->
<!-- vpmodule:atom:begin ask-only-what-no-scan-can-answer -->
---
instruction_id: ask-only-what-no-scan-can-answer
title: Ask only what no scan can answer
summary: "Interview the owner only for what no scan reaches, in small batches, and never hand back a selection problem the scan created."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - requirements-clarification
conditions_applies_when: The instructions of a repository are being written and the owner is being interviewed.
conditions_does_not_apply_when: Nothing is being asked of the owner.
artifact_contract_output_type: interview
artifact_contract_required_data:
  - the gaps
  - the questions
  - the batches
artifact_contract_verified_by: no question could have been answered by the scan
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-project-context/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ingest-docs.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Ask only what no scan can answer
Only what no scan reaches: what agents keep getting wrong here, what is off limits, what a domain term means, why a constraint exists.
Never ask what a scan could answer.
Asking the user to confirm a path-checked claim, or one a config file already states, is a defect.
Ask recall questions, not review lists.
Never hand the user a selection problem a scan created.
A mistake this session made and caught is observed evidence — offer it.
Batches of at most eight; fewer is better.
A batch yielding nothing new means write.

Derive every field the sources already answer and ask only for the ones they do not - one at a time, as a minimal question set, not an interrogation.
<!-- vpmodule:atom:end ask-only-what-no-scan-can-answer -->
<!-- vpmodule:atom:begin exclude-what-the-repository-already-states -->
---
instruction_id: exclude-what-the-repository-already-states
title: Exclude what the repository already states
summary: "Keep derived copies, platitudes, self-enforced style, transcribed commands, pasted code and history out of the instructions."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The instructions of a repository are being written or pruned.
conditions_does_not_apply_when: The content has no counterpart in the repository and nothing else states it.
artifact_contract_output_type: exclusion-set
artifact_contract_required_data:
  - the excluded kinds
  - the reason for each
  - the personal rules that stay out
artifact_contract_verified_by: no excluded kind is present in the finished instructions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-project-context/references/best-practices.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-project-context/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Exclude what the repository already states
Anything included for being interesting | Interest is not need
Platitudes | Already the default
Style rules an agent self-enforces | Belongs in a formatter, linter, hook, or CI check — propose the check instead
Aspirational state | Describe what is; intent belongs in specs
Rules repeating across their projects, or personal rather than the team's, belong in their global agent config.
<!-- vpmodule:atom:end exclude-what-the-repository-already-states -->
<!-- vpmodule:atom:begin keep-the-line-until-the-check-is-live -->
---
instruction_id: keep-the-line-until-the-check-is-live
title: Keep the line until the check is live
summary: "Offer the check that enforces the rule better than prose, keep the prose line as the fallback, and hold it until the check is in place."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: A rule could be enforced mechanically and the line is still the only thing that enforces it today.
conditions_does_not_apply_when: The rule is a judgement call that no check can decide.
artifact_contract_output_type: automation-offer
artifact_contract_required_data:
  - the check that would enforce it
  - the fallback line
  - the state of the check
artifact_contract_verified_by: the line is still present while the check is not yet in place
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-project-context/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/contributing/adding-a-portability-rule.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/contributing/cross-platform-portability-rules.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the line until the check is live
Ask first whether a hook, lint rule, or CI check enforces it better than prose; if so propose the check, and the line becomes the fallback if they decline.
A ledger entry marked `automate` keeps its instruction until its check is in place
- A false positive is a rule bug, fixed in the rule — never by adding an opt-out.
- Fix every violation — no ratchet, no grandfathering. Every existing + grandfathered offender is fixed in the same phase
- These rules are **hard-fail with zero escape hatches**: there is no `// windows-portability-ok:` comment and no `eslint-disable` for them
- Legitimately platform-specific code must be *structured* so the rule recognizes it (see "Platform guards" below) — not annotated around.
<!-- vpmodule:atom:end keep-the-line-until-the-check-is-live -->
<!-- vpmodule:atom:begin show-the-ledger-beside-the-replacement -->
---
instruction_id: show-the-ledger-beside-the-replacement
title: Show the ledger beside the replacement
summary: "Present the whole new block together with the fate of every existing instruction, so the proposal shows what is lost as well as what is gained."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A replacement block of instructions is about to be written to a repository.
conditions_does_not_apply_when: The block is created for the first time and nothing exists to lose.
artifact_contract_output_type: proposal-with-ledger
artifact_contract_required_data:
  - the complete block
  - the ledger
  - the decisions
  - the itemised deletions
artifact_contract_verified_by: every existing instruction appears with its decision and its reason next to the replacement
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-project-context/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Show the ledger beside the replacement
**Show the complete block before writing it**, and every child block alongside it — one approval covers the set.
**Present the settled ledger with it**: replacement text alone is an incomplete proposal, because it shows what the user gains and hides what they lose.
Every existing instruction appears with its decision and reason.
If a rewrite weakens, narrows, or drops part of a rule, treat the lost part as a deletion and list it separately.
Keep the rule itself; examples may explain it but cannot replace it.
Every relocation, automation, and deletion is itemized.
A deletion resting on none of the first three grounds is held for line-item approval — approving the block never approves it — and a declined deletion, relocation, or automation reverts to retain.
On approval, splice between the markers — the splice itself touches nothing outside them.
Text outside the markers changes only through a settled ledger entry or a proposed fix the user has seen, never as a side effect of the splice.
<!-- vpmodule:atom:end show-the-ledger-beside-the-replacement -->
<!-- vpmodule:atom:begin verify-a-command-claim-against-the-script-that-runs-it -->
---
instruction_id: verify-a-command-claim-against-the-script-that-runs-it
title: Verify a command claim against the script that runs it
summary: "Every claim about what a command does is checked by reading the target or the script that runs it, and every named file is path-checked."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - evidence-analysis
conditions_applies_when: The instructions of a repository are about to claim what a command or a file does.
conditions_does_not_apply_when: The claim is about something the current session has already observed.
artifact_contract_output_type: verified-claims
artifact_contract_required_data:
  - the claim
  - the file path checked
  - the script read
  - the verified wording
artifact_contract_verified_by: every command claim was checked against the target or the script that runs it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-project-context/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Verify a command claim against the script that runs it
Path-check every claim naming a file.
For every claim the block will make about what a command does, read the target or script that runs it and verify the claim.
Verify each command claim against the target or script that runs it.
<!-- vpmodule:atom:end verify-a-command-claim-against-the-script-that-runs-it -->
<!-- vpmodule:atom:begin verify-that-a-nested-instruction-file-is-loaded -->
---
instruction_id: verify-that-a-nested-instruction-file-is-loaded
title: Verify that a nested instruction file is loaded
summary: "Check in every harness in use that the nested file is really loaded; where it is not, keep the rules at the root as path-qualified lines."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - verified-loading
conditions_applies_when: Rules are about to be moved into a nested file that sits inside the repository.
conditions_does_not_apply_when: All rules stay in the root block.
artifact_contract_output_type: nested-instruction-decision
artifact_contract_required_data:
  - the nested file
  - the harness check
  - the rules that stay at the root
  - the path-qualified lines
artifact_contract_verified_by: the loading was checked in every harness in use before the nested file was relied on
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-project-context/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-project-context/references/best-practices.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Verify that a nested instruction file is loaded
A component, nested repository, or extracted rules file gets its own file under the same shape when work keeps landing there and every condition holds:
its rules are subtree-exclusive, they are substantial (a handful of rules is not a file), the split materially reduces the parent block, the loading mechanism is verified for every harness in use — checked, never assumed — and the user approves the split.
Even with verified loading, keep a rule at the root when it must apply before a session enters that directory or when breaking it can affect work outside the child.
Otherwise the rules stay in the parent block as path-qualified lines ("in `src/importer/`: ..."), which cost less than a file nobody loads.
Check, never assume: several harnesses build the instruction chain once at session start, root down to the working directory, so a nested file is invisible to the session that later edits into that subtree.
Unverified means path-qualified lines at root instead
Use a linked file only when the trigger is not a path.
<!-- vpmodule:atom:end verify-that-a-nested-instruction-file-is-loaded -->