---
instruction_id: put-static-content-near-the-user
title: Put static content near the user
summary: "Static assets are served from a CDN, the server sits close to the people who use it, and the deployment scales out with a health check."
capability_tags:
  - improve-web-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: A service is deployed or its placement is changed.
conditions_does_not_apply_when: The work deploys no service.
artifact_contract_output_type: deployment-placement-review
artifact_contract_required_data:
  - where the static assets are served from
  - where the server runs
  - the scaling setup
  - the health check
artifact_contract_verified_by: the static assets are served from a CDN and the load balancer has a health check endpoint
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/performance-checklist.md
status: active
revision: 1
---

# Put static content near the user
CDN for static assets
Server located close to users (or edge deployment)
Horizontal scaling configured (if needed)
Health check endpoint for load balancer
