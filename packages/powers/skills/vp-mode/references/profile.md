# Profile Policy and Negotiation

## Policy alternatives

The effective profile's active alternative governs policy selection. When a profile error has `profile_refresh_required: true`, refresh it with `vp-setup` before interpreting `resolution_required: true` as a negotiation request. Only a conflict with `resolution_required: true` and no `profile_refresh_required: true` is a user negotiation request.

## Negotiation

When an unresolved policy group is needed, send a negotiation request naming the group and its alternatives; never choose a default or compose either alternative for that group. Use `--select <group>=<alternative>` to record user decisions during setup.

## --approach dimensions

When the task establishes an approach, repeat `--approach execution=solo`, `--approach remediation-timing=none`, or `--approach review-requirement=independent` as applicable. Each dimension accepts one value:
- `execution=delegated` (default) vs `execution=solo`
- `remediation-timing=immediate|after-review`
- `review-requirement=none`

Use the same selectors with `search`, `explain`, and the final batch `get`. Explain returns candidate decisions, including declared exclusions, and source, body, schema, and policy digests as JSON without pagination. Unassessed and uncertain records remain candidates; declared contradictions are excluded from search before candidate profile negotiation.

## Carriers and snapshot authority

For this project read the sidecar-mapped `vida-project-profile.json` and pass it to `--profile`. If that explicit file is missing or invalid, stop the dependent retrieval; do not fall back to markers. Only for another Standalone project without an explicit profile path, extract the fenced JSON between `<!-- vida-powers:profile:begin -->` and `<!-- vida-powers:profile:end -->` in `AGENTS.md` or `CLAUDE.md` unchanged into an owned temporary `.json` file.

Profile-aware search and composition always use this package's canonical `config/methodology-profile.json` and `config/vpmethodologyprofile.v1.schema.json` as policy authority, including for snapshots. Snapshot files cannot override that authority. For reproducible snapshot work, bind both the selected data/schema files and these canonical policy files.
