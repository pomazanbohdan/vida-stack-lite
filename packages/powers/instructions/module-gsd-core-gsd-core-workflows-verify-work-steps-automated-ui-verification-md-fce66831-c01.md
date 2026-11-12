---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-verify-work-steps-automated-ui-verification-md-fce66831-c01"
title: "gsd-core: gsd-core/workflows/verify-work/steps/automated-ui-verification.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/verify-work/steps/automated-ui-verification.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/verify-work/steps/automated-ui-verification.md\"}"
atom_ids:
  - mark-the-clearly-matching-checkpoints-without-asking
  - tool-presence-is-not-consent-to-drive-it
atom_count: 2
atoms: "[{\"atom_id\":\"mark-the-clearly-matching-checkpoints-without-asking\",\"file_sha256\":\"c27371c945d9952c87e1bba65a31b3cfcccdafdf539806d7e7f543bc0be99a54\",\"content_sha256\":\"5947105d2c09dca5963901e8c9353c8930a912bf4a4b80c7fd990e077512fe4f\",\"file_bytes\":1856,\"body_bytes\":603},{\"atom_id\":\"tool-presence-is-not-consent-to-drive-it\",\"file_sha256\":\"c5e66c5d4d4d176fcb0cac9f69c2528246a8a74797de55696d3f8c59b4d6dc3b\",\"content_sha256\":\"2468de442fb9c85e6c9692cb7693150c8f0d237440e11b96f467575e7bfc474e\",\"file_bytes\":1625,\"body_bytes\":422}]"
carrier_sha256: ef64809f4d087398ef1d42f0f68d305737c79e298fd241a3b50c65751c3d5870
carrier_bytes: 3780
revision: 1
status: active
---
<!-- vpmodule:atom:begin mark-the-clearly-matching-checkpoints-without-asking -->
---
instruction_id: mark-the-clearly-matching-checkpoints-without-asking
title: Mark the clearly matching checkpoints without asking
summary: What matches the contract is marked without a question; only what needs taste is put to the person; a checkpoint nobody could look at is reported as such.
capability_tags:
  - verify-work-results
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A mechanical comparison can decide some of the checkpoints.
conditions_does_not_apply_when: "Every checkpoint needs the person's eye."
artifact_contract_output_type: auto-verified-checkpoints
artifact_contract_required_data:
  - the checkpoints that were marked
  - the ones queued for the person
  - the ones that could not be looked at
artifact_contract_verified_by: the clearly matching checkpoints were marked without a question and the rest were queued for the person
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work/steps/automated-ui-verification.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
---

# Mark the clearly matching checkpoints without asking
Automatically mark checkpoints as **passed** or **needs review** based on the visual comparison — no manual question required for items that clearly match.
Flag items that require human judgment (subjective aesthetics, content accuracy) and present only those as manual UAT questions.
If the browser profile is already locked (`The browser is already running for …`), report those checkpoints as **could not look**, not as **needs review**
Display summary line before proceeding:
UI checkpoints: {N} auto-verified, {M} queued for manual review
<!-- vpmodule:atom:end mark-the-clearly-matching-checkpoints-without-asking -->
<!-- vpmodule:atom:begin tool-presence-is-not-consent-to-drive-it -->
---
instruction_id: tool-presence-is-not-consent-to-drive-it
title: Tool presence is not consent to drive it
summary: "A tool that happens to be available is not a licence to use it; the operator has to have opted in, and without that the manual path stays exactly as it was."
capability_tags:
  - detect-the-run-mode
pattern_tags:
  - safe-defaults
conditions_applies_when: An external tool is present in the session and could be driven.
conditions_does_not_apply_when: The operator turned the tool on for this purpose.
artifact_contract_output_type: tool-use-decision
artifact_contract_required_data:
  - the tool that is present
  - the opt-in that is missing or present
  - the path that was taken
artifact_contract_verified_by: the tool was driven only when the operator had opted in and the manual path was unchanged otherwise
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work/steps/automated-ui-verification.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Tool presence is not consent to drive it
**Both conditions are required — tool presence alone is not sufficient.**
A project may have a Chrome-family browser MCP configured for entirely unrelated work; it must not be driven here unless the operator opted in.
This key is default-off.
If automated verification is not available, fall back to the standard manual checkpoint questions defined in this workflow unchanged.
<!-- vpmodule:atom:end tool-presence-is-not-consent-to-drive-it -->