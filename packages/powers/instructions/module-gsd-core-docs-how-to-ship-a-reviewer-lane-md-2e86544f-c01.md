---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-ship-a-reviewer-lane-md-2e86544f-c01"
title: "gsd-core: docs/how-to/ship-a-reviewer-lane.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:docs/how-to/ship-a-reviewer-lane.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/ship-a-reviewer-lane.md\"}"
atom_ids:
  - bound-every-detection-probe
  - design-a-standing-egress-channel-as-a-single-consent
  - keep-review-sections-unique-so-outputs-do-not-false-merge
  - re-consent-only-when-the-executable-surface-changes
atom_count: 4
atoms: "[{\"atom_id\":\"bound-every-detection-probe\",\"file_sha256\":\"8bb820dcc71ab4c34b7855ffa1f4c2660bf7b75a7bef62099cc652003eb12094\",\"content_sha256\":\"f641a822a70553fa1f480442a1434c02f6496bacf914cbb3be87cd3230b7300f\",\"file_bytes\":1220,\"body_bytes\":255},{\"atom_id\":\"design-a-standing-egress-channel-as-a-single-consent\",\"file_sha256\":\"5c781d92ecb5591855a726179867b1c574c7b765a6f1014d88ff5e666d14e709\",\"content_sha256\":\"e214b6a32644026b47dd5f8e1b8a924cbad5518728cf242df285349c09b19018\",\"file_bytes\":1400,\"body_bytes\":318},{\"atom_id\":\"keep-review-sections-unique-so-outputs-do-not-false-merge\",\"file_sha256\":\"485b51b194200b18bdb465e84f8b3e2e4bd0913674d27879924171a4b48c224a\",\"content_sha256\":\"a6799d7a54af8b008bc751267f80d4a2247a0edaca167040b8776d6af0471a9c\",\"file_bytes\":1469,\"body_bytes\":363},{\"atom_id\":\"re-consent-only-when-the-executable-surface-changes\",\"file_sha256\":\"73b4574f47d991265e7d712a96e492ffad86f8d3268e48fd4fc050179cbaeef6\",\"content_sha256\":\"db3224084914d3f5761f705cce4fdd53edab49ae903fec0367588ac59f115159\",\"file_bytes\":1693,\"body_bytes\":463}]"
carrier_sha256: 1f898921f918b3dd3d56e40cf7ce1a92e98e82095a98c126f887a1f0fb7aea85
carrier_bytes: 6387
revision: 1
status: active
---
<!-- vpmodule:atom:begin bound-every-detection-probe -->
---
instruction_id: bound-every-detection-probe
title: Bound every detection probe
summary: "A probe without a timeout is a named defect: every detection is bounded."
capability_tags:
  - verify-work-results
pattern_tags:
  - resource-bounds
conditions_applies_when: A probe is declared to find out whether something is present.
conditions_does_not_apply_when: The check is a plain read with no probe.
artifact_contract_output_type: probe-declaration
artifact_contract_required_data:
  - the probe kind
  - the timeout it is bounded by
artifact_contract_verified_by: every probe declares a bound and no probe runs unbounded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/ship-a-reviewer-lane.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bound every detection probe
**Every probe is bounded.** An unbounded `--help | grep` probe is a named defect in this repo.
`http-reachable` requires `timeoutMs`; so does `command-capability`, the probe kind you use when a bare binary name is ambiguous.
<!-- vpmodule:atom:end bound-every-detection-probe -->
<!-- vpmodule:atom:begin design-a-standing-egress-channel-as-a-single-consent -->
---
instruction_id: design-a-standing-egress-channel-as-a-single-consent
title: Design a standing egress channel as a single consent
summary: "A channel that receives data on every run is consented once; disclosure makes it visible and revocable, not safe."
capability_tags:
  - harden-security-controls
pattern_tags:
  - control-tiering
conditions_applies_when: A component receives data from the user on every run.
conditions_does_not_apply_when: The component only reads local files.
artifact_contract_output_type: consent-disclosure
artifact_contract_required_data:
  - what the channel receives
  - the disclosure shown at install
artifact_contract_verified_by: the disclosure names what is sent and the consent covers the standing channel
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/ship-a-reviewer-lane.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Design a standing egress channel as a single consent
consent-at-install is a **weaker gate for a standing egress channel than for a hook**
A user consents once; your lane thereafter receives every plan on every review run.
Design your lane as if that single consent is the only one you will ever get, because it is.
<!-- vpmodule:atom:end design-a-standing-egress-channel-as-a-single-consent -->
<!-- vpmodule:atom:begin keep-review-sections-unique-so-outputs-do-not-false-merge -->
---
instruction_id: keep-review-sections-unique-so-outputs-do-not-false-merge
title: Keep review sections unique so outputs do not false-merge
summary: Two lanes that render under the same heading silently merge into an apparent consensus that never happened.
capability_tags:
  - review-code
pattern_tags:
  - collision-free-naming
conditions_applies_when: A new reviewer or producer is registered in a set that is already installed.
conditions_does_not_apply_when: The set has one member.
artifact_contract_output_type: output-slot-uniqueness
artifact_contract_required_data:
  - the heading or slug
  - the set it must be unique in
artifact_contract_verified_by: the heading or slug is unique across the installed set and the collision is checked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/ship-a-reviewer-lane.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep review sections unique so outputs do not false-merge
`reviewsSection` is the heading your findings render under in `REVIEWS.md`. It must be unique across every installed lane; two lanes sharing a heading would silently merge their output into apparent consensus that never happened.
The install command reports success, and your lane simply never appears.
<!-- vpmodule:atom:end keep-review-sections-unique-so-outputs-do-not-false-merge -->
<!-- vpmodule:atom:begin re-consent-only-when-the-executable-surface-changes -->
---
instruction_id: re-consent-only-when-the-executable-surface-changes
title: Re-consent only when the executable surface changes
summary: A new version re-triggers consent when the invocation surface changes and not when only a heading or a timeout changes.
capability_tags:
  - harden-security-controls
pattern_tags:
  - control-tiering
conditions_applies_when: A new version of an installed component is offered.
conditions_does_not_apply_when: The executable surface of the new version is identical.
artifact_contract_output_type: consent-decision
artifact_contract_required_data:
  - the fields that changed
  - the consent the change requires
artifact_contract_verified_by: the consent is required exactly when the invocation surface changed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/ship-a-reviewer-lane.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/version-a-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Re-consent only when the executable surface changes
Changing `binary`, `args`, `hostConfigKey`, `promptChannel`, or `handler` in a new version re-triggers consent on update. Changing `reviewsSection` or `timeoutFloorMs` does not — a cosmetic prompt is how users learn to click through.
This re-consent is required every time the surface changes, scoped to the declared executable surface of a specific version, so a changed surface is always a fresh `--yes`.
<!-- vpmodule:atom:end re-consent-only-when-the-executable-surface-changes -->