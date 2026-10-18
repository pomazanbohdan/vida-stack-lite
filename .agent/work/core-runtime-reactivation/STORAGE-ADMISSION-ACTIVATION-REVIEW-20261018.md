# Storage admission activation review v354

## Finding

`trackModuleConstantReads` excludes a reference from `typeof` attribution only when the identifier is the direct operand of the `UnaryExpression` (`reference.parentPath.isUnaryExpression({ operator: 'typeof' })`). TypeScript permits a runtime expression such as `typeof (schema as string)`; in Babel's AST the identifier is under a `TSAsExpression`, with the `typeof` unary expression above it. The current check therefore instruments that reference as a body read and can report a mutation hit for an expression whose runtime operation is `typeof`.

This contradicts the new TESTING paragraph's blanket exclusion of `typeof` references and makes the test evidence incomplete: the added negative fixture covers only bare `typeof schema`. The smallest correction is to exclude a reference when any expression ancestor up to the `typeof` unary operand belongs to a `typeof` unary expression, while retaining the existing lexical binding and type-node checks. Add a focused negative case using a TS-wrapped runtime `typeof` expression if this behavior is intended to remain excluded.

## Reviewed properties

The implementation finds only program-scope `const` identifiers whose initializer matches the expected Stryker conditional, selected mutant ID, replacement string and paired coverage call. It additionally requires the Babel binding to be constant and declared by that exact declarator. For supported references, the generated expression evaluates the original identifier before testing its value, then calls the matching `stryMutAct_*` helper only when the value equals this mutation's replacement. Thus a TDZ exception happens before attribution, and the helper retains the active-mutant-ID guard.

Function-body filtering prevents import-time and hook-only reads from becoming body hits. Babel binding references avoid lexical-shadow confusion. Object shorthand is expanded as `key: (...)`, preserving the property name and value. The current fixture exercises shorthand through `{ schema }`, a shadowing parameter, bare `typeof`, a hook-only read, a body-owned read, and a live `WeakSet` registry through the same module namespace. Type-only references are excluded by the `TSType` ancestor check, though the added fixture does not directly exercise a type-only reference.

The transform edits only generated file content. It leaves Stryker's generated mutant list and `mutationGeneratedUniverse` input unchanged, and the image version records the tracking protocol. Existing assertion, JUnit and native-custody gates remain outside this helper; the fixture uses the existing runner and JUnit outcome readers. Root retains responsibility for native ID-0 proof.

## Review limits

I did not run Vex because this assignment forbids queries during Root's numeric checks; I used bounded `rg` navigation and read the selected current files. I ran no tests, compiler, scans, hashes, Git commands, build/install, Vex refresh, or Source writes. The TypeScript-wrapped `typeof` case is a static AST/semantics finding and was not executed, per assignment constraints.

## Follow-up review

The updated helper now rejects a reference when any ancestor is a `typeof` unary expression, covering the wrapper cases that escaped the original direct-parent check. The generated negative case now includes parenthesized `as`, angle-bracket assertion, non-null assertion and a type-only `typeof` return annotation. Static inspection confirms these are routed through the existing zero-hit negative assertion. This addresses the reported false-attribution path in the reviewed bytes; runtime confirmation remains unverified because the assignment forbids tests and native runs.
