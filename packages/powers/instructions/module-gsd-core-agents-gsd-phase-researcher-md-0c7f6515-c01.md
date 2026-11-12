---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-phase-researcher-md-0c7f6515-c01"
title: "gsd-core: agents/gsd-phase-researcher.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:agents/gsd-phase-researcher.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-phase-researcher.md\"}"
atom_ids:
  - a-registry-listing-is-not-proof-that-a-package-is-safe
  - an-absence-of-metadata-does-not-prove-a-constraint
  - ask-what-runtime-state-still-holds-the-old-name
  - audit-the-environment-before-the-plan-assumes-a-tool-exists
  - be-prescriptive-not-exploratory-in-the-research-output
  - map-each-capability-to-the-tier-that-owns-it
  - read-the-source-of-truth-file-before-you-quote-an-in-repo-value
  - tag-every-claim-with-the-strength-of-its-source
atom_count: 8
atoms: "[{\"atom_id\":\"a-registry-listing-is-not-proof-that-a-package-is-safe\",\"file_sha256\":\"df99c5fe5de3eaef887456dcbe157a88caffd15c85efb6205df8c8f1953690c0\",\"content_sha256\":\"d951fa4efcfd856e52525ef021d926840bc318916ac3dc5c40a0a19e315b2a16\",\"file_bytes\":1649,\"body_bytes\":539},{\"atom_id\":\"an-absence-of-metadata-does-not-prove-a-constraint\",\"file_sha256\":\"2ecc9ecec799e1d09308082e98c96a7c12034639a434922635818df606fda168\",\"content_sha256\":\"45fb1e5ed5dbee5676a1ecab62eb064d23ffa028ff032dd0d35e88652f5bf725\",\"file_bytes\":1756,\"body_bytes\":609},{\"atom_id\":\"ask-what-runtime-state-still-holds-the-old-name\",\"file_sha256\":\"5248df25bf7097d6f7b47018a5f1289da7ce518270d68c915597da1c78db3b3a\",\"content_sha256\":\"61d24f340c87eb372fe527ade6352a8fecb07484ccc9725110b5038666fd5d40\",\"file_bytes\":1731,\"body_bytes\":621},{\"atom_id\":\"audit-the-environment-before-the-plan-assumes-a-tool-exists\",\"file_sha256\":\"b8c843ab63ba0df8c1f3f7ad3c78e5e2c732903180a313ad2328e639bfadf520\",\"content_sha256\":\"9ef6549b44e4a60a3c84f8a369aaf8d9995606aaca41ccebd4aeac4a16ef1791\",\"file_bytes\":1669,\"body_bytes\":510},{\"atom_id\":\"be-prescriptive-not-exploratory-in-the-research-output\",\"file_sha256\":\"71d8f147e49f94293ac408d2393f17c690c7ce5e880bb23c5f0556b0296c1821\",\"content_sha256\":\"5b386908cffccdce41aa36f2f09e5105bd10d541d2c465ce4925bd00a744e4aa\",\"file_bytes\":1375,\"body_bytes\":298},{\"atom_id\":\"map-each-capability-to-the-tier-that-owns-it\",\"file_sha256\":\"f82124e1f965467a933c17625941eecd6826785e478cd58f165ea7dba89ccbe8\",\"content_sha256\":\"cb0dc6eddacfdc755c10fb944fc50b0632bc9656b1818edd6d44049d5fce485d\",\"file_bytes\":1377,\"body_bytes\":350},{\"atom_id\":\"read-the-source-of-truth-file-before-you-quote-an-in-repo-value\",\"file_sha256\":\"252d5e47442ab232b30879de4c13d4456c79658ef3d3bfafd6efa97a68490e42\",\"content_sha256\":\"ee0773290e65c5d2c18374db2f2d3d5d8cc0cb6de1a488d5031dfd7789f0f8f2\",\"file_bytes\":1657,\"body_bytes\":552},{\"atom_id\":\"tag-every-claim-with-the-strength-of-its-source\",\"file_sha256\":\"c07aab1ede223cb1e49bf63b49ca254d8239b0a90d2978e6e55038a0e67dd8c2\",\"content_sha256\":\"cf9b39a3804643a85c6b38b4dd4d2d38c09cb7db49dcd84e431f380747ddbdca\",\"file_bytes\":1556,\"body_bytes\":514}]"
carrier_sha256: c42da6f94acef1197f0d23b581cd318322ef47140c5abf7dd0ac900c8336a1eb
carrier_bytes: 14069
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-registry-listing-is-not-proof-that-a-package-is-safe -->
---
instruction_id: a-registry-listing-is-not-proof-that-a-package-is-safe
title: A registry listing is not proof that a package is safe
summary: "A package found in a search or in memory stays unverified until an authoritative source confirms it, whatever the registry says."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: A package is proposed for installation.
conditions_does_not_apply_when: The package was confirmed in the official documentation of the project.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the package
  - its verdict
  - its tag
artifact_contract_verified_by: the verdict follows the authoritative confirmation and not the registry lookup alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-phase-researcher.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# A registry listing is not proof that a package is safe
Registry existence alone does not confer `[VERIFIED]` status — a slopsquatted package also passes `npm view`.
A package name discovered via WebSearch, training data, or any non-authoritative source must be tagged `[ASSUMED]` regardless of whether `npm view` confirms it exists on the registry.
Packages discovered via WebSearch or training data and not yet verified must be tagged `[ASSUMED]` regardless of registry existence (a slopsquatted package also passes registry lookup).
<!-- vpmodule:atom:end a-registry-listing-is-not-proof-that-a-package-is-safe -->
<!-- vpmodule:atom:begin an-absence-of-metadata-does-not-prove-a-constraint -->
---
instruction_id: an-absence-of-metadata-does-not-prove-a-constraint
title: An absence of metadata does not prove a constraint
summary: "A project that declares nothing is silent about every version, so the silence proves nothing; only a falsification attempt settles it."
capability_tags:
  - research-primary-sources
pattern_tags:
  - empty-result-policy
conditions_applies_when: A compatibility claim rests on a declaration that is missing.
conditions_does_not_apply_when: The project states an explicit range or an upper bound.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the claim
  - the evidence
  - the falsification attempt
artifact_contract_verified_by: the claim was not upgraded on the strength of an absence and a falsification attempt was made
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-phase-researcher.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - research
---

# An absence of metadata does not prove a constraint
Absence is silence about **every** value, not a constraint on one:
a project declaring no supported versions says nothing about the version you want *and* nothing about the version you are standardizing on
speaks only about the versions it lists and stays silent on yours, so it is still a governed absence unless the project states the list is exhaustive
The only route from an absence to `[VERIFIED]` is a **positive falsification attempt**: run it against the real target and **paste the failing output**
asserting that you ran it does not earn the tag
<!-- vpmodule:atom:end an-absence-of-metadata-does-not-prove-a-constraint -->
<!-- vpmodule:atom:begin ask-what-runtime-state-still-holds-the-old-name -->
---
instruction_id: ask-what-runtime-state-still-holds-the-old-name
title: Ask what runtime state still holds the old name
summary: "After the files are renamed, the state that was already stored, registered or built still carries the old name and has to be found."
capability_tags:
  - migrate-a-data-schema
pattern_tags:
  - migration-strategy
conditions_applies_when: "A rename, a rebrand, a refactor or a migration is planned."
conditions_does_not_apply_when: Nothing is renamed and nothing moves.
artifact_contract_output_type: runtime-state-inventory
artifact_contract_required_data:
  - the categories checked
  - the items found
  - the action per item
artifact_contract_verified_by: "every category was answered, including the ones with nothing in them"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-phase-researcher.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Ask what runtime state still holds the old name
The canonical question: *After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?*
A grep audit finds files. It does NOT find runtime state.
If the answer for a category is "nothing" — say so explicitly. Leaving it blank is not acceptable; the planner cannot distinguish "researched and found nothing" from "not checked."
whether it requires a **data migration** (update existing records) vs. a **code edit** (change how new records are written). These are different tasks and must both appear in the plan.
<!-- vpmodule:atom:end ask-what-runtime-state-still-holds-the-old-name -->
<!-- vpmodule:atom:begin audit-the-environment-before-the-plan-assumes-a-tool-exists -->
---
instruction_id: audit-the-environment-before-the-plan-assumes-a-tool-exists
title: Audit the environment before the plan assumes a tool exists
summary: "Every external tool the work needs is checked on the machine, and each missing one gets a fallback or is called out as blocking."
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - project-conventions-first
conditions_applies_when: A piece of work depends on tools or services outside the project.
conditions_does_not_apply_when: "The work touches only the project's own code and configuration."
artifact_contract_output_type: environment-audit
artifact_contract_required_data:
  - the dependencies
  - their availability
  - their fallback
artifact_contract_verified_by: every dependency was probed and each missing one has a fallback or is marked blocking
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-phase-researcher.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Audit the environment before the plan assumes a tool exists
Plans that assume a tool is available without checking lead to silent failures at execution time.
Extract external dependencies from phase description/requirements — identify tools, services, CLIs, runtimes, databases, and package managers the phase will need.
Available, wrong version: Tool found but version too old → document upgrade path
Missing, blocking: Not found, no fallback → planner must address (install step, or descope feature)
<!-- vpmodule:atom:end audit-the-environment-before-the-plan-assumes-a-tool-exists -->
<!-- vpmodule:atom:begin be-prescriptive-not-exploratory-in-the-research-output -->
---
instruction_id: be-prescriptive-not-exploratory-in-the-research-output
title: "Be prescriptive, not exploratory, in the research output"
summary: "The research says what to use, not what could be used, and it never proposes building what a library already does."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: Research is written for the step that will act on it.
conditions_does_not_apply_when: The output is a survey for a reader who decides later.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the recommended stack
  - the patterns
artifact_contract_verified_by: every recommendation is written as a directive and the hand-rolled list is complete
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-phase-researcher.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Be prescriptive, not exploratory, in the research output
Be prescriptive, not exploratory. "Use X" not "Consider X or Y."
Plans use these libraries, not alternatives
Tasks NEVER build custom solutions for listed problems
Research output should account for project skill patterns and conventions.
<!-- vpmodule:atom:end be-prescriptive-not-exploratory-in-the-research-output -->
<!-- vpmodule:atom:begin map-each-capability-to-the-tier-that-owns-it -->
---
instruction_id: map-each-capability-to-the-tier-that-owns-it
title: Map each capability to the tier that owns it
summary: "Before the details are researched, every capability is assigned to the layer that owns it, so the work is not planned into the wrong layer."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A piece of work spans more than one layer.
conditions_does_not_apply_when: The work lives entirely inside one layer.
artifact_contract_output_type: responsibility-map
artifact_contract_required_data:
  - the capability
  - the owning tier
artifact_contract_verified_by: every capability has an owning tier and the rationale
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-phase-researcher.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Map each capability to the tier that owns it
Before diving into framework-specific research, map each capability in this phase to its standard architectural tier owner.
Multi-tier applications frequently have capabilities misassigned during planning
Mapping tier ownership before research prevents these misassignments from propagating into plans.
<!-- vpmodule:atom:end map-each-capability-to-the-tier-that-owns-it -->
<!-- vpmodule:atom:begin read-the-source-of-truth-file-before-you-quote-an-in-repo-value -->
---
instruction_id: read-the-source-of-truth-file-before-you-quote-an-in-repo-value
title: Read the source-of-truth file before you quote an in-repo value
summary: "A value that exists in the repository is quoted from the file that defines it, with the path, the lines and the value itself."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: "A constant, a type, an error code or a path from the repository is quoted."
conditions_does_not_apply_when: The value comes from an external document.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the value
  - the path
  - the line range
artifact_contract_verified_by: the value is quoted verbatim next to the path and the lines that define it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-phase-researcher.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Read the source-of-truth file before you quote an in-repo value
A codebase `grep` is not sufficient on its own: it confirms a string occurs, not that you read the definition.
Cite the path **and line range** (`[VERIFIED: src/types/order.ts:14-22]`), and quote the values **verbatim** in RESEARCH.md beside the claim — paraphrase is forbidden.
Every value appearing in a code example or skeleton must also appear in that verbatim quote; a value that does not is `[ASSUMED]`.
Training memory and a web search are not substitutes for reading the file
<!-- vpmodule:atom:end read-the-source-of-truth-file-before-you-quote-an-in-repo-value -->
<!-- vpmodule:atom:begin tag-every-claim-with-the-strength-of-its-source -->
---
instruction_id: tag-every-claim-with-the-strength-of-its-source
title: Tag every claim with the strength of its source
summary: "Every claim carries a tag for how it was established, and what is not established is never presented as fact."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: Research findings are written down for someone else to act on.
conditions_does_not_apply_when: The finding is a direct observation of the code.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the claim
  - its tag
  - its source
artifact_contract_verified_by: every claim carries a tag and no assumed claim reads as verified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-phase-researcher.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Tag every claim with the strength of its source
Every factual claim in RESEARCH.md must be tagged with its source:
Claims tagged `[ASSUMED]` signal to the planner and discuss-phase that the information needs user confirmation before becoming a locked decision.
Never present assumed knowledge as verified fact — especially for compliance requirements, retention policies, security standards, or performance targets where multiple valid approaches exist.
Never present LOW confidence findings as authoritative.
<!-- vpmodule:atom:end tag-every-claim-with-the-strength-of-its-source -->