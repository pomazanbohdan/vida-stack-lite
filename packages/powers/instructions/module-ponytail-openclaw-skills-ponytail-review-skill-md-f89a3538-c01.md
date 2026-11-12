---
schema: VPInstructionModule/v1
instruction_id: "module-ponytail-openclaw-skills-ponytail-review-skill-md-f89a3538-c01"
title: "ponytail: .openclaw/skills/ponytail-review/SKILL.md module"
summary: "Carrier for 2 atomic instructions from ponytail:.openclaw/skills/ponytail-review/SKILL.md."
source: "{\"donor\":\"ponytail\",\"path\":\".openclaw/skills/ponytail-review/SKILL.md\"}"
atom_ids:
  - keep-review-read-only
  - review-code-quality-and-tests
atom_count: 2
atoms: "[{\"atom_id\":\"keep-review-read-only\",\"file_sha256\":\"b89e72ff85376408e727e17fb26847f54b41dbef19e3cd0e1198a2fef00d0a58\",\"content_sha256\":\"7ef8c348d901af1c2848989526fe9fa47bbb6637d1a4ea15b1b8de79d594ae10\",\"file_bytes\":2531,\"body_bytes\":820},{\"atom_id\":\"review-code-quality-and-tests\",\"file_sha256\":\"fa6edc2b558c18417e8670d196272a46a60e3b4542fb8879448dfda180ef1ff2\",\"content_sha256\":\"b3ff9bd6db6a2e6e1f69290beea8056e058c59bbc78738e3bc70e551b8f9f6d9\",\"file_bytes\":1970,\"body_bytes\":599}]"
carrier_sha256: 234a63d6403c0946d98204dad2de4a57e49969b1d1d685f814d95d11b9bf9492
carrier_bytes: 4716
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-review-read-only -->
---
instruction_id: keep-review-read-only
title: Run the review and the report without changing the environment
summary: "Review the checkout read-only, do the whole review yourself, and report the findings without changing code or state."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - review-execution-policy
  - review-application-policy
  - review-fix-application-policy
conditions_applies_when: You review a change or produce a one-shot report in a checkout you do not own.
conditions_does_not_apply_when: You are the author working on the change.
artifact_contract_output_type: read-only-review
artifact_contract_required_data:
  - review scope
  - state before
  - state after
artifact_contract_verified_by: the working tree is unchanged after the review
compatibility_excludes:
  - hand-the-review-prompt-to-a-separate-session-when-no-subagent-exists
  - run-the-review-lenses-as-one-blocking-batch
  - run-the-lenses-and-fix-what-they-find
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/requesting-code-review/code-reviewer.md
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/subagent-driven-development/task-reviewer-prompt.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 8
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Run the review and the report without changing the environment
Your review is read-only on this checkout.
Do not mutate the working tree, the index, HEAD, or branch state in any way.
Use tools like `git show`, `git diff`, and `git log` to inspect history.
If you need a working copy of a different revision, check it out into a separate temporary directory.
Never move HEAD on this checkout.
Do all of this review yourself.
Never spawn a subagent to review part of the diff, and never spawn another reviewer for a second opinion.
This process already provides every review seat the work gets; a reviewer you spawn duplicates one of them at full cost, and its verdict counts for nothing.
If the diff feels too large for one pass, review it in passes yourself and say so in your report.
Lists findings, changes no code.
<!-- vpmodule:atom:end keep-review-read-only -->
<!-- vpmodule:atom:begin review-code-quality-and-tests -->
---
instruction_id: review-code-quality-and-tests
title: Review the quality of the code and the tests
summary: "Check separation of concerns, error handling, types, duplication, edge cases and tests that prove real behavior."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "The change contains code, configuration or tests."
conditions_does_not_apply_when: The change is documentation only.
artifact_contract_output_type: quality-review
artifact_contract_required_data:
  - code quality
  - error handling
  - tests
  - risks
artifact_contract_verified_by: tests exercise real behavior and edge cases
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/requesting-code-review/code-reviewer.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Review the quality of the code and the tests
Clean separation of concerns?
Proper error handling?
Type safety where applicable?
DRY without premature abstraction?
Edge cases handled?
Tests verify real behavior, not mocks?
Edge cases covered?
Integration tests where they matter?
All tests passing?
Is all planned functionality present?
Sound design decisions?
Integrates cleanly with surrounding code?
Merge near-copies that must change together.
Split the function that does several unrelated jobs by job, never by line count.
Never split into helpers that exist only to make a function shorter.
<!-- vpmodule:atom:end review-code-quality-and-tests -->