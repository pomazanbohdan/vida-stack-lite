/** Type-only ownership for release adapters that load these dependencies from vida-agent. */
export type AgentTarModule = typeof import('tar');
export type AgentFsSafeArchiveModule = typeof import('@openclaw/fs-safe/archive');
export type AgentReadArchiveEntry = AgentFsSafeArchiveModule['readArchiveEntry'];
export type AgentLoadZipArchiveWithPreflight = AgentFsSafeArchiveModule['loadZipArchiveWithPreflight'];
export type AgentExtractArchiveModule = Pick<AgentFsSafeArchiveModule, 'extractArchive'>;
