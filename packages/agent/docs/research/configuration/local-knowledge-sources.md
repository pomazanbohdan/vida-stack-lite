---
type: Research
title: Root локальних knowledge sources і fixture roundtrip
---
# Локальні knowledge sources

Статус: test-only repair інтегровано в main звичайним commit `7bedc924`, hooks пройшли. Source pin дослідження: `be611d059bdf09da8b5a92630b5b840f47ffe6bb`; candidate base `4261d3742a049ca4a82f24c0c0ae1a0bcd013f35`. Test SHA256 `faf87f24458bec0fcbf4356ec9a11cdd1ad62b3d3354832846c35bc38f8a6a14`: Root підтвердив14PASS/0FAIL/187assertions у candidate та main, незалежний reviewPASS spec/quality. Це source-checkout evidence; installed layout і повний release gate цими перевірками не кваліфіковані.

## Встановлено

- [project-configuration-contract.test.ts](../../../tests/project-configuration-contract.test.ts) у genuine repository roundtrip resolves кожний local `knowledge.sources[].location` через `path.resolve(repositoryRoot, location)` і вимагає існування файла.
- [Root config](../../../../../agent-runtime.config.v1.yaml) містить local location `vida-agent/instructions/development-lifecycle.md`. Цього exact repository-relative path немає в дослідженій worktree; [packages/agent/instructions/development-lifecycle.md](../../../instructions/development-lifecycle.md) існує.
- [runtime-config.ts](../../../src/config/runtime-config.ts) у `assertRequiredRepositoryReferences` розпізнає `config.runtime.bundle + '/'`: suffix читається через `runtimePackageAccess()` та `readRuntimePackageResourceText()`, з executing package root. Лише unprefixed project refs читаються від repository root. Package access перевіряє manifest identity `vida-agent`.
- [configured-context.ts](../../../src/orchestration/configured-context.ts) використовує таку саму межу. [init-entrypoint-v8.test.ts](../../../tests/init-entrypoint-v8.test.ts) містить окремі bundle та project reference cases.
- Це пояснює assertion failure: тест помилково читає bundle-qualified path від repository root. Luna відтворила semantic RED, змінила лише цей test та отримала14PASS; Root повторив suite на exact candidate bytes. Config, fixtures і production Source не змінювалися; документ-дублікат не створювався. Raw qualification зберігається у work/evidence/gate-repair-root відповідного work record.

## Contract

[Schema](../../../schemas/agent-runtime-config.v1.schema.json) не має optional/disabled для knowledge source. Validation із repository root перевіряє кожний local ref через відповідного owner; невибраний stage source не робить його optional. `splitRuntimeConfig` у [project-configuration.ts](../../../src/config/project-configuration.ts) є pure conversion без filesystem root. Roundtrip має зберігати values та refs; перевірка доступності source — окрема assertion із правильним root. Не змінювати configured location або owner заради проходження тесту.

## Owner та приймання

Owner: Agent configuration contract test. Виправити лише root-aware existence/read assertion у genuine roundtrip: bundle-qualified refs — через існуючий safe package reader; unprefixed refs — від repository root. Зберегти exact split/recompose equality. Приймання: focused test на actual package resource та project ref; відсутній потрібний ресурс продовжує спричиняти failure. Stop: інша bundle identity/root або unreadable resource. Config, source locations і runtime behavior не потребують зміни за поточними доказами. Цей запис не є доказом Runtime acceptance.
