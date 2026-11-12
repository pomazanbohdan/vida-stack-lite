---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-testing-standards-md-486629a4-c01"
title: "gsd-core: TESTING-STANDARDS.md module"
summary: "Carrier for 6 atomic instructions from gsd-core:TESTING-STANDARDS.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"TESTING-STANDARDS.md\"}"
atom_ids:
  - add-a-property-test-for-a-parsing-or-transformation-module
  - assert-only-what-the-subject-could-change
  - assert-the-degraded-verdict-not-just-that-it-did-not-throw
  - name-every-timeout-in-a-shared-constant
  - never-assert-on-elapsed-wall-clock-time
  - test-concurrency-through-a-controlled-clock
atom_count: 6
atoms: "[{\"atom_id\":\"add-a-property-test-for-a-parsing-or-transformation-module\",\"file_sha256\":\"7bd18e3f0dc888bdb232159d65caf998df38e5bdce85a7a0f73075a988e14ca6\",\"content_sha256\":\"6656a1ee3d26aefe3106ce267191ac7faf7d546dbc16843541a8f0771a786a46\",\"file_bytes\":1559,\"body_bytes\":422},{\"atom_id\":\"assert-only-what-the-subject-could-change\",\"file_sha256\":\"ecf02943f666d81ae3508b3a22f6c11e8cdbea26017530281f1ea0407ee79576\",\"content_sha256\":\"55128ba1d020399547de8acd948d29740ccb39e66dc3c3ee759c6f7f01169d1d\",\"file_bytes\":1516,\"body_bytes\":487},{\"atom_id\":\"assert-the-degraded-verdict-not-just-that-it-did-not-throw\",\"file_sha256\":\"3881753207739058903f3da137253987c9ec0c41246489f4b8be83a48c7d8b29\",\"content_sha256\":\"d01f3756387a87a294939e7a25761f6b587f3edc854a5cbdb0a3da02e8c53e91\",\"file_bytes\":2712,\"body_bytes\":1492},{\"atom_id\":\"name-every-timeout-in-a-shared-constant\",\"file_sha256\":\"2b8907fd84adebbdeb2fb619698e85aed2000c70184ec938aea4ed07d4f06f54\",\"content_sha256\":\"e7ed8877797a70c24fb4f75b4448a4a5c0c7d54dffc61445f8f5e68166bf8403\",\"file_bytes\":1778,\"body_bytes\":674},{\"atom_id\":\"never-assert-on-elapsed-wall-clock-time\",\"file_sha256\":\"75fa788b562775384e65a310940d12b57122488054a98c0da133ed904307581c\",\"content_sha256\":\"ac8f87de76fa67c9656d145782137cf6e8708e17158d79ca719383504de2a42d\",\"file_bytes\":1410,\"body_bytes\":295},{\"atom_id\":\"test-concurrency-through-a-controlled-clock\",\"file_sha256\":\"b0406998bc8b2a9d58870ea1d739dcf064fd466ebe6afd3b2f52b817da15c4a2\",\"content_sha256\":\"12093d149cb597172bbc0f7b934b907ea5d3c920d2f49102905db519775d8698\",\"file_bytes\":2179,\"body_bytes\":851}]"
carrier_sha256: f7765ca253bbc770daae0d8180346196f674b7c52a159be56e61a19558536691
carrier_bytes: 12057
revision: 1
status: active
---
<!-- vpmodule:atom:begin add-a-property-test-for-a-parsing-or-transformation-module -->
---
instruction_id: add-a-property-test-for-a-parsing-or-transformation-module
title: Add a property test for a parsing or transformation module
summary: "A module that parses, transforms or bounds a value carries at least one property test asserting a domain invariant."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: "A module implements parsing, transformation, budget or limit logic, or a bijective contract."
conditions_does_not_apply_when: The module has no input domain to generate values from.
artifact_contract_output_type: property-test
artifact_contract_required_data:
  - the domain invariant asserted
  - the generated input domain
artifact_contract_verified_by: the module carries a property test that asserts a named invariant over generated inputs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=TESTING-STANDARDS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Add a property test for a parsing or transformation module
Modules that implement parsing, transformation, budget/limit logic, or any bijective contract
must include at least one
property test asserting a domain invariant.
Invariant categories to consider: round-trip, monotonicity, boundary containment, idempotency.
Property tests are the mechanism that drives mutation score above the threshold on logic-heavy paths.
<!-- vpmodule:atom:end add-a-property-test-for-a-parsing-or-transformation-module -->
<!-- vpmodule:atom:begin assert-only-what-the-subject-could-change -->
---
instruction_id: assert-only-what-the-subject-could-change
title: Assert only what the subject could change
summary: An assertion counts only when the subject could make it fail; an always-truthy left-hand side adds no coverage.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: An assertion is written or reviewed.
conditions_does_not_apply_when: "The check has no assertion, only a count or a threshold."
artifact_contract_output_type: assertion-review
artifact_contract_required_data:
  - the asserted value
  - the plausible defect that would make the assertion fail
artifact_contract_verified_by: a mutation of the subject could change the asserted value
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=TESTING-STANDARDS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Assert only what the subject could change
Assertions must be capable of failing given a plausible defect in the SUT.
An assertion whose left-hand side is always truthy regardless of SUT behavior does not add coverage.
Non-compliant:
assert(true);
assert.ok(output !== undefined); // output is unconditionally set above
Compliant: Assert on a value that the SUT computed and that a mutation of the SUT could change.
No automated rule covers all shapes; code review is the primary gate.
<!-- vpmodule:atom:end assert-only-what-the-subject-could-change -->
<!-- vpmodule:atom:begin assert-the-degraded-verdict-not-just-that-it-did-not-throw -->
---
instruction_id: assert-the-degraded-verdict-not-just-that-it-did-not-throw
title: "Assert the degraded verdict, not just that it did not throw"
summary: "A test of a fallback branch asserts the specific degraded verdict the branch produces, not merely that the call survived."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: "The code under test has an error, fallback or degradation branch and a test covers that branch."
conditions_does_not_apply_when: "The branch re-throws, or already returns a structured error signal the test asserts on directly."
artifact_contract_output_type: degraded-verdict-assertion
artifact_contract_required_data:
  - the degraded verdict the branch produces
  - the asserted fields of that verdict
artifact_contract_verified_by: the test fails when the branch degrades to a different shape than the one asserted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=TESTING-STANDARDS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Assert the degraded verdict, not just that it did not throw
If a function has an error or fallback branch — a guard that degrades permissively on bad input, a resolver that falls back to a default root, a lock that expires — the test for that branch must assert the **specific degraded verdict** the branch produces, not merely that the call completed without throwing or returned *some* value of the right type.
A test can already satisfy "feed the SUT a hostile input" while still failing this one, if it never checks *what the SUT did in response*.
This is not the same requirement as the input-rejection rule above it.
Two shapes are explicitly out of scope for this rule — they are not fail-open guards and adding this counter-test to them would be noise, not signal:
- A branch that re-throws or propagates the error rather than producing a degraded verdict
- A branch that returns a documented, structured error signal that the test already asserts on directly (a three-state policy that fails closed on malformed input, a dispatch convention, an `{isError: true}` return shape) — the structured field *is* the verdict; asserting on it already satisfies this rule.
The permissive-verdict shape is module-specific, not mechanically enumerable, so a lint rule here would be both incomplete and noisy.
This is a code-review expectation, not a CI gate — it will not fail a build on its own;
it fails when a reviewer lets a "did not throw" test stand in for a correctness test.
<!-- vpmodule:atom:end assert-the-degraded-verdict-not-just-that-it-did-not-throw -->
<!-- vpmodule:atom:begin name-every-timeout-in-a-shared-constant -->
---
instruction_id: name-every-timeout-in-a-shared-constant
title: Name every timeout in a shared constant
summary: "A bare numeric timeout at a call site is replaced by a named constant, so two copies of the same timeout cannot drift or collide."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A call site passes a numeric timeout or timeout option.
conditions_does_not_apply_when: The value comes from a named constant or from a configuration entry.
artifact_contract_output_type: timeout-constant
artifact_contract_required_data:
  - the named constant
  - the class of work the timeout covers
  - the reason a local constant is a distinct class
artifact_contract_verified_by: no call site passes a bare numeric timeout literal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=TESTING-STANDARDS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name every timeout in a shared constant
Do not write a bare numeric `timeout`/`timeoutMs` option value at a test call site.
Two independently-guessed copies of the same magic number can silently drift apart, or worse, collide exactly and produce a zero-margin race
Import an existing class-norm constant
when the call is the same class of subprocess, or declare a local one with a comment justifying why it is a distinct class
A non-literal value (an `Identifier`, `MemberExpression`, or `CallExpression`) is trusted; only a resolvable numeric literal is flagged.
There is no marker-comment escape — the fix is always to extract a named constant.
There is no allowlist.
<!-- vpmodule:atom:end name-every-timeout-in-a-shared-constant -->
<!-- vpmodule:atom:begin never-assert-on-elapsed-wall-clock-time -->
---
instruction_id: never-assert-on-elapsed-wall-clock-time
title: Never assert on elapsed wall-clock time
summary: "An assertion on elapsed wall-clock time measures the host machine, not the code under test, and fails spuriously on a loaded runner."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A test asserts on how long something took.
conditions_does_not_apply_when: The test asserts on a controlled clock the test itself advances.
artifact_contract_output_type: timing-assertion-review
artifact_contract_required_data:
  - the timing assertion that was removed or replaced
  - the controlled signal the test asserts on instead
artifact_contract_verified_by: no assertion in the suite compares a wall-clock delta or a performance timer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=TESTING-STANDARDS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never assert on elapsed wall-clock time
Do not assert on wall-clock elapsed time.
Such assertions test the host machine, not the SUT, and fail spuriously on loaded CI runners.
Non-compliant:
const start = Date.now();
await doWork();
assert(Date.now() - start < 200, 'must complete in 200ms');
<!-- vpmodule:atom:end never-assert-on-elapsed-wall-clock-time -->
<!-- vpmodule:atom:begin test-concurrency-through-a-controlled-clock -->
---
instruction_id: test-concurrency-through-a-controlled-clock
title: Test concurrency through a controlled clock
summary: "Concurrency is tested through an injectable clock seam, never through real scheduler races; a racing test is deleted once the deterministic one covers the same path."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: "The code under test decides anything on a timer, a deadline or a lock expiry."
conditions_does_not_apply_when: The code has no time-dependent branch.
artifact_contract_output_type: concurrency-test
artifact_contract_required_data:
  - the clock seam the test controls
  - the time the test sets
  - the deterministic test that replaced a racing test
artifact_contract_verified_by: the timing branch is exercised through a controlled clock and no test outcome depends on OS scheduler timing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/adr/456-test-rigor-architecture.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=TESTING-STANDARDS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Test concurrency through a controlled clock
Concurrency logic must be tested via an **injectable clock seam** backed by `node:test` `mock.timers`, not by real OS scheduler races.
Wall-clock timing in production code paths that cannot accept an injectable clock (e.g., third-party integrations) must be wrapped behind an adapter interface so tests can substitute a controlled clock.
Real multi-process race tests (where two OS processes genuinely compete for a resource) are **deleted** once the corresponding deterministic clock-seam test covers the same logical path.
They are not quarantined or skipped — deleted.
A deleted racing test must be replaced by a deterministic seam test in the same commit.
Real OS scheduler races are non-deterministic on loaded CI runners and are not a permitted test pattern regardless of which mechanism applies.
<!-- vpmodule:atom:end test-concurrency-through-a-controlled-clock -->