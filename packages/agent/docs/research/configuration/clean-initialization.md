---
type: Research
title: Clean initialization — preservation та effect owner
---

# Clean initialization

Статус: source research; effect implementation та native acceptance pending. User authorization зберігається в [чинному рішенні](../../decisions/configuration/clean-init-authorization.md); реалізація йде за [Task3 планом](../../plans/runtime-project-model.md#task-3--clean-initarchiverepair-effect-owner).

## Поточний owner

- C1 strict v2 data codec/schema реалізовані та локально інтегровані commit `205157d6`; validate/seal/decode мають лише data-level authority. Independent review MET/Quality-Security PASS; final Root tests9/58 та scoped static checks PASS. v1 bytes незмінні. Публічний effect owner/help/package inventory та native preservation/maintenance ще pending; installed0.1.9 не оновлювався.

- [consumer-clean-initialization.ts](../../../bin/consumer-clean-initialization.ts) реалізує strict operation model, validation/seal/decode і observation-only capture plan. Apply/inspect/resume, recovery execution та public CLI dispatch ще відсутні.
- Planner allowlist включає AGENTS.md, AGENT.sidecar.md, runtime YAML, documentation-policy JSON та `.agent/work`; history payload міститься в `.agent/clean-initialization-history/<operation>/payload`. Переміщення всього work root суперечить затвердженому preservation contract. Новий effect owner не має виконувати цей candidate.
- [init-core.ts](../../../bin/init-core.ts) має prepareInitializationUnderAdmission та finishPreparedInitializationUnderAdmission: compose під тим самим init/config admission із exact clean-pending witness. Звичайний initializer вимагає inactive clean-init й не є обхідним шляхом.
- Існують planner/journal tests; apply/recovery tests ще потрібно реалізувати. Це static findings, не доказ фактичного archive/init або роботи standalone CLI.

## Визначені межі

Installed 0.1.9 audit2026-11-03: 9 read-only CLI invocations завершилися exit0; 251/251 owner-selected manifest resources збігаються з installed bytes. New product fields/clean-init effects у public help відсутні; це capability gap, а не missing-resource corruption. Initial diagnostic помилково включив 3 build-only modules, його failure збережено та виправлено окремою owner-bound reconciliation. Raw evidence: `.agent/work/runtime-project-model-implementation-20261102/resume-20261103/clean-init-r1/`.

Independent Go preflight CHANGES виявив preservation blockers: whole `.agent/work` candidate, відсутню custody старого init receipt і відсутню seam збереження project sidecar. Root прийняв окремий v2 та послідовні C1–C3 у [engineering contract](../../decisions/configuration/runtime-project-model.md#engineering-contract-clean-init-v2). Часткова retirement/unfence не прийнята; blanket guessed docs protection не замінює actual configured union. v1 Source/schema не змінюються.

Task3 original attempt1 лишається INTAKE/active з expired lease, journal1/work1/ledger9 та без pending actions. Public unissued-owner inspect і один supported expired-lease recovery повернули terminal generic GAP; наступний public inspect підтвердив exact unchanged state. Перший Source-only legacy guard відмовить logical bundle, якщо до нього дійде виклик; native envelope не називає failing predicate. Preflight припущення, що INTAKE означає відсутність prepared items, не доведене: retained admit output має ready wave/next action. Не поширювати Source-only recovery boundary або вважати ці відмови Source grant, completion чи no-effect proof для інших операцій.

Зберігати `.agent/work`, configured product stores, Source, canonical wiki/requirements, evidence і FAIL/UNKNOWN за чинними шляхами. Захищати union усіх продуктових mappings і відмовлятися від ambiguous overlaps. Archive виконується лише для явно дозволених managed integration objects із verified beforeimages; operation history/lock не архівуються самі. Існування backup не дає права на blind move або overwrite.

## Невирішені engineering contracts

Root має зафіксувати exact journal version/repair dispatch без silent active-v1 widening, зв’язок Host maintenance з init/config/upgrade admission, CAS state bindings, terminal/history retirement та CLI owner. Inspect/resume мусять розрізняти exact before, exact after, both/neither/mismatch і зберігати unknown effects без повторення. Restore не перезаписує змінений destination. Матеріальні product/prefix/path значення залишаються відповідями користувача.

Raw report і hashes: `.agent/work/runtime-project-model-implementation-20261102/task-3-clean-init-owner-research.md`; inspected planner SHA256 `7a98f7c4cda8f0a7d72aeb83e29b7769ef94b60510b988f33ad4e03114859798`. Report не змінював Source і не запускав tests/effects. Наступний крок — Root implementation brief та independent preflight перед Source writer; actual clean-init лише після кваліфікованого delivered runtime й перевірених backups.
