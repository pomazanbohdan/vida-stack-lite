---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: release-it-deployment
title: Separate deployment from release
summary: "Deploy, verify, then route traffic; use zero-downtime deployment, feature flags, canary or blue-green, expand-contract migrations, immutable infrastructure and rollback faster than roll-forward."
capability_tags:
  - design-production-readiness
pattern_tags:
  - release-decoupling
conditions_applies_when: Planning a production deployment or schema change.
conditions_does_not_apply_when: A release with no user-facing change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Deploy and release are separate steps, rollback is faster, and migrations are backward-compatible."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/release-it/SKILL.md; sha256=747c1130a348ede99b6533de5ec75bb77fb5dd05efc8cef35f0524f7a9f87e7e; locator=skills/release-it/SKILL.md#L99-L122"
status: active
revision: 1
---

# Separate deployment from release

Decouple deployment, meaning putting code on servers, from release, meaning exposing it to users: deploy to production, verify, and only then route traffic; if something breaks, roll back the release rather than the deployment. Zero-downtime deployment is non-negotiable and may use rolling, blue-green, or canary strategies. Use feature flags to dark-launch code and enable it independently of deployment, with an emergency off switch; representative rollout enables 10%, monitors, and ramps. Keep database migrations backward-compatible because old and new code run simultaneously during deploys; use expand-contract steps such as add column, write both, backfill, and drop old. Treat infrastructure as immutable: never patch a running server; build a new image, deploy it, and destroy the old. Keep rollback faster than roll-forward; if rollback takes 30 minutes, avoid deploying. Blue-green deployment should gate traffic on health checks and smoke tests, and canary rollout should use automated rollback, representative 5% traffic with rollback if error rate exceeds 1%.
