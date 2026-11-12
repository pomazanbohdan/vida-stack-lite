---
schema: VPInstructionModule/v1
instruction_id: "module-matt-skills-skills-engineering-tdd-mocking-md-3463c50d-c01"
title: "matt-skills: skills/engineering/tdd/mocking.md module"
summary: "Carrier for 2 atomic instructions from matt-skills:skills/engineering/tdd/mocking.md."
source: "{\"donor\":\"matt-skills\",\"path\":\"skills/engineering/tdd/mocking.md\"}"
atom_ids:
  - design-for-mockability
  - mock-only-system-boundaries
atom_count: 2
atoms: "[{\"atom_id\":\"design-for-mockability\",\"file_sha256\":\"7983e643a97ee4a54f034b4209e6d264ef12b1aca6c041733a10383bcd8b35f3\",\"content_sha256\":\"1dd0c2786a2c6d6123bfeb765891bba1992e8fa8ae25530ccf310570778f1c0e\",\"file_bytes\":2293,\"body_bytes\":1202},{\"atom_id\":\"mock-only-system-boundaries\",\"file_sha256\":\"97e83a6a3e76fad8d846be8c6c81fb4b4a88a8d572e258950674e928c53ba8a5\",\"content_sha256\":\"78f9791fb37cffec7f43bd445b44549632c1313d944572498bebae0ebff44696\",\"file_bytes\":2244,\"body_bytes\":933}]"
carrier_sha256: 2ee858d84e6bb8261c93f4824c0639c5770e059572bb9e034fcf1e6a5ebfc4fd
carrier_bytes: 4750
revision: 1
status: active
---
<!-- vpmodule:atom:begin design-for-mockability -->
---
instruction_id: design-for-mockability
title: Design for mockability
summary: "Design interfaces that are easy to mock: inject dependencies, return results instead of side effects, and prefer specific SDK-style functions over generic fetchers."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "A module's external dependencies must be replaceable in tests."
conditions_does_not_apply_when: The module has no external dependencies.
artifact_contract_output_type: mockable-interface
artifact_contract_required_data:
  - injected dependencies
  - return values
  - specific operations
artifact_contract_verified_by: each external operation is independently mockable with no conditional logic in setup
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/tdd/mocking.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Design for mockability
At system boundaries, design interfaces that are easy to mock:
**1. Use dependency injection**
Pass external dependencies in rather than creating them internally:
```typescript
// Easy to mock
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// Hard to mock
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```
**2. Prefer SDK-style interfaces over generic fetchers**
Create specific functions for each external operation instead of one generic function with conditional logic:
```typescript
// GOOD: Each function is independently mockable
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: data }),
};

// BAD: Mocking requires conditional logic inside the mock
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```
The SDK approach means:
- Each mock returns one specific shape
- No conditional logic in test setup
- Easier to see which endpoints a test exercises
- Type safety per endpoint
<!-- vpmodule:atom:end design-for-mockability -->
<!-- vpmodule:atom:begin mock-only-system-boundaries -->
---
instruction_id: mock-only-system-boundaries
title: Mock only system boundaries
summary: "Mock at system boundaries such as external APIs, HTTP requests, databases, the file system, time and randomness; never mock your own logic, transformations or validation."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A test needs a double for a dependency.
conditions_does_not_apply_when: The dependency is your own module or an internal collaborator.
artifact_contract_output_type: mocking-decision
artifact_contract_required_data:
  - boundary
  - mock
  - real code kept
artifact_contract_verified_by: every double sits at a system boundary and no internal collaborator is mocked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/tdd/mocking.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/testing-patterns.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=TESTING-STANDARDS.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Mock only system boundaries
Mock at **system boundaries** only:
- External APIs (payment, email, etc.)
- HTTP requests
- Databases (sometimes - prefer test DB)
- Time/randomness
- File system operations (sometimes)
Don't mock:
- Your own classes/modules
- Internal collaborators
- Internal utility functions
- Business logic
- Data transformations
- Validation functions
- Pure functions
- Anything you control
Complete mocks.
When mocking a dependency, mock only the dependency — not the SUT behavior itself.
A mock that returns a hardcoded value from inside the function under test is a pass-always test in disguise.
External I/O (filesystem, network, clock) is the appropriate scope for mocking.
Business logic inside the SUT is not mocked; it is exercised.
For crash or rollback behavior, exercise the real boundary: an injected exception is not process termination, and a mocked transaction call is not a database rollback.
<!-- vpmodule:atom:end mock-only-system-boundaries -->