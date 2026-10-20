---
instruction_id: debug-systematically
title: Debug systematically
summary: "Reproduce the failure and trace it to its source before choosing a fix, and question the architecture when repeated fixes keep revealing new problems."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: "A test, build, or running system behaves unexpectedly."
conditions_does_not_apply_when: No failure or deviation from expected behavior has been found.
artifact_contract_output_type: root-cause-report
artifact_contract_required_data:
  - reproduction steps
  - root-cause evidence
  - fix verification
artifact_contract_verified_by: failure reproduction test
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/systematic-debugging/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/systematic-debugging/root-cause-tracing.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-fix-root-causes/SKILL.md
status: active
revision: 5
---

# Debug systematically
Find root cause before attempting fixes. Symptom fixes are failure.
Violating the letter of this process is violating the spirit of debugging.
No fixes without root cause investigation first. If you have not completed the investigation phase, you cannot propose fixes.
Use this for any technical issue: a test failure, a bug in production, unexpected behavior, a performance problem, a build failure, an integration issue.
Use it especially under time pressure, when one quick fix seems obvious, when you have already tried multiple fixes, when the previous fix did not work, and when you do not fully understand the issue.
Do not skip it when the issue seems simple, when you are in a hurry, or when someone wants it fixed now. Systematic is faster than thrashing.
Phase one, root cause investigation: read errors and warnings carefully, reproduce consistently, check recent changes, gather evidence at each component boundary in a multi-component system, and trace the data flow back to where the bad value originated.
Phase two, pattern analysis: find working examples, compare against a complete reference, identify every difference however small, and understand the dependencies.
Phase three, hypothesis and testing: state one hypothesis and why, test it with the smallest possible change, one variable at a time, and verify before continuing. A failed test means a new hypothesis, not more fixes on top.
When you do not know, say so. Do not pretend to know. Ask for help or research more.
Phase four, implementation: create the simplest failing test case before fixing, implement one fix for the identified cause, and verify that the original symptom is resolved and no other test broke.
Do not bundle refactoring or while I am here improvements into the fix.
If a fix does not work, count the attempts. With fewer than three, return to investigation with the new information.
With three or more failed fixes, stop and question the architecture. Each fix revealing a new problem in a different place, or requiring massive refactoring, indicates a wrong architecture, not a failed hypothesis.
When the deciding fact took a deep dig to find, propose the cheap, always-on signal that would have shown it at first look.
If investigation shows the issue is truly environmental, timing-dependent, or external, document what you investigated, implement appropriate handling, and add monitoring for the future. Most no-root-cause cases are incomplete investigation.
