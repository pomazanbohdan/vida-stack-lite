---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-references-verification-md-0216c54b-c01"
title: "bmad-method: skills/bmad-deep-recon/references/verification.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-deep-recon/references/verification.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/references/verification.md\"}"
atom_ids:
  - red-team-each-major-conclusion-in-a-fresh-context
  - require-an-independent-publisher
  - verify-as-material-lands-not-as-an-end-of-run-pass
atom_count: 3
atoms: "[{\"atom_id\":\"red-team-each-major-conclusion-in-a-fresh-context\",\"file_sha256\":\"6ef174072d137836c569a14f3303a5bd14968d652bd967e43878e4402f8a1bed\",\"content_sha256\":\"89388b5584b662e8d36e45c579570f9099da49754d1e46e24dd1d72ba8fa22c9\",\"file_bytes\":2007,\"body_bytes\":795},{\"atom_id\":\"require-an-independent-publisher\",\"file_sha256\":\"2dab58df6b996023fb3fdb2c39f34b90dfb752c2735d29b62b4cb2645b20a8a5\",\"content_sha256\":\"52635eefd37f284ef7242d09071c2d12d797b1307a8fffa50f413ca97524cd07\",\"file_bytes\":1568,\"body_bytes\":443},{\"atom_id\":\"verify-as-material-lands-not-as-an-end-of-run-pass\",\"file_sha256\":\"deb9be976730be894d68861053fa8aa6ea7e7354769063a46b5044a86bb06688\",\"content_sha256\":\"5d9677718eb3991d7ee3f27a571c4f99adafeeffba3ec457aeadbd3974b657f2\",\"file_bytes\":1593,\"body_bytes\":433}]"
carrier_sha256: 68f08d865a84153f1b03eb9911ddc107b857dfdf4349acd460662942cbc9ff2f
carrier_bytes: 5603
revision: 1
status: active
---
<!-- vpmodule:atom:begin red-team-each-major-conclusion-in-a-fresh-context -->
---
instruction_id: red-team-each-major-conclusion-in-a-fresh-context
title: Red-team each major conclusion in a fresh context
summary: "A fresh-context skeptic receives only the conclusion and a search budget and hunts for the strongest good-faith case that it is wrong; the result is weighed, not appended."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A major conclusion is about to be stated as final.
conditions_does_not_apply_when: No conclusion is load-bearing enough to be attacked.
artifact_contract_output_type: red-team-pass
artifact_contract_required_data:
  - the conclusions attacked
  - the disconfirming evidence found
  - how each conclusion changed
artifact_contract_verified_by: every major conclusion was attacked by a fresh context and the surviving counter-arguments are acknowledged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/verification.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Red-team each major conclusion in a fresh context
The single adversarial mechanism — no other verifier duplicates it.
- for each major conclusion, a **fresh-context** skeptic subagent — the conclusion and a search budget, no supporting evidence, no run context — hunts for disconfirming evidence: the bear case, failed attempts, contrary data, the strongest good-faith argument the conclusion is wrong.
What comes back is weighed, not appended: a conclusion that survives gets its strongest counter-argument acknowledged in the synthesis; one that doesn’t is revised before the report states it. Material findings land in a **Contrary Evidence** section with full citation discipline. Zero findings after a real search is itself reportable — say what was searched for and not found.
<!-- vpmodule:atom:end red-team-each-major-conclusion-in-a-fresh-context -->
<!-- vpmodule:atom:begin require-an-independent-publisher -->
---
instruction_id: require-an-independent-publisher
title: Require an independent publisher
summary: "A second source only counts as a check when it comes from a different publisher with different underlying data, not from a republication of the first."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A claim is about to be checked against a second source.
conditions_does_not_apply_when: Only one source exists for the claim.
artifact_contract_output_type: independent-source-check
artifact_contract_required_data:
  - the second source
  - the publisher it comes from
  - why it is independent
artifact_contract_verified_by: the second source comes from a different publisher with different underlying data
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/verification.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Require an independent publisher
**Independent** means a different publisher with different underlying data or reporting — not a syndication, quote, or republication of the first source, and not the same vendor’s marketing in two places.
An imported report counts as one publisher regardless of how many sources it cites internally; two imports from different tools agreeing is genuine confirmation, and their disagreement is a finding.
<!-- vpmodule:atom:end require-an-independent-publisher -->
<!-- vpmodule:atom:begin verify-as-material-lands-not-as-an-end-of-run-pass -->
---
instruction_id: verify-as-material-lands-not-as-an-end-of-run-pass
title: "Verify as material lands, not as an end-of-run pass"
summary: Each dimension is checked in fresh-context verifiers the moment its material arrives; a rewrite pass at the end of the run degrades what it touches.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: Material for a dimension has just landed.
conditions_does_not_apply_when: The material is still being gathered and nothing is ready to check.
artifact_contract_output_type: landing-time-verification
artifact_contract_required_data:
  - the dimension checked
  - the checks run at landing
artifact_contract_verified_by: every dimension was checked at landing and no end-of-run rewrite pass was used
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/verification.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Verify as material lands, not as an end-of-run pass
The trust layer — the same rules whatever produced the material (a native run’s digests or a processed import). Verification happens **as material lands**, per dimension, in fresh-context verifier subagents reading digest files — never as an end-of-run rewrite pass over an hour of accumulated context.
Late-pass rewrites degrade reports; landing-time checks improve them.
<!-- vpmodule:atom:end verify-as-material-lands-not-as-an-end-of-run-pass -->