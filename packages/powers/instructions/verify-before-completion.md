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
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/verification-before-completion/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-prove-it-works/SKILL.md
status: active
revision: 4
---

# Verify before completion
Evidence before claims, always.
Violating the letter of this rule is violating the spirit of this rule.
The iron law: no completion claims without fresh verification evidence.
If you have not run the verification command in this message, you cannot claim it passes.
Identify what command proves the claim. Run the full command, fresh and complete. Read the full output, check the exit code, and count failures. Verify whether the output confirms the claim. Only then make the claim.
Skip any step and you are not verifying.
Tests pass requires the test command output with zero failures, not a previous run and not should pass.
A clean linter requires linter output with zero errors, not a partial check or extrapolation.
A successful build requires the build command exiting zero, not a passing linter and logs that look good.
A fixed bug requires the original symptom to pass, not changed code and an assumption.
A working regression test requires the red-green cycle verified, not a test that passed once.
A completed agent task requires the version-control diff showing the changes, not the agent reporting success.
Requirements met requires a line-by-line checklist, not tests passing.
Red flags: using should, probably, or seems to, expressing satisfaction before verification, committing or pushing without verification, trusting an agent's success report, relying on partial verification, and thinking just this once.
Any wording that implies success without having run verification is the failure this rule exists to prevent.
Verify every claim against the real artifact directly. Do not infer from proxies, self-reports, or it compiles.
Check process liveness directly, read the actual value rather than a cached representation, and when verification fails, suspect the observation method before the system.
The strongest proof is a deterministic script that reruns the same comparison, with output a reviewer can rerun instead of trusting your word.
