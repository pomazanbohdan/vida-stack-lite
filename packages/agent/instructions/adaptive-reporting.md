# Adaptive reporting

Communicate with the user using approximately 80% ASD-STE100 principles: short sentences, plain words, consistent terms and one idea per paragraph. Preserve the user's language and required technical precision. This is an approximate style target, not a claim of formal ASD-STE100 compliance.

Use prose for one outcome, a checklist for actions/acceptance, a table for
mappings/comparisons and Mermaid only if flow, state, hierarchy or traceability
is materially easier to understand—or the user explicitly requests a diagram.
Use `flowchart` for flow/trace, `stateDiagram-v2` for lifecycle and `mindmap`
only for real hierarchy. Do not create decorative or placeholder graphs.

Graphs are projections, never proof. State their scope and limitations; retain
canonical IDs and visible `[GAP (<layer>)]` labels when a graph is used. In every
format distinguish Decision, Code, Static, Runtime and GAP; Static never closes
Runtime.

## Documentation maintenance

Apply the project's documentation policy and the existing DocFlow/CLEAR contract. This section guides document writing. The lifecycle remains the owner of authority, mutation and assurance.

1. Update the existing authoritative document. Use the sidecar to find its owner and sources. Create a new instruction only when no current owner covers the subject. Derived guides must link to their canonical sources.
2. Keep active documents and code comments about current supported behavior. Remove dated run narratives, revision diaries, repeated correction notes, superseded instructions and commented-out former wording. Keep a compatibility rule when the supported surface still exists.
3. Keep history in Git, required external lineage and existing work/evidence stores. Preserve original failed and UNKNOWN receipts. Removing history from a living document does not erase audit evidence or turn a failure into a pass.
4. Apply the approximate ASD-STE100 target above. Preserve the document's language, precise technical terms and human intent. Use short sentences, consistent words and one idea per paragraph. Use checklists for actions and tables for mappings. Remove repetition. Do not claim a measured style score or formal compliance.
5. State current rules, commands, limits and unresolved GAPs clearly. Link to current operation evidence for installed versions, qualification and acceptance. Do not hard-code a live success claim in an instruction. Separate verified behavior, proposals and missing evidence.
6. Before shortening a material contract or test guide, map its current requirements to the proposed text. Preserve acceptance, exact commands, public contracts, security, safety and data rules, thresholds, explicit bounds and approved GAP dispositions. Do not change code, raise limits or skip checks to make the prose shorter. Retain detail at its existing authoritative owner and link to it.
7. Verify wording, command names, links and requirement preservation. Check the actual diff and existing ownership. Record the required lineage and current CLEAR. For prose-only edits, reuse applicable current code tests. Run affected behavioral checks only when behavior, a contract or an executable example changes. Keep required assurance; a documentation check is not Runtime acceptance.
8. When the user asks for size reduction, record actual file bytes before and after the completed edit. State the kB/KiB convention. Report the measured difference after reconciliation. A smaller file alone does not prove faster execution, corrected context binding or successful deployment.
