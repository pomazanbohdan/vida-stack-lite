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
