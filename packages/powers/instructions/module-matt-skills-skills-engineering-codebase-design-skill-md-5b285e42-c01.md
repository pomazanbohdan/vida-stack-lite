---
schema: VPInstructionModule/v1
instruction_id: "module-matt-skills-skills-engineering-codebase-design-skill-md-5b285e42-c01"
title: "matt-skills: skills/engineering/codebase-design/SKILL.md module"
summary: "Carrier for 2 atomic instructions from matt-skills:skills/engineering/codebase-design/SKILL.md."
source: "{\"donor\":\"matt-skills\",\"path\":\"skills/engineering/codebase-design/SKILL.md\"}"
atom_ids:
  - design-deep-modules
  - design-testable-interfaces
atom_count: 2
atoms: "[{\"atom_id\":\"design-deep-modules\",\"file_sha256\":\"9ae7a9cd00b3a65e2e4736324459121d3502a800325d0f2c7ebc46849265d78d\",\"content_sha256\":\"5e9f3fb7f6dd39a0f6ccaf35be7ad464c147cd04eaddbda8f95df185aefcbc4b\",\"file_bytes\":4214,\"body_bytes\":3124},{\"atom_id\":\"design-testable-interfaces\",\"file_sha256\":\"19744554816e99ef77484ad37a0272fb23b0fef13da5bc89af93ea56a9541399\",\"content_sha256\":\"ab98a3d37c5734dc53fafcad2ec3201ddba4ab6c1117e541b4b20dbb26e656e1\",\"file_bytes\":1724,\"body_bytes\":636}]"
carrier_sha256: 82c60de275da466305b572eb52d379580cf86cb913811f2989691431d7b8eefe
carrier_bytes: 6143
revision: 1
status: active
---
<!-- vpmodule:atom:begin design-deep-modules -->
---
instruction_id: design-deep-modules
title: Design deep modules
summary: "Design deep modules: a small interface over a large implementation, judged by the deletion test, the interface as the test surface, and two adapters to justify a seam."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "A module's interface is being designed or restructured."
conditions_does_not_apply_when: The module is a pass-through or has no varying seam.
artifact_contract_output_type: module-design
artifact_contract_required_data:
  - module
  - interface
  - depth
  - seam
  - adapters
artifact_contract_verified_by: the deletion test shows the module earns its keep and the interface is the test surface
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/codebase-design/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Design deep modules
Design **deep modules**: a lot of behaviour behind a small interface, placed at a clean seam, testable through that interface. Use this language and these principles wherever code is being designed or restructured. The aim is leverage for callers, locality for maintainers, and testability for everyone.
## Glossary
Use these terms exactly: don't substitute "component," "service," "API," or "boundary." Consistent language is the whole point.
**Module**: anything with an interface and an implementation. Deliberately scale-agnostic: a function, class, package, or tier-spanning slice. _Avoid_: unit, component, service.
**Interface**: everything a caller must know to use the module correctly: the type signature, but also invariants, ordering constraints, error modes, required configuration, and performance characteristics. _Avoid_: API, signature (too narrow, they refer only to the type-level surface).
**Implementation**: what's inside a module, its body of code. Distinct from **Adapter**: a thing can be a small adapter with a large implementation (a Postgres repo) or a large adapter with a small implementation (an in-memory fake). Reach for "adapter" when the seam is the topic; "implementation" otherwise.
**Depth**: leverage at the interface. The amount of behaviour a caller (or test) can exercise per unit of interface they have to learn. A module is **deep** when a large amount of behaviour sits behind a small interface, **shallow** when the interface is nearly as complex as the implementation.
**Seam** _(Michael Feathers)_: a place where you can alter behaviour without editing in that place; the *location* at which a module's interface lives. Where to put the seam is its own design decision, distinct from what goes behind it. _Avoid_: boundary (overloaded with DDD's bounded context).
**Adapter**: a concrete thing that satisfies an interface at a seam. Describes *role* (what slot it fills), not substance (what's inside).
**Leverage**: what callers get from depth. More capability per unit of interface they learn. One implementation pays back across N call sites and M tests.
**Locality**: what maintainers get from depth. Change, bugs, knowledge, and verification concentrate in one place rather than spreading across callers. Fix once, fixed everywhere.
## Principles
- **Depth is a property of the interface, not the implementation.** A deep module can be internally composed of small, mockable, swappable parts; they just aren't part of the interface. A module can have **internal seams** (private to its implementation, used by its own tests) as well as the **external seam** at its interface.
- **The deletion test.** Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test *past* the interface, the module is probably the wrong shape.
- **One adapter means a hypothetical seam. Two adapters means a real one.** Don't introduce a seam unless something actually varies across it.
<!-- vpmodule:atom:end design-deep-modules -->
<!-- vpmodule:atom:begin design-testable-interfaces -->
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
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/codebase-design/SKILL.md
status: active
revision: 3
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
<!-- vpmodule:atom:end design-testable-interfaces -->