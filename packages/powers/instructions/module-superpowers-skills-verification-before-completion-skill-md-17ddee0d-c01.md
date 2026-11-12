---
schema: VPInstructionModule/v1
instruction_id: "module-superpowers-skills-verification-before-completion-skill-md-17ddee0d-c01"
title: "superpowers: skills/verification-before-completion/SKILL.md module"
summary: "Carrier for 2 atomic instructions from superpowers:skills/verification-before-completion/SKILL.md."
source: "{\"donor\":\"superpowers\",\"path\":\"skills/verification-before-completion/SKILL.md\"}"
atom_ids:
  - prove-regression-test-detects-bug
  - verify-before-completion
atom_count: 2
atoms: "[{\"atom_id\":\"prove-regression-test-detects-bug\",\"file_sha256\":\"7725c6970c0466338ff07aad0ca69ad6e4e59cd2b3d532b57c67e9c3e140189b\",\"content_sha256\":\"fb0a4df2f05f5a521160db17cf6e6f009a0389b8fe8dcc0d8615624893dfcd01\",\"file_bytes\":1718,\"body_bytes\":633},{\"atom_id\":\"verify-before-completion\",\"file_sha256\":\"e90ab0bf440a650df94e265b0cbf70b6ed885bd9c78bb72185eee9eb09a9a857\",\"content_sha256\":\"8a2b411994a9e3ba7a2e235909f8b88e912a62eb19148a2e010cc883f360a251\",\"file_bytes\":3288,\"body_bytes\":1984}]"
carrier_sha256: 09be011ae2d3d55cb5f0628978d42be1da4148947cbe6758f7764009aeada0c6
carrier_bytes: 5235
revision: 1
status: active
---
<!-- vpmodule:atom:begin prove-regression-test-detects-bug -->
---
instruction_id: prove-regression-test-detects-bug
title: Prove the regression test catches the bug
summary: "Reproduce the bug with a test, confirm it fails without the fix and passes with it, and restore the fix before reporting."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: You add a test that must protect against the bug returning.
conditions_does_not_apply_when: The test checks new behavior with no prior failure.
artifact_contract_output_type: regression-proof
artifact_contract_required_data:
  - test
  - run with the fix
  - run without the fix
  - restoration
artifact_contract_verified_by: the reverse run fails without the fix and passes with it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/verification-before-completion/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Prove the regression test catches the bug
Write a failing test that reproduces the bug.
Follow the TDD cycle.
The test proves the fix and prevents regression.
Never fix bugs without a test.
Regression test: write, run, and confirm it passes.
Revert the fix.
Run the test; it must fail.
Restore the fix.
Run the test; it must pass.
"I've written a regression test" without red-green verification is not proof.
A test that passes once proves nothing.
Manual testing is ad-hoc: no record of what you covered, no way to re-run it when the code changes.
Automated tests run the same way every time.
Report the actual state of each run.
<!-- vpmodule:atom:end prove-regression-test-detects-bug -->
<!-- vpmodule:atom:begin verify-before-completion -->
---
instruction_id: verify-before-completion
title: Verify before completion
summary: "Support every claim of readiness with a fresh result from the check that proves it, and inspect the real artifact rather than a proxy."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
  - verification-rerun-policy
conditions_applies_when: "You are about to call work complete, fixed, or verified."
conditions_does_not_apply_when: You only describe a future check and make no claim about its result.
artifact_contract_output_type: verification-report
artifact_contract_required_data:
  - claim being verified
  - check performed
  - actual result
artifact_contract_verified_by: the named check runs on the current state and its output supports the claim
compatibility_excludes:
  - run-each-check-only-when-the-code-changed
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/verification-before-completion/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-prove-it-works/SKILL.md
status: active
revision: 8
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Verify before completion
Evidence before claims, always.
Violating the letter of this rule is violating the spirit of this rule.
The iron law: no completion claims without fresh verification evidence.
If you have not run the verification command in this message, you cannot claim it passes.
Identify what command proves the claim. Run the full command, fresh and complete. Read the full output, check the exit code, and count failures. Verify whether the output confirms the claim. Only then make the claim.
Skip any step = lying, not verifying
Tests pass requires the test command output with zero failures, not a previous run and not should pass.
A clean linter requires linter output with zero errors, not a partial check or extrapolation.
A successful build requires the build command exiting zero, not a passing linter and logs that look good.
A fixed bug requires the original symptom to pass, not changed code and an assumption.
A working regression test requires the red-green cycle verified, not a test that passed once.
A completed agent task requires the version-control diff showing the changes, not the agent reporting success.
Requirements met requires a line-by-line checklist, not tests passing.
Red flags: using should, probably, or seems to, expressing satisfaction before verification, committing or pushing without verification, trusting an agent's success report, relying on partial verification, and thinking just this once.
ANY wording that implies success without having run verification is the failure this rule exists to prevent.
Verify every claim against the real artifact directly. Do not infer from proxies, self-reports, or it compiles.
Check process liveness directly, read the actual value rather than a cached representation, and when verification fails, suspect the observation method before the system.
The strongest proof is a deterministic script that reruns the same comparison, with output a reviewer can rerun instead of trusting your word.
<!-- vpmodule:atom:end verify-before-completion -->