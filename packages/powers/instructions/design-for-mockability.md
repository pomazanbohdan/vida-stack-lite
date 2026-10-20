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
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/tdd/mocking.md
status: active
revision: 1
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
