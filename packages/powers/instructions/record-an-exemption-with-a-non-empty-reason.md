---
instruction_id: record-an-exemption-with-a-non-empty-reason
title: Record an exemption with a non-empty reason
summary: "An exemption waives only the one requirement it names and needs a reason that names an issue or a link, so it stays auditable."
capability_tags:
  - triage-reports
pattern_tags:
  - decision-trail
conditions_applies_when: A finding is exempted because another owner or a tracked issue covers it.
conditions_does_not_apply_when: The finding is fixed in place.
artifact_contract_output_type: exemption-record
artifact_contract_required_data:
  - the waived requirement
  - the reason the exemption holds
artifact_contract_verified_by: the exemption names a non-empty reason that points at an issue or a link
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-contract-drift-findings.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-unreachable-guard-findings.md
status: active
revision: 1
---

# Record an exemption with a non-empty reason
The annotation waives **only** the consumer requirement. The marker must still be declared *and* emitted, and it still counts for case-collision detection. A non-empty reason is required — the reason is what makes the exemption auditable rather than a silent pass.
Never use it to silence a real orphan; if no reason survives scrutiny, the marker is dead and should be deleted.
The reason must name an issue (`#123`) or an `http(s)://` URL. A free-text, empty, or whitespace-only reason reports `fail_malformed_marker` — a distinct error, so you are told which of the two problems you have.
