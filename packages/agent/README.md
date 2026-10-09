# Portable `vida-agent` runtime

VIDA coordinates agent work through Mastra and HostState. Public installation
uses one standalone executable with embedded Bun. External Node, npm and Bun
are not required to run it. SDK exports are library interfaces.

## Product and project state

The bundle owns runtime code, schemas, instructions, templates and tooling.
Project requirements, configuration, tasks, research and operational state stay
outside the bundle. `agent-runtime.config.v1.yaml` selects the project settings;
`AGENT.sidecar.md` maps authoritative project sources.

Mastra owns configured stages and workflow snapshots. HostState owns admission,
Source ownership, leases and compare-and-swap checks. A report records observed
results; it does not grant delivery approval or user Runtime acceptance.
Unknown issued effects cannot be reissued without a supported disposition.

The session issues the ready wave with the returned `state_version`, invokes
its available collaboration tools and reports each actual result. The CLI does
not invoke those tools or operate external providers by itself.

Production readers use strict current artifact contracts. A contract change
must include the supported repair of affected active artifacts. A clean start
preserves task requirements, accepted decisions and research while excluding
archived operational state from active execution.

## Development and delivery

[TESTING.md](TESTING.md) owns test selection, commands and numeric criteria.
[Development lifecycle](instructions/development-lifecycle.md#self-development-protocol)
owns execution and release sequencing. [Package scripts](package.json) own
reproducible commands and exact tool pins. Reuse current evidence; do not repeat
passing suites without a changed input or an unresolved failure.

CI forms and publishes the native artifact. Build and installation do not run
development test suites. The [installation guide](docs/installation.md) explains
the maintained installer and update flow. Formation, installation, runtime
admission and user acceptance require their respective actual results.

See the [system specification](docs/system-specification.md) for supported
behavior, data contracts and boundaries. Keep run history and temporary status
in work evidence, outside this guide.
