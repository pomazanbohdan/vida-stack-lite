---
instruction_id: assign-locator-analyzer-historian-and-verifier-roles
title: "Assign the locator, analyzer, historian and verifier roles"
summary: "Locators search by area first, analyzers answer from what the locators found, historians follow the cited lines, and verifiers re-check the claims."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A research run over a repository is about to be staffed.
conditions_does_not_apply_when: One reader does the whole repository alone.
artifact_contract_output_type: research-role-assignment
artifact_contract_required_data:
  - the role of each worker
  - the order the roles run in
  - the boundary between them
artifact_contract_verified_by: each worker got one role and the boundaries between them were respected
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase-analyzer.md
status: active
revision: 1
---

# Assign the locator, analyzer, historian and verifier roles
Locators (search only, one per area of the repository’s layout, run first over all the questions) find where the code lives; an analyzer answers each question from it; a historian follows a `why` question’s cited lines through git history, and dates two patterns an analyzer found doing the same thing, nothing else; verifiers re-check claims.
- History (log, blame, pull requests) is the historian’s.
- You read code and do not run it.
