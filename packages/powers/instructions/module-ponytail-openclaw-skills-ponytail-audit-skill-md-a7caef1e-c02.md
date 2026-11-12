---
schema: VPInstructionModule/v1
instruction_id: "module-ponytail-openclaw-skills-ponytail-audit-skill-md-a7caef1e-c02"
title: "ponytail: .openclaw/skills/ponytail-audit/SKILL.md module"
summary: "Carrier for 5 atomic instructions from ponytail:.openclaw/skills/ponytail-audit/SKILL.md."
source: "{\"donor\":\"ponytail\",\"path\":\".openclaw/skills/ponytail-audit/SKILL.md\"}"
atom_ids:
  - separate-blocking-slowdowns
  - state-assumed-load
  - treat-declared-shortcut-as-decision
  - write-report-in-plain-language
  - write-tests-that-catch-breaks
atom_count: 5
atoms: "[{\"atom_id\":\"separate-blocking-slowdowns\",\"file_sha256\":\"f5c171d607e8a1881bcd071155d90e55961fed27a238275b597aed53863cbfb8\",\"content_sha256\":\"d386d476fafb871e95464eab3cc6dd564f9d413f9b5f5fcc8fc70fda6d06416f\",\"file_bytes\":1832,\"body_bytes\":186},{\"atom_id\":\"state-assumed-load\",\"file_sha256\":\"d71a1b70085ac1abe8267b155621933bc481f04c64496393bee0e27d5ced01f6\",\"content_sha256\":\"a560acc85e5dfa172b730e9b3d052e945231145c7f15c1bda944a2c8f4eac0bf\",\"file_bytes\":1737,\"body_bytes\":301},{\"atom_id\":\"treat-declared-shortcut-as-decision\",\"file_sha256\":\"d44551f3be7493a33c146cbb16fff8ccf232349341392a5600cab952f04730a6\",\"content_sha256\":\"1d9598ed8256692ebb03846f9057230e24c0e2ec263eb44a256a54d1d6b33772\",\"file_bytes\":2527,\"body_bytes\":571},{\"atom_id\":\"write-report-in-plain-language\",\"file_sha256\":\"4b1c3299e35d15527f6cc48d90d58d0b08faa71e38f19bc92f53527082e15704\",\"content_sha256\":\"268477c3f2cc2d056d3cda6481c9ee04cb427729084193f645aef9a3f4a5c7b2\",\"file_bytes\":2020,\"body_bytes\":427},{\"atom_id\":\"write-tests-that-catch-breaks\",\"file_sha256\":\"0ee23e62032c04fa89ec5de84904398d8ffaba27480ae74e934c99caeeefea65\",\"content_sha256\":\"6064f45f60fe60cbb6a3144ee1f70e38c38333401bae0a7191f650601e35152b\",\"file_bytes\":6606,\"body_bytes\":4099}]"
carrier_sha256: 42b819a4f32377982dbb04de98347b4d8fbae058609d93c7846ce54d4cdcd685
carrier_bytes: 15289
revision: 1
status: active
---
<!-- vpmodule:atom:begin separate-blocking-slowdowns -->
---
instruction_id: separate-blocking-slowdowns
title: Separate a real slowdown from a small optimization
summary: "Big slowdowns are problems, small wins in a hot loop are suggestions, and some software counts every millisecond."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The review or audit looks at speed.
conditions_does_not_apply_when: The software does not count milliseconds.
artifact_contract_output_type: speed-finding-classification
artifact_contract_required_data:
  - slow path
  - defect or suggestion
  - case
  - expected load
artifact_contract_verified_by: each speed finding is labeled as a defect or a suggestion
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Separate a real slowdown from a small optimization
Speed: big slowdowns are problems.
Small wins (work repeated in a hot loop) are suggestions.
Some software counts every millisecond.
<!-- vpmodule:atom:end separate-blocking-slowdowns -->
<!-- vpmodule:atom:begin state-assumed-load -->
---
instruction_id: state-assumed-load
title: State the load you assumed
summary: "Find the expected load in the repository and judge scale against it, not against an imagined peak."
capability_tags:
  - review-code
  - audit-codebase
pattern_tags:
  - code-review
  - code-audit
conditions_applies_when: A review or an audit judges whether the code holds under load.
conditions_does_not_apply_when: The change does not depend on how many users or processes run it.
artifact_contract_output_type: load-assumption
artifact_contract_required_data:
  - expected load
  - source of the assumption
  - findings that depend on it
artifact_contract_verified_by: the assumed load is stated before any scale finding
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# State the load you assumed
Find the expected load in the repo (README, deploy config): one person running a script, or many users and processes at once.
Judge scale against that, and say which load you assumed.
Start the report with the load you assumed.
A break at the expected load is a must fix.
<!-- vpmodule:atom:end state-assumed-load -->
<!-- vpmodule:atom:begin treat-declared-shortcut-as-decision -->
---
instruction_id: treat-declared-shortcut-as-decision
title: Treat a declared shortcut as a decision
summary: "A comment that names its ceiling and upgrade path is a deliberate decision, not a finding, unless the expected load already crosses it."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: You found a shortcut marked with a comment that names its limit.
conditions_does_not_apply_when: The simplification carries no marker and no named limit.
artifact_contract_output_type: shortcut-decision
artifact_contract_required_data:
  - shortcut limit
  - upgrade trigger
  - expected load
  - decision
artifact_contract_verified_by: each marked shortcut is accepted or refuted by the assumed load
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-debt/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-debt/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat a declared shortcut as a decision
Every deliberate shortcut is marked with a `shortcut:` comment naming its ceiling and upgrade path.
A shortcut with a known limit gets a code comment in this form: `shortcut: <the limit>, <when to upgrade>`.
A shortcut marked with a `shortcut:` comment that names its limit is a decision, not a finding, unless the expected load already crosses it.
Pull the ceiling and the trigger straight from the comment.
Any marker comment that names no upgrade path or trigger gets a `no-trigger` tag.
Those are the ones that silently rot.
<!-- vpmodule:atom:end treat-declared-shortcut-as-decision -->
<!-- vpmodule:atom:begin write-report-in-plain-language -->
---
instruction_id: write-report-in-plain-language
title: Write the report so a reader who never saw the code understands it
summary: "Use short sentences and everyday words, explain a technical term the first time, and open with what the change or the repo does."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A person who may not know this code will read the report.
conditions_does_not_apply_when: The report is for a reader who already knows the code.
artifact_contract_output_type: plain-language-report
artifact_contract_required_data:
  - subject description
  - findings
  - explained terms
artifact_contract_verified_by: a reader who does not know the code understands each finding
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write the report so a reader who never saw the code understands it
Very simple English: short sentences, everyday words.
Explain a technical term the first time you use it.
The reader may never have seen this code.
This is a report the user asked for, so give it in full.
Review report: start with `What this change does:` in two or three sentences.
Audit report: start with `What this repo does:` in two or three sentences.
<!-- vpmodule:atom:end write-report-in-plain-language -->
<!-- vpmodule:atom:begin write-tests-that-catch-breaks -->
---
instruction_id: write-tests-that-catch-breaks
title: Write tests that catch a specific break
summary: "Every test names the break it catches and exercises real behavior, not a mock, a proxy, or the source text."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "You write, change, or review a test or risky logic."
conditions_does_not_apply_when: "The test already names its break, checks real behavior, and survives a mutation check."
artifact_contract_output_type: honest-test
artifact_contract_required_data:
  - named break
  - independent expectation
  - real behavior checked
  - mutation check
artifact_contract_verified_by: a realistic mutation of the production code fails at least one test
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/test-driven-development/writing-good-tests.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-test-behavior-not-implementation/SKILL.md
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/tdd/SKILL.md
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/tdd/tests.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/test-driven-development/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=TESTING-STANDARDS.md
status: active
revision: 10
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write tests that catch a specific break
A test exists to catch a specific break.
Every test names the break it catches. Every test exercises the real thing.
Strict test-first development produces both naturally: a test written first and watched failing against real code has already proven it can fail, and only earns a mock when the real dependency proves slow or external.
Before writing the test body, answer what production change should make this test fail, and whether that change is a bug or a decision.
A test earns its place by catching a wrong branch, a missing side effect, a wrong argument, a boundary case, or a broken contract.
Derive expectations independently, with literals and hand-checked fixtures. An expectation computed by the code under test passes no matter what that code does.
No change detectors. If only intentional decisions can fail a test, it fires on redesign and sleeps through bugs. Test the behavior that depends on the decision.
Assert behavior, not text. Asserting that a script, instruction, or configuration contains an exact line proves only that the source is the source. Run scripts against controlled inputs and assert outputs, side effects, or exit codes.
Test your own boundary contract, not the framework's documented mechanics.
Constructors, getters, constants, and trivial forwarding earn tests only when they validate, normalize, default, derive, enforce, or cause side effects. Otherwise assert the first consumer-visible result that depends on them.
The mock earns no assertions. A mock assertion passes when the mock is present and fails when it is absent, and says nothing about the component. Assert the real component's behavior.
Learn every side effect of the real method before replacing it. Mock the slow or external operation and keep what the test depends on real.
Make doubles specific. When arguments, call counts, or ordering are part of the contract, assert them. A fake that accepts anything verifies nothing.
Mirror real data completely: all documented fields, not just the ones the test reads. Partial mocks fail silently when downstream code reads an omitted field.
Cleanup that only tests need lives in test utilities, never as a destroy method on the production class.
When mock setup outgrows the test logic, or tests break when the mock changes, switch to an integration test with real components.
Before finishing, mentally mutate the production code. At least one test should fail for each realistic mutation: a wrong constant or argument, a wrong branch handler, a missing state change, an empty return, or missing validation for zero, empty, nil, unauthorized, or malformed input.
A mutation nothing catches marks the behavior as unprotected, or the test as tautological.
Tests ship with the implementation. Trivial code and human prose earn none.
Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification: "user can checkout with valid cart" tells you exactly what capability exists, and it survives refactors because it doesn't care about internal structure.
**Implementation-coupled** tests mock internal collaborators, test private methods, or verify through a side channel (querying the database instead of using the interface). The tell: the test breaks when you refactor but behavior hasn't changed.

Use snapshots sparingly and review every change.
Exercise real code, not source or output text.
Tests call exported functions or run the CLI and parse structured output.
They do not `readFileSync` a source file and assert on its text content.
They do not assert on raw stdout/stderr strings beyond exit-code confirmation.
Test the claimed path.
The test name describes a behavior.
The test body must exercise that behavior through the implementation path, not through a mock that replaces the entire SUT.
If the test name says "acquireLock expires after TTL," the test must call `acquireLock` (not a hand-rolled stub that does nothing) and assert that a lock acquired at time T is expired at time T + TTL + 1ms.
<!-- vpmodule:atom:end write-tests-that-catch-breaks -->