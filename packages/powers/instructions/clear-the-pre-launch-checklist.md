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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/shipping-and-launch/SKILL.md
status: active
revision: 1
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
