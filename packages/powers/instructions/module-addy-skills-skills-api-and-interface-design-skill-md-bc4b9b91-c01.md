---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-api-and-interface-design-skill-md-bc4b9b91-c01"
title: "addy-skills: skills/api-and-interface-design/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/api-and-interface-design/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/api-and-interface-design/SKILL.md\"}"
atom_ids:
  - avoid-verbs-in-resource-urls
  - decide-the-in-flight-duplicate
  - define-the-contract-before-the-code
  - design-for-one-version
  - honour-an-idempotency-key
  - make-illegal-states-unrepresentable
  - paginate-every-list-endpoint
  - prefer-additive-changes
atom_count: 8
atoms: "[{\"atom_id\":\"avoid-verbs-in-resource-urls\",\"file_sha256\":\"cba3c68111195e1532cbc07552a6ec21632fda0250ee2239daa44b20072eab95\",\"content_sha256\":\"1364cf556d56eb94decd94d265b2aa1b060b3058bee7465f20269ad1f8eebca5\",\"file_bytes\":1100,\"body_bytes\":226},{\"atom_id\":\"decide-the-in-flight-duplicate\",\"file_sha256\":\"4171d10a6f76e4715bf79cd840a53735d2cd1a591965ffefaae49e0b04a0159c\",\"content_sha256\":\"7c7871065f73842376d8a7a64f5db17370638f5afa27c7ddb94ce68e52bbaad5\",\"file_bytes\":2410,\"body_bytes\":1200},{\"atom_id\":\"define-the-contract-before-the-code\",\"file_sha256\":\"f481a38c97aa65708b5664e0fe52ec808d413b7e9cf71d3931efa6120e1fac5e\",\"content_sha256\":\"2f77671422869e365537a8e8f27561c86d1f78d04f8dbdd3fc9f878c761eda21\",\"file_bytes\":1160,\"body_bytes\":146},{\"atom_id\":\"design-for-one-version\",\"file_sha256\":\"685612d95c5a7db2745980834ec1b3666fab89987c7d6ae875aa1c1a3e61d615\",\"content_sha256\":\"22af9a4685a83b88715498c9000ac00425ae3466b48443345b71204dcabd0092\",\"file_bytes\":1332,\"body_bytes\":322},{\"atom_id\":\"honour-an-idempotency-key\",\"file_sha256\":\"10e84d13e7ae275858578ccfa2014d51467cb867944d148c798ebc54f1bdaff1\",\"content_sha256\":\"4e95de0bc01b6b7190f379f78d7057be7375834dc2d0d6215c4f45540a687aca\",\"file_bytes\":1908,\"body_bytes\":853},{\"atom_id\":\"make-illegal-states-unrepresentable\",\"file_sha256\":\"664414da037043bd0032a46b3dbf3862f01a186871f81aa0dfa5b44a6b40b3dd\",\"content_sha256\":\"049f2eff847430d9e9adb45e0f430816e176e04a000fc89d8beda71ade983272\",\"file_bytes\":3026,\"body_bytes\":1410},{\"atom_id\":\"paginate-every-list-endpoint\",\"file_sha256\":\"95352c691b6d5136ce8d9b89ed6236bae820b75d09e1f701d2ec85fefc5b91fc\",\"content_sha256\":\"a946746da50dd7faa5ec5993b0557534c53f84b010ac60e72e52a05096dccead\",\"file_bytes\":1341,\"body_bytes\":225},{\"atom_id\":\"prefer-additive-changes\",\"file_sha256\":\"f07cca99f316eaeea3c51baac9e2064b9c04fb18f5a2024cb504f7033827ec6d\",\"content_sha256\":\"48703f80b53c589cfe62cb9427c91145fccd08bb9b92ccfff4525861d3d40040\",\"file_bytes\":1701,\"body_bytes\":521}]"
carrier_sha256: e3de155eab567310198a91e4ad373b8ac0bc7f27562962c03b09bdba593591d0
carrier_bytes: 14893
revision: 1
status: active
---
<!-- vpmodule:atom:begin avoid-verbs-in-resource-urls -->
---
instruction_id: avoid-verbs-in-resource-urls
title: Avoid verbs in resource URLs
summary: Name the resource in the URL and let the method carry the action.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: You design the URL of a resource.
conditions_does_not_apply_when: The interface is not URL-shaped.
artifact_contract_output_type: url-contract
artifact_contract_required_data:
  - the resource name
  - the method
artifact_contract_verified_by: no URL carries a verb
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Avoid verbs in resource URLs
REST endpoints | Plural nouns, no verbs | `GET /api/tasks`, `POST /api/tasks`

Verbs in REST URLs (`/api/createTask`, `/api/getUsers`)

Naming follows consistent conventions across all endpoints
<!-- vpmodule:atom:end avoid-verbs-in-resource-urls -->
<!-- vpmodule:atom:begin decide-the-in-flight-duplicate -->
---
instruction_id: decide-the-in-flight-duplicate
title: Decide what an in-flight duplicate gets
summary: "Choose the response for a duplicate that arrives while the first request is still running, and keep the key long enough to cover the longest retry path."
capability_tags:
  - make-retries-idempotent
pattern_tags:
  - idempotent-retry-design
conditions_applies_when: A second request with the same idempotency key can arrive while the first is still running.
conditions_does_not_apply_when: The call cannot be retried and has no effect.
artifact_contract_output_type: duplicate-and-retention-contract
artifact_contract_required_data:
  - the response for an in-flight duplicate
  - the retention window
  - the unknown outcome
artifact_contract_verified_by: the duplicate response is a deliberate choice and the retention outlives the longest retry path
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Decide what an in-flight duplicate gets
**Decide what an in-flight duplicate gets.** The first request is still running when the second arrives — the common case under retry storms:

| Strategy | Response | Use when |
|---|---|---|
| Reject | `409 Conflict` | Client can retry later; simplest and safest |
| Wait | Block for the result, bounded | Caller needs it synchronously |
| Return pending | `202` + status URL | Long-running effects |

Never let the second caller through because the first "seems stuck". A stalled attempt whose fate is unknown is exactly when duplicating costs most.

**Every call has three outcomes, not two: success, failure, and _unknown_.** A timeout tells you nothing about whether the effect applied. Record the intent *before* calling out, so a crash between the call and the response leaves evidence something must resolve later — rather than a silently retried charge.

**Set retention from the longest retry chain**, not from disk cost. Keys must outlive every path that can re-deliver the same intent, including a dead-letter queue replayed a week later and any provider dispute window. A 24-hour key TTL behind a 7-day DLQ is a duplicate waiting to happen.
<!-- vpmodule:atom:end decide-the-in-flight-duplicate -->
<!-- vpmodule:atom:begin define-the-contract-before-the-code -->
---
instruction_id: define-the-contract-before-the-code
title: Define the contract before the implementation
summary: The contract is the spec; the implementation follows it.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: You are about to implement a surface other code will call.
conditions_does_not_apply_when: The change is internal to a single function.
artifact_contract_output_type: interface-contract
artifact_contract_required_data:
  - the input shape
  - the output shape
  - the error shape
artifact_contract_verified_by: the contract is written before the implementation and the implementation matches it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Define the contract before the implementation
Define the interface before implementing it. The contract is the spec — implementation follows.
<!-- vpmodule:atom:end define-the-contract-before-the-code -->
<!-- vpmodule:atom:begin design-for-one-version -->
---
instruction_id: design-for-one-version
title: Design for one version of a dependency
summary: Avoid forcing consumers to choose between multiple versions of the same dependency or API.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "You publish a surface that consumers depend on, or a shared dependency."
conditions_does_not_apply_when: Nothing outside your own code consumes the surface.
artifact_contract_output_type: versioning-decision
artifact_contract_required_data:
  - the consumers of the surface
  - the chosen way to extend it
artifact_contract_verified_by: no consumer is asked to pick a version
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Design for one version of a dependency
Avoid forcing consumers to choose between multiple versions of the same dependency or API. Diamond dependency problems arise when different consumers need different versions of the same thing. Design for a world where only one version exists at a time — extend rather than fork.
<!-- vpmodule:atom:end design-for-one-version -->
<!-- vpmodule:atom:begin honour-an-idempotency-key -->
---
instruction_id: honour-an-idempotency-key
title: Honour an idempotency key
summary: "Derive the key from the intent, claim it atomically, and guard the payload against a reused key."
capability_tags:
  - make-retries-idempotent
pattern_tags:
  - idempotent-retry-design
conditions_applies_when: A state-changing call can be retried by the client or by an intermediary.
conditions_does_not_apply_when: The call is safe to repeat by construction and has no effect.
artifact_contract_output_type: idempotency-contract
artifact_contract_required_data:
  - the key derivation
  - the atomic claim
  - the payload guard
artifact_contract_verified_by: a repeated request with the same key applies the effect once
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Honour an idempotency key
Accepting an `Idempotency-Key` is the contract. Honouring it is the implementation, and it is where the money is lost — a key the server accepts but handles carelessly is worse than no key at all, because the client now believes retrying is safe.

**Derive the key from the intent, not the attempt.** The key must be stable across retries of one intent and different across distinct intents:

The key comes from the client or the initiating event — never from the layer doing the retrying.

**Claim atomically. A check followed by an act is a race:**

The unique constraint *is* the mechanism. A store that cannot enforce uniqueness in one operation cannot back this.

**Guard the payload.** Same key with a different body is a client bug, and must fail loudly rather than serving the first response to a second request:
<!-- vpmodule:atom:end honour-an-idempotency-key -->
<!-- vpmodule:atom:begin make-illegal-states-unrepresentable -->
---
instruction_id: make-illegal-states-unrepresentable
title: Make illegal states unrepresentable
summary: "Move the rules for legal values into types and constructors, so the compiler rejects impossible states, mismatched primitives, and unhandled variants."
capability_tags:
  - make-states-unrepresentable
pattern_tags:
  - state-modeling
conditions_applies_when: An object has several interdependent fields or flags whose combinations can be impossible.
conditions_does_not_apply_when: Data arrives from an external source and is checked only at the entry boundary.
artifact_contract_output_type: constrained-type
artifact_contract_required_data:
  - list of legal states
  - type
  - single constructor
  - test that an illegal state cannot be built
artifact_contract_verified_by: "the project's type checks and a test that fails to build an illegal state"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-type-system-discipline/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/typescript-best-practices/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/typescript-best-practices/references/patterns.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Make illegal states unrepresentable
Make the compiler reject impossible states, mismatched primitives, and unhandled variants.
Prefer defining errors and special cases out of existence over proliferating handlers.
Brand semantic primitives.
An identifier for a user and an identifier for an order are strings underneath but should not be interchangeable.
Give each its own type, such as a branded intersection in TypeScript or a newtype elsewhere.
Validate once at creation, trust the type downstream.
If two arguments share a primitive type but mean different things, brand them.
Model variants with a literal discriminant so impossible combinations cannot be represented.
No optional-field bags.
Consumer gets type narrowing.
Build the shape so the illegal value cannot be constructed: a non-empty tuple for non-empty, pairs for even length, start plus duration for a range.
Not a runtime guard, not a wish for refinement types.
Keep a plain array while every operation on it stays total.
Strengthen to a non-empty type only where the loose type forces a non-null assertion, a cast, or a "should never happen" throw.
In default arms, assign the discriminant to a never-typed local so the compiler errors when a new variant is added.
Derive types from authoritative schemas instead of hand-rolling a parallel type.
Have a parse function at every boundary that turns unstructured input into the typed model.
<!-- vpmodule:atom:end make-illegal-states-unrepresentable -->
<!-- vpmodule:atom:begin paginate-every-list-endpoint -->
---
instruction_id: paginate-every-list-endpoint
title: Paginate every list endpoint
summary: "A list endpoint needs pagination from the start, not when the collection grows."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: An endpoint returns a collection that can grow.
conditions_does_not_apply_when: The collection is fixed and small by construction.
artifact_contract_output_type: pagination-contract
artifact_contract_required_data:
  - the page size
  - the cursor or page parameter
artifact_contract_verified_by: the endpoint returns a page and a way to ask for the next one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/api-and-interface-design/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Paginate every list endpoint
Paginate list endpoints:

"We don't need pagination for now" → You will the moment someone has 100+ items. Add it from the start.
every list endpoint paginates with a limit and a stable order
<!-- vpmodule:atom:end paginate-every-list-endpoint -->
<!-- vpmodule:atom:begin prefer-additive-changes -->
---
instruction_id: prefer-additive-changes
title: Prefer addition over modification of a public surface
summary: New fields are additive and optional; changing or removing an existing field breaks the consumers that depend on it.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: You change a field or an endpoint that already has consumers.
conditions_does_not_apply_when: The surface has no consumer yet.
artifact_contract_output_type: compatibility-decision
artifact_contract_required_data:
  - the change
  - whether it breaks an existing consumer
artifact_contract_verified_by: "the change is backward compatible, or a deprecation is planned"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/api-and-interface-design/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/interface-versioning-policy.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Prefer addition over modification of a public surface
Extend interfaces without breaking existing consumers:

New fields are additive and optional (backward compatible)

Breaking changes without versioning break consumers. Design for extension from the start.
- Additive changes are the default; the interface prefers growing the vocabulary over changing it.
- A breaking change is never silent — it lands behind a version bump so a host that declares the old version negotiates down and gets a warning, not a crash.
<!-- vpmodule:atom:end prefer-additive-changes -->