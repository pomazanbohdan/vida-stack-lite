---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-security-baseline-md-5d430d2b-c01"
title: "gsd-core: docs/security/baseline.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:docs/security/baseline.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/security/baseline.md\"}"
atom_ids:
  - annotate-every-suppression-with-a-reviewable-grammar
  - keep-a-decision-trail
  - pin-every-dependency-and-verify-it-before-install
  - report-a-security-issue-through-a-private-channel
  - time-limit-every-security-exception
atom_count: 5
atoms: "[{\"atom_id\":\"annotate-every-suppression-with-a-reviewable-grammar\",\"file_sha256\":\"b1d4b36624c8324f7c4e66916668854ae1c102a63098a323737aa33424e053b3\",\"content_sha256\":\"13118ae91084a8d1ce6bf45a60b71c5de3e5b9ef59746bbc0290d3fac976e036\",\"file_bytes\":1444,\"body_bytes\":292},{\"atom_id\":\"keep-a-decision-trail\",\"file_sha256\":\"44b1845f27795186db2fe25a4a6d32694b8ce0cdb60d35cb94997c48b8081644\",\"content_sha256\":\"e94de5a817e2f8ab32e14da8a683b9f0a85b35b84f553176b894f40ec2b6fe88\",\"file_bytes\":3454,\"body_bytes\":2065},{\"atom_id\":\"pin-every-dependency-and-verify-it-before-install\",\"file_sha256\":\"7e6e6b803429bb03be1cc0bc2b75f5f9dc0e413abe2c202f08c03a8ab72cfacf\",\"content_sha256\":\"7efff3f0c494d450c185a05012404f1ab696da6563f94404ade2b1c433fe0f1c\",\"file_bytes\":1564,\"body_bytes\":376},{\"atom_id\":\"report-a-security-issue-through-a-private-channel\",\"file_sha256\":\"c4635bfb0eead29f16f6d0753ab14d3878e373dc3857cc1fb1307cd9441facf2\",\"content_sha256\":\"189ae623751c7d2552315d6bb4dfda783a6054056b9fed9db27ef499b75deb85\",\"file_bytes\":1321,\"body_bytes\":189},{\"atom_id\":\"time-limit-every-security-exception\",\"file_sha256\":\"042eaec1d311ca2fb6d6765a7d02a781324daf37ef11eee7eced6c0e01de2830\",\"content_sha256\":\"60d18f3390e63c2a0c2323e0067763ac7dd953e3e5f607f8d196d3baf74fedea\",\"file_bytes\":1260,\"body_bytes\":195}]"
carrier_sha256: 1d88cab9cb48a7458f336845a28d19de370c4f411a1131c6bcf7aa329ebcf367
carrier_bytes: 9744
revision: 1
status: active
---
<!-- vpmodule:atom:begin annotate-every-suppression-with-a-reviewable-grammar -->
---
instruction_id: annotate-every-suppression-with-a-reviewable-grammar
title: Annotate every suppression with a reviewable grammar
summary: "A suppression of a scan is allowed only with the project's own annotation and a reason; an unannotated suppression fails the build."
capability_tags:
  - harden-validation
pattern_tags:
  - bar-weakening-detection
conditions_applies_when: A scan reports a finding that is intended to be suppressed.
conditions_does_not_apply_when: The scan reports nothing that needs suppressing.
artifact_contract_output_type: annotated-suppression
artifact_contract_required_data:
  - the annotation grammar
  - the reason the exclusion carries
  - what an unannotated suppression does
artifact_contract_verified_by: every suppression carries the annotation and an unannotated one fails the build
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/security/baseline.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Annotate every suppression with a reviewable grammar
- Intentional test fixtures and false positives must be annotated with the project-standard exclusion grammar; un-annotated suppressions are not permitted.
- All exclusions must use the annotation grammar defined in the implementing PRs
<!-- vpmodule:atom:end annotate-every-suppression-with-a-reviewable-grammar -->
<!-- vpmodule:atom:begin keep-a-decision-trail -->
---
instruction_id: keep-a-decision-trail
title: Keep a decision trail
summary: "Ship a one-page rationale alongside the sketch: the problem, the caller's usage, the shape, the synthesis decision, the tradeoffs, the alternatives, and the open questions."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: "A design, a rewrite, or a long run makes choices a later reader has to reconstruct."
conditions_does_not_apply_when: The change is mechanical and its reason is visible in the diff.
artifact_contract_output_type: decision-record
artifact_contract_required_data:
  - problem
  - usage
  - shape
  - synthesis decision
  - tradeoffs
  - alternatives
  - open questions
artifact_contract_verified_by: a later reader reconstructs the choice from the record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/architect/references/rationale-template.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/09-make-it-yours.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/security/baseline.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Keep a decision trail
The prose that ships alongside the type sketch is one page.
Use sentence-case headings and no boilerplate.
Record the problem: what we're trying to do, and what about the existing system or constraints makes the shape non-obvious.
Name the constraints the design must honor, such as existing types to interoperate with, callers we can't break, and invariants that crossed our boundary, so the reader sees the same constraints you saw.
Record the usage from the caller's view before the type sketch: the README or quickstart the consumer reads, plus two or three realistic call sites in their own code.
Record the shape: data structures first, then how data flows through the signatures.
Name the load-bearing decisions.
State which invariants are encoded in types, where validation lives, and what the system deliberately does not do.
Judge interface depth explicitly: what complexity the public surface hides, what remains exposed to callers, and why the interface is no larger than needed.
Record the synthesis decision: which candidate became the base and why, what was adapted from each of the others, and what was rejected and why.
Record the tradeoffs accepted, one bullet per tradeoff, in the form we accept X in exchange for Y.
Name anything a future reader might mistake for an oversight, including things that look like premature optimization or premature simplification.
Name at least one concrete alternative shape, with one line on why it lost.
Judge each alternative on interface depth, not implementation simplicity alone.
Name the complexity it exposes to callers and the complexity it hides.
Phrase open questions and risks as questions, not assertions, so the human's answer is the resolution rather than a comment.
Name the first thing to build against the sketch in one sentence.
When the usage and the sketch diverge, reconcile the sketch to the usage, not the reverse.
The caller's experience is the spec; the types serve it.
- Issue describes: which control, why the exception is needed, proposed compensating control
<!-- vpmodule:atom:end keep-a-decision-trail -->
<!-- vpmodule:atom:begin pin-every-dependency-and-verify-it-before-install -->
---
instruction_id: pin-every-dependency-and-verify-it-before-install
title: Pin every dependency and verify it before install
summary: "Every third-party dependency is pinned through a lockfile and checked against the published checksum before it is installed, so what the pipeline installs is what was reviewed."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: Dependencies are about to be installed by a pipeline.
conditions_does_not_apply_when: The project has no dependencies.
artifact_contract_output_type: pinned-verified-install
artifact_contract_required_data:
  - the lockfile
  - the checksum verification
  - what the pipeline installs compared to what was reviewed
artifact_contract_verified_by: the dependencies were pinned and checksum-verified before the install
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/security/baseline.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Pin every dependency and verify it before install
- All third-party dependencies must be pinned via a lock file (`package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`) and verified against published checksums before install.
- Supply-chain attacks (e.g., dependency confusion, typosquatting) are mitigated by ensuring that what CI installs matches what maintainers reviewed.
<!-- vpmodule:atom:end pin-every-dependency-and-verify-it-before-install -->
<!-- vpmodule:atom:begin report-a-security-issue-through-a-private-channel -->
---
instruction_id: report-a-security-issue-through-a-private-channel
title: Report a security issue through a private channel
summary: "A vulnerability is reported through the private channel and never through a public issue, so the detail does not travel to everyone before it is fixed."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A vulnerability has been found and is about to be reported.
conditions_does_not_apply_when: There is no vulnerability to report.
artifact_contract_output_type: private-reporting
artifact_contract_required_data:
  - the private channel
  - what the report contains
  - what is not used
artifact_contract_verified_by: the report went through the private channel and no public issue was opened
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/security/baseline.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Report a security issue through a private channel
- Report security vulnerabilities via **private security advisory** on GitHub:
- Do not open public issues for security vulnerabilities.
<!-- vpmodule:atom:end report-a-security-issue-through-a-private-channel -->
<!-- vpmodule:atom:begin time-limit-every-security-exception -->
---
instruction_id: time-limit-every-security-exception
title: Time-limit every security exception
summary: "An exception from a control is granted for a bounded period, names the compensating control, and is audited again at the next review."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: An exception from a control is being requested.
conditions_does_not_apply_when: No control is in force for the area.
artifact_contract_output_type: time-limited-exception
artifact_contract_required_data:
  - the control the exception applies to
  - the compensating control
  - the limit and the next audit
artifact_contract_verified_by: "the exception is bounded, compensated and audited again"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/security/baseline.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Time-limit every security exception
- Exception is time-limited: maximum 90 days. Requester must file a renewal or close the issue.
- All active exceptions are audited at each quarterly review
<!-- vpmodule:atom:end time-limit-every-security-exception -->