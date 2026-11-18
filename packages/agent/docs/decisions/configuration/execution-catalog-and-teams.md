---
type: Decision Record
title: Локальний каталог виконання і три склади команд
---

# Локальний каталог виконання і три склади команд

Статус: вимоги підтверджені прямими повідомленнями користувача 2026-11-09;
основу архітектури погоджено з умовами 2026-11-09. User clarification
2026-11-10 розширює layout/origin/metadata/routing; дві замовлені model reviews
завершено APPROVE_WITH_CHANGES, 0 Critical/3 Important. Root corrected revision
погоджена користувачем 2026-11-10. Реалізація не почата;
Source права, delivery і Runtime acceptance не надані.

## Підтверджений намір

- Agent має базові roles/profiles/workflows, які розвиваються розробкою.
- Init створює локальний перелік; елементи можна глобально для репозиторію
  увімкнути/вимкнути та додати власні values.
- Потрібні робочі завдання з деталізацією дій, окремо від ролей.
- Scope зараз: generic workflow із трьома різними складами команд і один
  наш fixed workflow. Це не concurrency limits 1/3/5.
- Кілька tasks/batches можуть працювати паралельно; склад і кількість
  учасників конкретної задачі залежать від обраного рівня.
- Кожен рівень покриває повний research-to-delivery цикл, умовно до prod;
  implementation або delivery proposal окремо недостатні.
- Root формує власну повну цепочку, не лише повторює приклади.
- До фінального рішення потрібні окремі SWE-2 Flash та DeepSeek 4.1 Flash
  reviews; виконано 2026-11-09 (8/8, усі APPROVE_WITH_CHANGES, без PASS).
- Запитано у сесії `48dcc494-1f57-4f73-82b1-d54c0de8e496` три типи
  консиліуму; застосовано 2026-11-09.

## Погоджені рішення 2026-11-09

1. Локальний каталог + один compiler/engine; reuse Mastra/HostState/
   Cedar/VIDA; без нового scheduler/ledger/store.
2. Final-state-only: без перехідних v2/v3 і без довгоживучого legacy. Один
   кінцевий стан; існуючі v1/v2 — лише вхід тимчасового repair tool, який
   видаляється після міграції. Старі readers/schemas/fallbacks видаляються.
   До кваліфікації repair чинні контракти лишаються в силі; після нього
   старі шляхи видаляються.
3. Compact/Standard/Extended — пресети розподілу ролей, не обіцянка 3/5/8
   агентів. Actual instances рахуються з task graph, risk і assurance; Root
   поза count; delivery preparation має delivery-capable profile/tool block;
   no silent auto-escalation.
4. `execution_level` — immutable поле work item/admission і копія в packet.
   Уточнення routing 2026-11-10: explicit Work level або selected route default;
   route обирається за explicit/product/kind/global правилами; unknown,
   ambiguous чи incompatible level/team — refusal, без auto-escalation.
5. 14 кроків на кожному рівні; BA/SA reuse `ResearchResult/v1` +
   `DecisionRecord/v1`; `TestPlan/v1` до коду; `DeliveryEvidence/v1` —
   read-only projection над існуючими adapter records; `completion_profile`
   source_only/artifact/deployment.
6. Authorization lattice `task.effect_class ⊆ role.allowed_effects ⊆
   profile.tool_policy ∩ Cedar`; fixed `actor_class`; один source-writer на
   develop stage; custom role без class — refusal.
7. Effective plan digest + catalog/component versions у packet/HostState
   attempt/journal; Mastra snapshot — execution state; config — existing
   `ConsumerConfigurationOperation/v1`; restart recompile + digest compare;
   без нового store; активація після repair/quiescence.
8. Нові роботи — лише `generic-development`/`vida-development`; п'ять legacy
   workflows — history-only; persisted runs не переписуються; binding migration
   — одна supported operation.
9. Package update: previous/current/incoming currentness/disposition; після
   origin split managed edit — conflict, custom bytes/switches зберігаються;
   provenance один owner, activation conflicts і security floor не обходяться.
10. Порядок: P0 bugs → P1 optimizations → P2 catalog; contracts/compiler →
    codec/init/adoption → generic + 3 presets → fixed VIDA + delivery adapter →
    CLI/effective plan → qualification. Без Source до design approval і plan check.

## Технічна конкретизація Root для targeted re-check

- Поточна Root revision: один project manifest + 5 package/5 custom component
  files + enabled.yaml + routing.yaml; ExecutionCatalogComponent/Enablement,
  ExecutionRouting → один AgentRuntimeConfig codec. Старі запропоновані
  agents.yaml/flows.yaml umbrellas не підтримуються як ще один layout.
- Existing configure owner/pending namespace отримує кінцевий discriminator
  ConsumerConfigurationOperation; згадка /v1 вище ідентифікує чинного owner,
  а не зобов'язує переосмислити старі immutable journals.
- Exact candidate/target/config/receipt/DB identity, operation/generation/CAS,
  persisted result lookup, UNKNOWN fence та same-operation recovery визначені
  в [архітектурі](../../research/configuration/execution-catalog-and-teams.md#активація-exact-candidate-та-recovery).
- TestPlan/v1, DeliveryEvidence/v1, actor/effect classes, immutable level,
  typed 14 × 3 mapping, executable presets, finite obligations/joins та
  historical-only disposition визначені в тій самій canonical архітектурі.
- Два flows — package defaults; власні roles/profiles/tasks/teams/workflows
  мають qualified custom refs, repository/product scope та ті самі guards.
- File metadata: stable file_id, revision, UTC created_at/updated_at, qualified
  managed source; timestamp не заміняє digest/CAS. Entry provenance має один
  home project.catalog_provenance[origin][kind][id] з refs на file metadata.
- Нові product/kind routes зберігаються тільки у routing.yaml, а enablement
  обох origins — тільки у catalog/enabled.yaml; без shadowing/live inheritance.
- Root disposition SWE-2 split-review: final routing input = admitted work/kind/
  project set + explicit allowed route/level. Intent/flags/labels зберігаються
  у Work bindings; intent може впливати на registered internal branch, risk —
  на mandatory obligations; вони не обирають workflow. Caller team відхиляється,
  old filter bindings потребують explicit migration disposition без fallback.
- Repair зберігає фізичні DB paths/data/history; config layout не вмикає
  storage merge. Removal condition охоплює declared adoption cohort,
  відсутність pending/UNKNOWN і видалення старих readers/dispatch/tool.
  Це всі configure/init/repair operations і bound archives: inspection має
  дати no_pending після supported disposition; інакше cutover заборонений.

## Targeted re-check та Root correction

SWE-2 Flash/V3 і DeepSeek 4.1 Flash/V2 завершили перевірку frozen R3;
обидва APPROVE_WITH_CHANGES, 0 Critical. Root виправив 4 Important:
all-pending cutover gate; delivery plan перед final assurance; єдина project
provenance map; enabled як local-only overlay, який package merge не змінює.
Оригінальні вердикти й хеші збережено; виправлення не видаються за новий PASS.

## Відкриті умови

- User підтвердив B-вимоги split/template-custom/metadata/global+product routing
  2026-11-10. Точний 13-file layout, qualified refs, fork/update і five-tier
  resolution — пропозиція Root: дві замовлені reviews завершено; user decision
  отримане 2026-11-10. 3 Important виправлено Root без додаткового review/council.
- Fresh seed: valid generic-standard route + enabled closure, empty тільки
  custom components. Root пропонує source_only за відсутності explicit outcome;
  explicit deployment потребує target, без downgrade. Rebind — full custom
  copy-on-write ancestors і shared route clone, тільки selected rule edges;
  package definitions не patch-яться. Це конкретні Root choices для погодження.
- Попередній frozen-plan PASS збережено на його input; він не поширюється
  автоматично на новий layout/routing. [План](../../plans/execution-catalog-and-teams.md)
  оновлено за impact, implementation NOT_RUN.
- Actual Source issuance, exact scope/caller/resource map та mandatory
  prewrite/maintenance gates лишаються перед кожним writer/cutover.
- Фактична qualification repair/opener boundary, negative legacy-removal
  proof та delivery нового каталогу — downstream implementation evidence.

Design approval не надає нових Source прав або дозволу prod deploy.

[Dynamic engine contract](../../system-specification.md#dynamic-engine-requirements),
[runtime-first цикл](../work-items/runtime-first-development.md), lifecycle,
ownership/CAS/UNKNOWN і user Runtime acceptance зберігаються.
