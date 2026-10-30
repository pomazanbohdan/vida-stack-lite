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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-project-context/SKILL.md
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
