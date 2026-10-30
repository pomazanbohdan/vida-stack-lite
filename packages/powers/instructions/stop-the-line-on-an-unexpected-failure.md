---
instruction_id: stop-the-line-on-an-unexpected-failure
title: Stop the line on an unexpected failure
summary: "The moment something unexpected happens, stop feature work, preserve the evidence, and resume only after the fix is verified."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: "A test, build or run turns out to be broken or to behave unexpectedly."
conditions_does_not_apply_when: Nothing unexpected has happened.
artifact_contract_output_type: stop-line-record
artifact_contract_required_data:
  - the failure
  - the preserved evidence
  - the diagnosis
  - the guard against recurrence
  - the verification that closed it
artifact_contract_verified_by: the resume happened only after a verification passed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/debugging-and-error-recovery/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-03-implement.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/release.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Stop the line on an unexpected failure

Systematic debugging with structured triage. When something breaks, stop adding features, preserve evidence, and follow a structured process to find and fix the root cause. Guessing wastes time. The triage checklist works for test failures, build errors, runtime bugs, and production incidents.

When anything unexpected happens:

```
1. STOP adding features or making changes
2. PRESERVE evidence (error output, logs, repro steps)
3. DIAGNOSE using the triage checklist
4. FIX the root cause
5. GUARD against recurrence
6. RESUME only after verification passes
```

**Don't push past a failing test or broken build to work on the next feature.** Errors compound. A bug in Step 3 that goes unfixed makes Steps 4-6 wrong.

**Red Flags**

- Skipping a failing test to work on new features
- Guessing at fixes without reproducing the bug
- Multiple unrelated changes made while debugging (contaminating the fix)

If verification fails and the failure cannot be fixed, stop with status `blocked`, blocking condition `implementation verification failed`, and include the failing command or check and reason.
Stop on any failed command or unexpected diff.
