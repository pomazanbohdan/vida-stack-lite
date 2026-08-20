# Step thinking

Choose the smallest method that fits one admissible step: `STC` for a local
check, `PR-CoT` for multiple perspectives, `MAR` for iterative refinement,
`5-SOL` for options, `META` for high-risk/architecture/conflict, and `TRACE`
for defect/root-cause work. Record only the label and concise external result.
Never expose hidden reasoning, scores or intermediate private traces.

Perspective slots are internal reasoning aids. They organize a step but are not
agents, are not independent review receipts and cannot vote, approve or close a
gate. Session continuity runs before selecting a method and receives an updated
compact result after the step.
