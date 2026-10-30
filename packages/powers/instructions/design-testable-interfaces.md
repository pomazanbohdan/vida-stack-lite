---
instruction_id: design-testable-interfaces
title: Design testable interfaces
summary: "Make an interface testable by accepting dependencies instead of creating them, returning results instead of producing side effects, and keeping the surface small."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: An interface must be exercised by tests or callers.
conditions_does_not_apply_when: The interface already follows the three rules.
artifact_contract_output_type: testable-interface
artifact_contract_required_data:
  - dependencies accepted
  - returned results
  - small surface
artifact_contract_verified_by: the interface is exercised without constructing its dependencies internally
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/codebase-design/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Design testable interfaces
Good interfaces make testing natural:
1. **Accept dependencies, don't create them.**
   ```typescript
   // Testable
   function processOrder(order, paymentGateway) {}

   // Hard to test
   function processOrder(order) {
     const gateway = new StripeGateway();
   }
   ```
2. **Return results, don't produce side effects.**
   ```typescript
   // Testable
   function calculateDiscount(cart): Discount {}

   // Hard to test
   function applyDiscount(cart): void {
     cart.total -= discount;
   }
   ```
3. **Small surface area.** Fewer methods = fewer tests needed. Fewer params = simpler test setup.
