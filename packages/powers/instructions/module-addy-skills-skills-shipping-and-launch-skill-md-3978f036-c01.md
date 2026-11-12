---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-shipping-and-launch-skill-md-3978f036-c01"
title: "addy-skills: skills/shipping-and-launch/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/shipping-and-launch/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/shipping-and-launch/SKILL.md\"}"
atom_ids:
  - clear-the-pre-launch-checklist
  - gate-the-release-on-the-error-budget
  - gate-the-rollout-on-metric-thresholds
  - keep-feature-flags-flat-and-tested
  - roll-back-immediately-on-these-signals
  - roll-out-in-staged-gates
  - verify-the-launch-in-the-first-hour
  - watch-the-signals-that-matter
atom_count: 8
atoms: "[{\"atom_id\":\"clear-the-pre-launch-checklist\",\"file_sha256\":\"ae70034cb742ad4f1bd288d8b84ec3d5ab78ba8eed5d06d1d451d75f5a62c393\",\"content_sha256\":\"2913897cd8a05bb2f3c9324c16934c8cd39d1aa644027b8fbfc348a71da19402\",\"file_bytes\":3672,\"body_bytes\":2485},{\"atom_id\":\"gate-the-release-on-the-error-budget\",\"file_sha256\":\"fb5bf390ea0523d56bf801c8f3e938c626a7fd656dd850dd24f46cf1ad277143\",\"content_sha256\":\"6d3f4a247f12d2154dfd071ba94d0b16fcd1ec6a013e9aa472cfd9c710a3e9c0\",\"file_bytes\":2111,\"body_bytes\":1046},{\"atom_id\":\"gate-the-rollout-on-metric-thresholds\",\"file_sha256\":\"89ad964486ea68c1ac5f734d0e5e0eba63b90ba36eeff1ec09292331e98f7637\",\"content_sha256\":\"142f426929e5391f3f40d19d7346c318b04d640f2ac56c4cc2270be9c2c89b3a\",\"file_bytes\":1843,\"body_bytes\":681},{\"atom_id\":\"keep-feature-flags-flat-and-tested\",\"file_sha256\":\"74f04f17ff8a1dcf44c381b05a4f5060fc436d229e149b438c1921f2d8494e56\",\"content_sha256\":\"963fffa6782206b8ccda8c3cd0e4d890b49f95e2b97b215a28ae97c4a20fe30f\",\"file_bytes\":1409,\"body_bytes\":368},{\"atom_id\":\"roll-back-immediately-on-these-signals\",\"file_sha256\":\"1415c6c34484a6375d96cfdd43c0b9f830844f0f967b7e548972a6076dfea0f8\",\"content_sha256\":\"39688dfac80e5688e91df7f5fe0b5403f114ae1687ca73f630f29bfe42230907\",\"file_bytes\":1400,\"body_bytes\":278},{\"atom_id\":\"roll-out-in-staged-gates\",\"file_sha256\":\"a5f7bcbdb9f9bc589002a0e4fc9b3de2b243f1b65160f74b547bd5cd2133ad41\",\"content_sha256\":\"e41e4342b3361aaf0d999066b2bb31d60372083a412d031ec3af525cd0df1ae3\",\"file_bytes\":2304,\"body_bytes\":1221},{\"atom_id\":\"verify-the-launch-in-the-first-hour\",\"file_sha256\":\"7bc168f9e7e3d4a2ec6494763388ff5a4784369516672fc7438f7df6703d961d\",\"content_sha256\":\"9dd934cfd09a8992a4cce6641278e7fb00b1058a18d96625cc1266ab5a24c3f3\",\"file_bytes\":1702,\"body_bytes\":652},{\"atom_id\":\"watch-the-signals-that-matter\",\"file_sha256\":\"f49795c1303a6532b9bebf2287994f308686ac5febe680425a7242112f50e91b\",\"content_sha256\":\"56e5a48539dc53d64465acfb60bb77ff362024807aa6a142b107c0b867be3fd2\",\"file_bytes\":2131,\"body_bytes\":1001}]"
carrier_sha256: b28b2cc9380cbe77db04815794fe5da63198f2ccab31a63818fce2b678a61b87
carrier_bytes: 17561
revision: 1
status: active
---
<!-- vpmodule:atom:begin clear-the-pre-launch-checklist -->
---
instruction_id: clear-the-pre-launch-checklist
title: Clear the pre-launch checklist
summary: "Work through the release readiness checklist before deploying, and do not deploy until every section is green."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - release-readiness
conditions_applies_when: A change is about to be deployed to production for the first time or released to users as a significant change.
conditions_does_not_apply_when: "The change does not reach users, such as a local edit or a documentation change."
artifact_contract_output_type: release-readiness-checklist
artifact_contract_required_data:
  - the checklist sections
  - the state of each section
  - the deployment decision
artifact_contract_verified_by: every section of the checklist is green before the deployment starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/shipping-and-launch/SKILL.md
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

# Clear the pre-launch checklist
Ship with confidence. The goal is not just to deploy — it's to deploy safely, with monitoring in place, a rollback plan ready, and a clear understanding of what success looks like. Every launch should be reversible, observable, and incremental.

## The Pre-Launch Checklist

### Code Quality
- [ ] All tests pass (unit, integration, e2e)
- [ ] Build succeeds with no warnings
- [ ] Lint and type checking pass
- [ ] Code reviewed and approved
- [ ] No TODO comments that should be resolved before launch
- [ ] No `console.log` debugging statements in production code
- [ ] Error handling covers expected failure modes

### Security
- [ ] No secrets in code or version control
- [ ] The ecosystem's dependency audit shows no critical or high vulnerabilities
- [ ] Input validation on all user-facing endpoints
- [ ] Authentication and authorization checks in place
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Rate limiting on authentication endpoints
- [ ] CORS configured to specific origins (not wildcard)

### Performance
- [ ] Core Web Vitals within "Good" thresholds
- [ ] No N+1 queries in critical paths
- [ ] Images optimized (compression, responsive sizes, lazy loading)
- [ ] Bundle size within budget
- [ ] Database queries have appropriate indexes
- [ ] Caching configured for static assets and repeated queries

### Accessibility
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader can convey page content and structure
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 for text)
- [ ] Focus management correct for modals and dynamic content
- [ ] Error messages are descriptive and associated with form fields
- [ ] No accessibility warnings in axe-core or Lighthouse

### Infrastructure
- [ ] Environment variables set in production
- [ ] Database migrations applied (or ready to apply)
- [ ] DNS and SSL configured
- [ ] CDN configured for static assets
- [ ] Logging and error reporting configured
- [ ] Health check endpoint exists and responds

### Documentation
- [ ] README updated with any new setup requirements
- [ ] API documentation current
- [ ] ADRs written for any architectural decisions
- [ ] Changelog updated
- [ ] User-facing documentation updated (if applicable)

## Verification

Before deploying:
- [ ] Pre-launch checklist completed (all sections green)

## Red Flags

- Production environment configuration done by memory, not code
- "It's Friday afternoon, let's ship it"
<!-- vpmodule:atom:end clear-the-pre-launch-checklist -->
<!-- vpmodule:atom:begin gate-the-release-on-the-error-budget -->
---
instruction_id: gate-the-release-on-the-error-budget
title: Gate the release on the error budget
summary: "Let the remaining error budget decide whether the release ships, slows down or stops."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - metric-gated-decision
conditions_applies_when: A service has an error budget and a release is proposed.
conditions_does_not_apply_when: The service has no error budget or no defined allowance for failure.
artifact_contract_output_type: budget-gate-decision
artifact_contract_required_data:
  - the remaining budget
  - the band it falls into
  - the action
artifact_contract_verified_by: the action matches the band the remaining budget falls into
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/shipping-and-launch/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Gate the release on the error budget

## Error Budget Release Gate

Your service's error budget — the fraction of requests or time your SLO allows to fail — determines whether it's safe to ship. Use it as an objective gate — not a negotiation:

Budget remaining > 20%  →  Ship normally; monitor closely
Budget remaining 0–20%  →  Slow rollouts only; no high-risk changes
Budget exhausted        →  Freeze feature work; focus entirely on reliability
Budget resets           →  Resume normal pace; bake in the fix that recovered it

A high burn rate during a canary (consuming budget faster than the baseline pace) is a **hold** signal in the rollout thresholds table above — treat it the same as an elevated error rate.

## Red Flags

- Error budget exhausted but feature work continues unchanged

## Common Rationalizations

"The error rate looks fine, let's keep shipping"
Check the burn rate, not just the current error rate. Consuming budget faster than baseline is a hold signal even when individual thresholds are green.
<!-- vpmodule:atom:end gate-the-release-on-the-error-budget -->
<!-- vpmodule:atom:begin gate-the-rollout-on-metric-thresholds -->
---
instruction_id: gate-the-rollout-on-metric-thresholds
title: Gate the rollout on metric thresholds
summary: "Decide whether to advance, hold or roll back from thresholds on error rate, latency, client errors and business metrics."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - metric-gated-decision
conditions_applies_when: "A staged rollout needs a decision to advance, to hold or to reverse at the next step."
conditions_does_not_apply_when: The metrics have no baseline to compare against yet.
artifact_contract_output_type: rollout-decision
artifact_contract_required_data:
  - the metric values
  - the baseline
  - the threshold band
  - the decision
artifact_contract_verified_by: "the decision names the metric, the band it falls into and the stage it applies to"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/shipping-and-launch/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - business
  - operations
---

# Gate the rollout on metric thresholds

### Rollout Decision Thresholds

Use these thresholds to decide whether to advance, hold, or roll back at each stage:

| Metric | Advance (green) | Hold and investigate (yellow) | Roll back (red) |
|--------|-----------------|-------------------------------|-----------------|
| Error rate | Within 10% of baseline | 10-100% above baseline | >2x baseline |
| P95 latency | Within 20% of baseline | 20-50% above baseline | >50% above baseline |
| Client JS errors | No new error types | New errors at <0.1% of sessions | New errors at >0.1% of sessions |
| Business metrics | Neutral or positive | Decline <5% (may be noise) | Decline >5% |
<!-- vpmodule:atom:end gate-the-rollout-on-metric-thresholds -->
<!-- vpmodule:atom:begin keep-feature-flags-flat-and-tested -->
---
instruction_id: keep-feature-flags-flat-and-tested
title: Keep feature flags flat and tested
summary: "Do not nest feature flags, and test both the on and the off state of every flag in CI."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - staged-exposure
conditions_applies_when: A feature flag is introduced or extended.
conditions_does_not_apply_when: The behaviour is switched on permanently from the start.
artifact_contract_output_type: flag-discipline
artifact_contract_required_data:
  - the flags in play
  - the nesting check
  - the states under test
artifact_contract_verified_by: both flag states are covered by the suite and no flag depends on another flag
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/shipping-and-launch/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Keep feature flags flat and tested
Ship behind feature flags to decouple deployment from release.

**Rules:**
- Don't nest feature flags (creates exponential combinations)
- Test both flag states (on and off) in CI

## Common Rationalizations

"We don't need feature flags for this"
Every feature benefits from a kill switch. Even "simple" changes can break things.
<!-- vpmodule:atom:end keep-feature-flags-flat-and-tested -->
<!-- vpmodule:atom:begin roll-back-immediately-on-these-signals -->
---
instruction_id: roll-back-immediately-on-these-signals
title: Roll back immediately on these signals
summary: "Reverse the release at once when the error rate, the latency, the user reports, the data integrity or the security crosses the limit."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A release is live and one of the immediate-reversal signals appears.
conditions_does_not_apply_when: The signal is a slow degradation that the rollout thresholds handle as a hold.
artifact_contract_output_type: rollback-trigger
artifact_contract_required_data:
  - the signal observed
  - the measured value
  - the rollback action
artifact_contract_verified_by: the rollback starts without waiting for the next rollout stage
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/shipping-and-launch/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Roll back immediately on these signals

### When to Roll Back

Roll back immediately if:
- Error rate increases by more than 2x baseline
- P95 latency increases by more than 50%
- User-reported issues spike
- Data integrity issues detected
- Security vulnerability discovered
<!-- vpmodule:atom:end roll-back-immediately-on-these-signals -->
<!-- vpmodule:atom:begin roll-out-in-staged-gates -->
---
instruction_id: roll-out-in-staged-gates
title: Roll out in staged gates
summary: "Grow the exposure of a change step by step, with a monitoring window and a way back at every step."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - staged-exposure
conditions_applies_when: A change is released to users and the release can be widened in steps.
conditions_does_not_apply_when: "The change cannot be exposed in stages, such as a one-off internal script."
artifact_contract_output_type: staged-rollout
artifact_contract_required_data:
  - the ordered stages
  - the monitoring window per stage
  - the way back to the previous stage
artifact_contract_verified_by: each stage was monitored for its window before the next one started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/shipping-and-launch/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Roll out in staged gates

## Staged Rollout

### The Rollout Sequence

1. DEPLOY to staging
   └── Full test suite in staging environment
   └── Manual smoke test of critical flows

2. DEPLOY to production (feature flag OFF)
   └── Verify deployment succeeded (health check)
   └── Check error monitoring (no new errors)

3. ENABLE for team (flag ON for internal users)
   └── Team uses the feature in production
   └── 24-hour monitoring window

4. CANARY rollout (flag ON for 5% of users)
   └── Monitor error rates, latency, user behavior
   └── Compare metrics: canary vs. baseline
   └── 24-48 hour monitoring window
   └── Advance only if all thresholds pass

5. GRADUAL increase (25% -> 50% -> 100%)
   └── Same monitoring at each step
   └── Ability to roll back to previous percentage at any point

6. FULL rollout (flag ON for all users)
   └── Monitor for 1 week
   └── Clean up feature flag

## Red Flags

- Big-bang releases (everything at once, no staging)

## Common Rationalizations

"It works in staging, it'll work in production"
Production has different data, traffic patterns, and edge cases. Monitor after deploy.
<!-- vpmodule:atom:end roll-out-in-staged-gates -->
<!-- vpmodule:atom:begin verify-the-launch-in-the-first-hour -->
---
instruction_id: verify-the-launch-in-the-first-hour
title: Verify the launch in the first hour
summary: "Check the health endpoint, the error and the latency dashboards, the critical flow, the logs and the rollback in the first hour after the release."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A deployment has just gone out to production.
conditions_does_not_apply_when: The change has not been deployed yet.
artifact_contract_output_type: post-launch-check
artifact_contract_required_data:
  - the checks run
  - the results
  - the rollback state
artifact_contract_verified_by: every check of the first hour has a recorded result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/shipping-and-launch/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Verify the launch in the first hour

## Post-Launch Verification

In the first hour after launch:

1. Check health endpoint returns 200
2. Check error monitoring dashboard (no new error types)
3. Check latency dashboard (no regression)
4. Test the critical user flow manually
5. Verify logs are flowing and readable
6. Confirm rollback mechanism works (dry run if possible)

## Verification

After deploying:
- [ ] Health check returns 200
- [ ] Error rate is normal
- [ ] Latency is normal
- [ ] Critical user flow works
- [ ] Logs are flowing
- [ ] Rollback tested or verified ready

## Red Flags

- No one monitoring the deploy for the first hour
<!-- vpmodule:atom:end verify-the-launch-in-the-first-hour -->
<!-- vpmodule:atom:begin watch-the-signals-that-matter -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/shipping-and-launch/SKILL.md
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
<!-- vpmodule:atom:end watch-the-signals-that-matter -->