---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmod-method-help-preparing-a-repo-for-agents-md-7580015f-c01"
title: "bmad-method: skills/bmod-method/help/preparing-a-repo-for-agents.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmod-method/help/preparing-a-repo-for-agents.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmod-method/help/preparing-a-repo-for-agents.md\"}"
atom_ids:
  - agents-copy-the-patterns-they-find
  - keep-codebase-documentation-small
  - schedule-a-refactoring-pass
atom_count: 3
atoms: "[{\"atom_id\":\"agents-copy-the-patterns-they-find\",\"file_sha256\":\"8049c14550d46a963001fbef0b821945e81abd493530094b42cd529794e3ac93\",\"content_sha256\":\"df2b0e80c4e9db06a07e65679f1ada2f71cc6fbe84f7ce8f7c34faa7e73fbf07\",\"file_bytes\":1644,\"body_bytes\":453},{\"atom_id\":\"keep-codebase-documentation-small\",\"file_sha256\":\"c544c3024c692dbbd418ab0e06f6ff7bf7ab102cf391c724785a04171bea4488\",\"content_sha256\":\"edec0938428ee924b6912b5e49e1ea67df6b8b641a4697e1f65b6cc0e7606108\",\"file_bytes\":1798,\"body_bytes\":627},{\"atom_id\":\"schedule-a-refactoring-pass\",\"file_sha256\":\"1627420305b21b3bff829c00da625fbcca7930f26c05999cf80bd0e0d2c2e9f9\",\"content_sha256\":\"a62fd08c1bb3dee3d8433859d62c510ea3c7bdc51e467dbfc74cea74e71df4d0\",\"file_bytes\":1604,\"body_bytes\":447}]"
carrier_sha256: ab425361eede69fabdf70e3ee7d7320957dd74895b7b5ae492ff75f229fe9f93
carrier_bytes: 5407
revision: 1
status: active
---
<!-- vpmodule:atom:begin agents-copy-the-patterns-they-find -->
---
instruction_id: agents-copy-the-patterns-they-find
title: Agents copy the patterns they find
summary: "An agent copies the patterns it finds, so a project that does the same thing several ways makes every session inconsistent; clean up the inconsistency first when the quality is low."
capability_tags:
  - audit-codebase
pattern_tags:
  - project-conventions-first
conditions_applies_when: The output of one session differs from the output of the next.
conditions_does_not_apply_when: The inconsistency comes from the instruction rather than from the code.
artifact_contract_output_type: codebase-assessment
artifact_contract_required_data:
  - the patterns found more than once
  - the inconsistency to remove
artifact_contract_verified_by: the inconsistency in the repository is named as the cause of the inconsistent output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/preparing-a-repo-for-agents.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Agents copy the patterns they find
An agent copies the patterns it finds.
When the project does the same thing several different ways, the agent cannot be consistent either, and each session may pick a different way.
Clean structure. Very large files and tangled modules cost every session tokens and accuracy.
If the codebase is inconsistent or untested, some refactoring and test work first goes a long way, and it pays back in every later session.
<!-- vpmodule:atom:end agents-copy-the-patterns-they-find -->
<!-- vpmodule:atom:begin keep-codebase-documentation-small -->
---
instruction_id: keep-codebase-documentation-small
title: Keep codebase documentation small
summary: "The code is the best documentation for an agent: documents hold only what the code cannot explain, heavy documentation goes stale quickly, and the rules file points at the decision records instead of copying them."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: "A codebase's documentation is written, refreshed or cut."
conditions_does_not_apply_when: The document records a decision rather than describing the code.
artifact_contract_output_type: documentation-set
artifact_contract_required_data:
  - what the code cannot explain
  - the documents that stay
artifact_contract_verified_by: each remaining document holds something the code cannot say
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/preparing-a-repo-for-agents.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Keep codebase documentation small
The code is the best documentation for an agent.
During coding, an agent should need few documents.
Documents should hold only what the code cannot explain: why a decision was made, a constraint from outside the code, a rule that spans components.
guidance produced heavy documentation of a codebase. That is no longer suggested.
Those documents were bloated, hard to maintain, and went stale quickly.
Recommend decision records (ADRs), one per decision, only for what is needed
`AGENTS.md` should make agents aware the records exist and when to consult them, without copying their content.
<!-- vpmodule:atom:end keep-codebase-documentation-small -->
<!-- vpmodule:atom:begin schedule-a-refactoring-pass -->
---
instruction_id: schedule-a-refactoring-pass
title: Schedule a refactoring pass
summary: "After several stories, at the end of an epic and every so often otherwise, do a refactoring pass: agent-built code drifts without it, with duplication, near-copies of helpers and patterns that diverged between sessions."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: Several stories have been delivered and the code has drifted.
conditions_does_not_apply_when: The last change is still in flight.
artifact_contract_output_type: refactoring-plan
artifact_contract_required_data:
  - the moment to refactor
  - the drift found
  - the work it produces
artifact_contract_verified_by: the refactoring is its own pass with the whole changeset in view
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/preparing-a-repo-for-agents.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Schedule a refactoring pass
After several stories, at the end of an epic, and every so often otherwise, do a refactoring pass toward cleaner code.
This step is commonly skipped, and agent-built code drifts without it: duplication, near-copies of helpers, and patterns that diverged between sessions.
The end of an epic is a good moment because the whole changeset can be looked at together.
and its findings are a ready list of refactoring work
<!-- vpmodule:atom:end schedule-a-refactoring-pass -->