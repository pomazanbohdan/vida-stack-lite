# Artifact Reference Procedure: Append, Index, Verify, Semantic Separation

## Commands

Record each content operation in the per-product artifact index before claiming its result. Resolve the canonical Standalone store at `packages/powers/docs/work/artifacts.jsonl` and pass it as an absolute `--store` path; never derive it from the working directory.

```sh
bun <skill-dir>/scripts/catalog-cli.ts artifacts append --store <absolute-store-path> --event-file <absolute-artifact-event-json>
bun <skill-dir>/scripts/catalog-cli.ts artifacts index --store <absolute-store-path>
bun <skill-dir>/scripts/catalog-cli.ts artifacts verify --store <absolute-store-path> --id <artifact-id> --root <product-root> [--semantic-file <absolute-semantic-json>]
```

## Append and update

An event is either the first `artifact` for an ID or an explicit `update` of an existing one; an update for an unknown ID fails with `ARTIFACT_NOT_FOUND` and a changed digest under an existing revision fails with `ARTIFACT_REVISION_CONFLICT`.

## Verify mechanical and semantic results

`verify` reports presence, format and digest as one mechanical result and the supplied semantic judgment as a separate one. It reports `complete: true` only when the mechanical parts pass and the semantic verdict is `pass`. A matching digest alone never proves valid content or equivalence. Do not claim artifact materialization, semantic acceptance or AC closure that was not actually checked.

## Semantic separation

The mechanical result (presence, format, digest) is separate from the semantic judgment supplied by the caller. The verify command reports both as distinct outcomes — `complete: true` requires both mechanical pass and semantic `pass`. Never conflate mechanical validation with semantic acceptance; a correct artifact digest does not prove that its contents are valid or equivalent to another finding.