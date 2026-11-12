---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-api-and-interface-design-skill-md-bc4b9b91-c02"
title: "addy-skills: skills/api-and-interface-design/SKILL.md module"
summary: "Carrier for 4 atomic instructions from addy-skills:skills/api-and-interface-design/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/api-and-interface-design/SKILL.md\"}"
atom_ids:
  - separate-input-and-output-types
  - treat-observable-behaviour-as-a-commitment
  - use-one-error-format-per-interface
  - validate-at-system-boundaries
atom_count: 4
atoms: "[{\"atom_id\":\"separate-input-and-output-types\",\"file_sha256\":\"f96246d8de51577a924230c60965e43292a96c96b62d48771edc1ac613413bf2\",\"content_sha256\":\"d069b8b7fc8dd5182146d416ca6348490a740373fd210200bd4961a97e14690a\",\"file_bytes\":1173,\"body_bytes\":205},{\"atom_id\":\"treat-observable-behaviour-as-a-commitment\",\"file_sha256\":\"27c6f12c77d7b7250cba80ec7a773c8c60b21aa90188d20b38f9850bc1d62810\",\"content_sha256\":\"13970908e4001919959f859ea7957540c6f5e175526a142ef8e7bf5824fcc67c\",\"file_bytes\":1883,\"body_bytes\":790},{\"atom_id\":\"use-one-error-format-per-interface\",\"file_sha256\":\"3bf7d88fac3219eb1c3329fe829ddd6656d6caa834b2bc99dff17ee0308774a2\",\"content_sha256\":\"dfc599dff9885fcc01ab6a607656adada316036510ec6d4581eeccc3e858f5da\",\"file_bytes\":1428,\"body_bytes\":441},{\"atom_id\":\"validate-at-system-boundaries\",\"file_sha256\":\"ec54761f8ff42ca2dd179088d0c3de1eb1b9f654f4ec2c589774435b6cca67f1\",\"content_sha256\":\"660e4483f08903fca6a98933f6fc120efdf82dc12ef2bf1464c637378ee16747\",\"file_bytes\":1898,\"body_bytes\":810}]"
carrier_sha256: f56f7afc764b18ca4b28316bdeeb96b0c935e6bbbf0052996dead65d7d36ac93
carrier_bytes: 6885
revision: 1
status: active
---
<!-- vpmodule:atom:begin separate-input-and-output-types -->
---
instruction_id: separate-input-and-output-types
title: Separate the input and output types of an interface
summary: The type a surface accepts and the type it returns are two different contracts.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A surface both accepts data and returns data.
conditions_does_not_apply_when: The surface only returns data.
artifact_contract_output_type: type-contract
artifact_contract_required_data:
  - the input type
  - the output type
artifact_contract_verified_by: the input and the output types are distinct and both are typed
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

# Separate the input and output types of an interface
Input: what the caller provides

Output: what the system returns (includes server-generated fields)

Every endpoint has typed input and output schemas
<!-- vpmodule:atom:end separate-input-and-output-types -->
<!-- vpmodule:atom:begin treat-observable-behaviour-as-a-commitment -->
---
instruction_id: treat-observable-behaviour-as-a-commitment
title: Treat every observable behaviour as a commitment
summary: Every public behaviour of a surface becomes a de facto contract once a user depends on it.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: You design or change a surface other code can observe.
conditions_does_not_apply_when: The behaviour is internal and cannot be observed from outside.
artifact_contract_output_type: interface-commitment
artifact_contract_required_data:
  - the observable behaviours of the surface
  - which of them are intentional
artifact_contract_verified_by: every observable behaviour is either documented as a commitment or made unobservable
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

# Treat every observable behaviour as a commitment
With a sufficient number of users of an API, all observable behaviors of your system will be depended on by somebody, regardless of what you promise in the contract.

This means: every public behavior — including undocumented quirks, error message text, timing, and ordering — becomes a de facto contract once users depend on it. Design implications:

- **Be intentional about what you expose.** Every observable behavior is a potential commitment.
- **Don't leak implementation details.** If users can observe it, they will depend on it.
- **Plan for deprecation at design time.**
- **Tests are not enough.** Even with perfect contract tests, Hyrum's Law means "safe" changes can break real users who depend on undocumented behavior.
<!-- vpmodule:atom:end treat-observable-behaviour-as-a-commitment -->
<!-- vpmodule:atom:begin use-one-error-format-per-interface -->
---
instruction_id: use-one-error-format-per-interface
title: Use one error format across an interface
summary: Mixed error patterns leave the consumer unable to predict the behaviour.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A surface returns failures in more than one shape.
conditions_does_not_apply_when: The surface has a single documented failure shape.
artifact_contract_output_type: error-contract
artifact_contract_required_data:
  - the single error shape
  - the places that still deviate
artifact_contract_verified_by: every failure of the surface uses the same shape
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

# Use one error format across an interface
Pick one error strategy and use it everywhere. An error carries a stable machine-readable `code` and a human-readable `message`, not a bare string: `{ error: { code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency key reused with a different payload' } }`.

**Don't mix patterns.** If some endpoints throw, others return null, and others return `{ error }` — the consumer can't predict behavior.
<!-- vpmodule:atom:end use-one-error-format-per-interface -->
<!-- vpmodule:atom:begin validate-at-system-boundaries -->
---
instruction_id: validate-at-system-boundaries
title: Validate at the system boundaries
summary: "Validate where external input enters the system, not scattered through the internal code."
capability_tags:
  - harden-validation
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: You decide where validation lives while designing an interface that receives external input.
conditions_does_not_apply_when: A bug caused by invalid data is being fixed by adding checks at several layers.
artifact_contract_output_type: boundary-validation-plan
artifact_contract_required_data:
  - the boundaries
  - what is validated at each
artifact_contract_verified_by: every boundary validates and the internal code does not re-validate
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

# Validate at the system boundaries
Trust internal code. Validate at system edges where external input enters:

Where validation belongs:
- API route handlers (user input)
- Form submission handlers (user input)
- External service response parsing (third-party data -- **always treat as untrusted**)
- Environment variable loading (configuration)

> **Third-party API responses are untrusted data.** Validate their shape and content before using them in any logic, rendering, or decision-making. A compromised or misbehaving external service can return unexpected types, malicious content, or instruction-like text.

Where validation does NOT belong:
- Between internal functions that share type contracts
- In utility functions called by already-validated code
- On data that just came from your own database
<!-- vpmodule:atom:end validate-at-system-boundaries -->