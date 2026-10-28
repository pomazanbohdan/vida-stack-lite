# Bun 1.4.4 declaration catalog

Research evidence, not a product contract or runtime qualification. The declaration and Source observations were captured from the isolated checkout at `f4db048ab9c9e67c13ba22e62f144aafb3d3d6fa`. A later `origin/main` observation reported by the coordinator includes the controller SHA conversion and a CLEAR change; those later bytes are not represented by this Source capture.

## What is indexed

[catalog.json](catalog.json) contains 6,171 declaration records, 5,492 type-reference edges, 3,226 checker symbol graphs and 339 exports of the merged `bun` module. [members.md](members.md) is the readable declaration index; exact signatures, source locations and edges are in the JSON. The five checker export sets contain `bun:bundle` 2, `bun:ffi` 25, `bun:jsc` 35, `bun:sqlite` 12 and `bun:test` 36 entries. All 49 functions from the earlier top-level overview are present in the `bun` export set. Export counts include type-only symbols; they are not runtime callable counts.

The index includes the effective global `Bun` alias, `ImportMeta` augmentations, Bun globals, callable types and signatures, constructors, optional and computed names, class and interface members, return-type declarations, overloads, inherited property origins and direct reference edges. Declaration IDs identify source positions. Local edge, symbol, property, signature and module-export origins resolve to declaration IDs. External origins identify Web or Node declarations rather than attributing them to Bun. Referenced declaration IDs represent cycles without recursively expanding them.

The input is the TypeScript 7.0.2 program rooted at `@types/bun` 1.4.4. The shim resolves `bun-types` 1.4.4; its 21 direct index references and transitive vendor/JSX inputs yielded 28 Bun-owned declaration files. The `ts7.1` branch is inactive for this compiler. The program also uses `@types/node` 26.6.5 and `undici-types` 8.9.0. The runtime used for extraction was Bun 1.4.4 revision `38afee6c84fcf48c0edb2466aa4b27d287a59c30`. Per-file byte counts and SHA-256 hashes appear in `catalog.json`; the lockfile's tarball integrity is a package pin, not independent proof of installed-file authenticity.

Bun's type declarations and the `@types/bun` shim are MIT-licensed by their respective contributors. Source: [Bun repository](https://github.com/oven-sh/bun), [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped). Signatures are derived from those declarations; descriptions here are paraphrased. The current [Bun native API overview](https://bun.com/docs/runtime/bun-apis) is an unversioned cross-check, not evidence of the 1.4.4 declarations.

## Boundaries

The checker resolved 5,395 reference edges; it produced 11 indexed-access results and retained 86 generic indexed-access expressions symbolically. No local reference endpoint is missing. Generic instantiations are not exhaustively expanded: their declarations, signatures, type arguments and direct edges remain available, while conditional results depending on a caller's types are not enumerated. AST classification distinguishes type declarations, callback/function types and declared runtime or namespace surfaces; it does not prove runtime reachability, platform support or behavior. The catalog cannot establish APIs absent from declarations or dynamic runtime-only members.

The 338 checker `any` results have explicit reasons: 296 signature locations have separately captured signatures, 20 declarations explicitly use `any`, 16 are namespace declaration locations, five export explicitly-`any` `contents`, and one is the deprecated `SpawnOptions` namespace alias. These are declaration observations, not assertions that every use is safe.

[source-observations.json](source-observations.json) binds a single 152-file `bin`/`src` TypeScript inventory to its file hashes and 1,106 syntax observations. [disposition.json](disposition.json) binds every catalog declaration ID to that inventory and the catalog hash. Its 1,172 `not-established` rows are unknown, not claims of no product use. The remaining classifications are 4,626 type declarations, 303 callback/function types, 61 observed Bun family rows and nine candidate-family review rows. Counts classify declarations, not distinct APIs.

The scan records direct `Bun.*` calls or constructors, calls through named `bun` and `bun:*` imports, and literal dynamic imports and `require` calls. It does not resolve shadowing, aliases of the `Bun` object, default or namespace import calls, dynamic property keys, instance methods, arbitrary dependency re-exports or nonliteral module names. Observed families are syntax evidence only; unobserved families are not proven absent. [Migration candidates](migration-candidates.md) contain the manually checked Source anchors and their separate gates.

## Reproduce

From the repository root, with the declared dependencies already present and the pinned Bun selected:

```sh
bun packages/agent/docs/research/bun-1.4.4-api/generate-catalog.ts --check
bun packages/agent/docs/research/bun-1.4.4-api/scan-source.ts --check
```

`--write` refreshes the generated outputs; `--check` compares exact bytes. The catalog generator creates an owned scratch configuration, uses the local TypeScript API child and observes its termination. The scanner reparses the selected Source files and rechecks their hashes. The scanner check also runs the audit, which verifies local reference endpoints, module export sets, the earlier 49 names and catalog/disposition/source-inventory binding. These checks do not execute the cataloged APIs or qualify product behavior.
