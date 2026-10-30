---
instruction_id: watch-the-signals-that-matter
title: Watch the signals that matter
summary: "Name the application, the infrastructure and the client signals to watch, and report errors without exposing internals."
capability_tags:
  - verify-work-results
pattern_tags:
  - operational-telemetry
conditions_applies_when: A service runs in production and its health has to be observed.
conditions_does_not_apply_when: "The work does not run as a live service, such as a build script."
artifact_contract_output_type: monitoring-signal-set
artifact_contract_required_data:
  - the application metrics
  - the infrastructure metrics
  - the client metrics
artifact_contract_verified_by: the signal set exists before the launch and every signal in it can be read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/shipping-and-launch/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
  - operations
---

# Watch the signals that matter

## Monitoring and Observability

### What to Monitor

Application metrics:
├── Error rate (total and by endpoint)
├── Response time (p50, p95, p99)
├── Request volume
├── Active users
└── Key business metrics (conversion, engagement)

Infrastructure metrics:
├── CPU and memory utilization
├── Database connection pool usage
├── Disk space
├── Network latency
└── Queue depth (if applicable)

Client metrics:
├── Core Web Vitals (LCP, INP, CLS)
├── JavaScript errors
├── API error rates from client perspective
└── Page load time

### Error Reporting

Don't expose internals to users

## Red Flags

- No monitoring or error reporting in production

## Common Rationalizations

"Monitoring is overhead"
Not having monitoring means you discover problems from user complaints instead of dashboards.

"We'll add monitoring later"
Add it before launch. You can't debug what you can't see.
