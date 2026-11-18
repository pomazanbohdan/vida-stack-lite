---
type: Research
title: Numeric qualification — scope, inventory та readiness
---
# Numeric qualification

Статус: дослідження завершено; numeric admission, coverage та CRAP залишаються OPEN. Source owners перевірено в isolated `t3-633db6a6` на `54d354a5da5f08cdad317ce3914c6f98d97d6274`; Task2 зміни ще не інтегровані в main. Read-only handoff: `.agent/work/runtime-project-model-implementation-20261102/task2-numeric-owner-map.md` у repository evidence store.

## Чинний owner

- [Package coverage runner](../../../tooling/run-bun-coverage.ts) через repository adapter `tooling/agent/run-coverage.ts` виконує current qualification для всіх supported tests і всіх maintained production sources. CLI не має current selected-scope admission. Історичний `--published-baseline=b549951` не є поточним контуром.
- Programmatic `focusedDiagnostic` приймає `{contour,sources,tests}`, але результат diagnostic-only й не проходить current CRAP gate. Він не замінює final qualification. Підтримуваного shard/counter-union або parallel-wave admission не встановлено.
- [Pinned Bun wrapper](../../../bin/bun.ts) починає єдину300000мс межу до package/runtime checks. Typecheck, capture, instrumentation, SDK preparation, producer, report validation і CRAP споживають спільний залишок;30000мс резервують cleanup/report. Окремий ordinary test timeout не збільшує цей wall.
- Producer використовує serial `--timeout5000 --parallel=1 --no-isolate` й explicit captured test paths. Немає дозволу на новий collector, scope shrink чи збільшення wall заради GREEN.

## Inventory і докази

[Maintained source inventory](../../../tooling/maintained-source-inventory.ts) виводиться з package `files`, а не з факту test import. Root зареєстрував у candidate `src/work-items/**` та обидві model schemas: фактичний inventory містить160 sources, зокрема catalog/key/store/product-model; `missingPackageSources:[]`. Package SHA256 `bb80b8872a6c0caae4fbfdbf781ef007a6e5ce9d7e0dea948b2ae26ff5f86b5e`. Це package-files-only prerequisite; active cfg/schema adoption, CLI та exports залишаються Task4.

[Shared AST inventory](../../../tooling/function-inventory.ts), source maps, process/capture fingerprints і counters мають відповідати тим самим bytes. Чинна вимога:100% function/statement/line/branch, повна identity correspondence та належні CRAP budgets. Нові або змінені Task1/Task2 callables не можна виключати заради проходження gate.

## SDK та ordinary regressions

Обидва provider/admission regression files потребують SDK artifacts. Repository owner `tooling/agent/sdk-coverage-readiness.ts` формує або перевіряє captured-input SDK outputs із власними publication/rollback/lock guards; тести не повинні виконувати build самостійно.

Root виконав цей owner на current candidate: exit0, closeObserved:true,3037.1634мс, inputs unchanged; receipt `sdk-readiness/receipt.json` у candidate work store. Це локальна SDK test formation, не standalone build, install, release чи Runtime acceptance.

Історичний ordinary Task2 selection на store `0cb45dd6…`:30pass/317assertions за204264.3562мс, усі21inputs unchanged. Receipt `hardening/final-behavior/terminal.json`, SHA256 `b29c33e209a8de5c2495ae4e95790821d4c5649ce372b8beb963d09153607586`. Пізніше виправлення codec/counter змінило store; цей receipt не є перевіркою нових bytes. Час ordinary run не доводить, що повна instrumented selection вкладається в300000мс.

Історичний baseline двох повних provider/admission regression files:76tests/59pass/17fail/754assertions,172345.9449мс, exit1/closeObserved,751inputs unchanged. Збережено12canonical-relative-path failures,4EBUSY cleanup failures і1symlink-creation EPERM. Raw evidence: старий candidate `broad-regressions/`; corrected attribution `summary-r2.json`.

Root завершив Source-виправлення fixtures у `t3-940f3436`: canonical relative paths, admission-owned close, контрольований configured-init fixture та відмови historical reads зі збереженням state/ledger/action/transition rows. Повний `review-full76-04` виконав75pass/1fail/888assertions; єдиний failure — чинний symlink-creation EPERM. Усі16раніше виправлених non-environmental cases пройшли. Повний library `review-library30-03` має29pass/1timeout,301JUnit assertions; strict-record case перетнув15000мс під час overlap з regression campaign. Окремий single-case diagnostic пройшов1test/31assertions у чинній межі; причина попереднього timeout не доведена, і цей diagnostic не замінює failed full receipt. Caps не збільшені; failed/UNKNOWN roots не відкривались і не повторювались.

Перед наступною qualification Root виявив stale SDK input binding до попереднього store. Чинний SDK owner завершив `review-sdk-requalify-06`: exit0/closeObserved, Source/HEAD unchanged, candidate lock відсутній. Новий `dist/sdk-formation.json` SHA256 `98816217f6f57d6cde5b1a41eb9f60cf883d662ec1fbe7db764f258e432d6d09`; усі169declared inputs збігаються з поточним Source. Попередні runs залишаються bound до старого SDK stamp. На новому stamp окремий послідовний процес `review-library30-serial-07` пройшов30tests/332assertions/0fail; наступний `review-full76-current-sdk-08` виконав75pass/1symlink-EPERM/888assertions/0skip. Обидва мають exact selection/caps, observed closure та незмінні Source/driver/HEAD. П’ять current-stamp static checks також пройшли; main SDK lock не змінювався. Frozen correction packet SHA256 `cd624433d33730d7ab51f7b0762e635f68124930b0f685a6cfae5f07c7e8082b`: `.agent/work/runtime-project-model-implementation-20261102/resume-20261103/review-fixes/correction-packet.json`. Незалежний recheck потрібен перед Source integration. Це ordinary Source/SDK evidence; full76GREEN, numeric, delivery та Runtime acceptance не встановлені.

## Наступне рішення

Root має сформувати конкретний план current qualification з фактичним inventory, shared-AST/CRAP correspondence та finite budget; незалежний review передує numeric execution. Якщо чинний full route не вкладається у frozen wall, потрібне окреме обґрунтоване рішення existing owner; focused diagnostic не оголошується qualification. Historical FAIL/UNKNOWN, locks та fixtures залишаються незмінними.

Пов’язано: [implementation plan](../../plans/runtime-project-model.md), [Windows safe publication](windows-safe-publication.md), [LibSQL cleanup](windows-libsql-cleanup.md), [TESTING](../../../TESTING.md).
