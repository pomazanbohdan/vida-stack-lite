---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-references-codebase-analyzer-md-3f2db05a-c01"
title: "bmad-method: skills/bmad-deep-recon/references/codebase-analyzer.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-deep-recon/references/codebase-analyzer.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/references/codebase-analyzer.md\"}"
atom_ids:
  - assign-locator-analyzer-historian-and-verifier-roles
  - mark-the-load-bearing-claims-and-report-the-null-result
  - pin-the-commit-so-the-research-reads-a-fixed-state
  - treat-a-plan-document-as-not-evidence
atom_count: 4
atoms: "[{\"atom_id\":\"assign-locator-analyzer-historian-and-verifier-roles\",\"file_sha256\":\"66fbddbe1d489208231b5d3308db759b024042501080331c30c9d6de6f05e358\",\"content_sha256\":\"492fff9d9e67d0a11f22c3d2bec53131efcba9880eea8e4d21895aa6fd123926\",\"file_bytes\":1836,\"body_bytes\":504},{\"atom_id\":\"mark-the-load-bearing-claims-and-report-the-null-result\",\"file_sha256\":\"c28c1156024c40d3136ac42ad04016dee2a8300f18fcd227199848516dca8210\",\"content_sha256\":\"0a4f669fbc5fcf59c08eaccada1df9159cf95d78c476e348d9740581047e7688\",\"file_bytes\":1712,\"body_bytes\":344},{\"atom_id\":\"pin-the-commit-so-the-research-reads-a-fixed-state\",\"file_sha256\":\"1206259410079697704344760c93e0474e996be486b098ce0959d72622e2f9a1\",\"content_sha256\":\"d12c7cce25336d605e7ca4ea7ab835d51f354b1bdc66619ec34fd5e2bafb4f9a\",\"file_bytes\":1714,\"body_bytes\":415},{\"atom_id\":\"treat-a-plan-document-as-not-evidence\",\"file_sha256\":\"b295aab400632575e993cc06d5975b9690c89f09469a944a03206434dde6df52\",\"content_sha256\":\"47bc50bf1bd9d9d066f97b4b2997ab77ffb356b93dcde50a188831c4f4200aa3\",\"file_bytes\":1497,\"body_bytes\":293}]"
carrier_sha256: 5852dddeba3d75378e5c07f2bfc48e3c6e8ac31d354d9640ec8ee354550830e6
carrier_bytes: 7378
revision: 1
status: active
---
<!-- vpmodule:atom:begin assign-locator-analyzer-historian-and-verifier-roles -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase-analyzer.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Assign the locator, analyzer, historian and verifier roles
Locators (search only, one per area of the repository’s layout, run first over all the questions) find where the code lives; an analyzer answers each question from it; a historian follows a `why` question’s cited lines through git history, and dates two patterns an analyzer found doing the same thing, nothing else; verifiers re-check claims.
- History (log, blame, pull requests) is the historian’s.
- You read code and do not run it.
<!-- vpmodule:atom:end assign-locator-analyzer-historian-and-verifier-roles -->
<!-- vpmodule:atom:begin mark-the-load-bearing-claims-and-report-the-null-result -->
---
instruction_id: mark-the-load-bearing-claims-and-report-the-null-result
title: Mark the load-bearing claims and report the null result
summary: "The claims the answer rests on are marked load-bearing for the verifiers, both patterns that do the same thing are reported unranked, and what was searched for and not found is reported too."
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: A digest is being written from a search.
conditions_does_not_apply_when: The search found the answer immediately and nothing was looked for.
artifact_contract_output_type: search-digest
artifact_contract_required_data:
  - the load-bearing claims
  - both patterns doing the same thing
  - what was searched for and not found
artifact_contract_verified_by: the load-bearing claims are marked and the empty searches are reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase-analyzer.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase-locator.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Mark the load-bearing claims and report the null result
- the few the answer rests on marked load-bearing, since verifiers re-check each of those
- two patterns that do the same thing both reported, unranked
- then what you looked for and did not find, as the search and the commit.
- a directory full of matches as a count and one cited hit
<!-- vpmodule:atom:end mark-the-load-bearing-claims-and-report-the-null-result -->
<!-- vpmodule:atom:begin pin-the-commit-so-the-research-reads-a-fixed-state -->
---
instruction_id: pin-the-commit-so-the-research-reads-a-fixed-state
title: Pin the commit so the research reads a fixed state
summary: "The research reads one recorded commit through git, never the working tree, so a dirty tree stays invisible to it and every citation holds."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A research run over a repository is about to be set up.
conditions_does_not_apply_when: The repository has no version control to read from.
artifact_contract_output_type: pinned-commit
artifact_contract_required_data:
  - the full and short commit
  - the branch
  - the command form used to read the code
artifact_contract_verified_by: every citation was taken at the pinned commit and none came from the working tree
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase-analyzer.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Pin the commit so the research reads a fixed state
- the repository and commit, which the research reads alone, so a dirty tree is invisible to it
Before the gate: the repository is the session’s git top level unless the ask names another; record its full and short commit and its branch.
- Read through git at the commit, never your harness’s file or search tools or `git status`, which see the working tree
<!-- vpmodule:atom:end pin-the-commit-so-the-research-reads-a-fixed-state -->
<!-- vpmodule:atom:begin treat-a-plan-document-as-not-evidence -->
---
instruction_id: treat-a-plan-document-as-not-evidence
title: Treat a plan document as not evidence
summary: A document that plans a change still to be made is not evidence; the code’s own documentation and instructions are.
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: Evidence for a claim about how the code works is being gathered.
conditions_does_not_apply_when: The evidence is the code’s own documentation.
artifact_contract_output_type: evidence-eligibility
artifact_contract_required_data:
  - the source used
  - the reason it counts
artifact_contract_verified_by: no claim rests on a document that plans a change still to be made
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase-analyzer.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase-locator.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Treat a plan document as not evidence
- A document that plans a change still to be made (a spec, story or ticket) is not evidence; the code’s own documentation and instructions are.
- A `where` question may be answered from your digest alone, so a bare path is a claim without a citation.
<!-- vpmodule:atom:end treat-a-plan-document-as-not-evidence -->