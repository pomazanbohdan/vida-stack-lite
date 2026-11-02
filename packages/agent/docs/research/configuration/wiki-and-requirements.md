---
type: Research
title: Єдина wiki, напрямки вимог і стандарт індексів
sources:
  - id: okf-spec
    resource: https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
    title: Open Knowledge Format v0.2
---
# Єдина wiki, напрямки вимог і стандарт індексів

Статус: поточний результат дослідження. Дослідник: Luna; першоджерело перевірене Root. Repository `vida-agent`, branch `main`, pin дослідника `1da684aad64b8c6272f15cb04dc33797ddf1449f`; tree dirty, чужі зміни збережені. Дата доступу до upstream: 2026-11-02. Відповідність усього Agent wiki-bundle стандарту не перевірена.

## Питання

Як застосувати наявний Open Knowledge Format до єдиної продуктової wiki з окремими напрямками BR/SR/AC/test cases?

## Встановлений стандарт

- Першоджерело — GoogleCloudPlatform Open Knowledge Format, версія 0.2. Bundle є ієрархією Markdown-концептів.[^okf-spec]
- Concept-файл має YAML frontmatter з непорожнім `type`; типи розширювані. `index.md` зарезервований для навігації.[^okf-spec]
- Індекси групують посилання під заголовками й не мають frontmatter; виняток — optional `okf_version` у root index. Nested `index.md` підтримують навігацію за напрямками.[^okf-spec]
- Root index не є upstream MUST, але користувач вимагає його для VIDA. Додаткові вимоги продукту не видаються за обов’язкові правила upstream.

[^okf-spec]: [OKF v0.2, §§3–4, 8, 11](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md).

## Локальний owner та інструменти

[Powers docs index](../../../../powers/docs/index.md), `:7,57`, і [product instructions](../../../../powers/AGENTS.md), `:307,428`, прив’язують OKF reference/bundle/checker до Powers. [Powers checker](../../../../powers/scripts/check-okf.ts), `:25,61-89,154-174`, має фіксований продуктовий bundle, потребує root index та посилання, які resolving у repository. Його успіх не був би перевіркою Agent wiki.

Bounded пошук не встановив окремого стандарту «ОКП»; це не є доказом його глобальної відсутності. У досліджених джерелах назва стандарту — OKF.

## Поточні вимоги

- Одна продуктова wiki з майбутнім GUI поверх тих самих документів.
- Окремі каталоги бізнесових і системних вимог для напрямків усередині продукту/проекту.
- Навігація через `index.md` відповідно до дослідженого OKF v0.2.
- Кінцеві актуальні документи публікуються у wiki-категоріях. Окремого `wiki_output` або internal-корпусу немає.
- Work-item storage є окремим місцем створення задач. Raw runtime receipts/UNKNOWN зберігають custody, не утворюючи ще одну wiki.

## Поточний висновок і межі

Один `documents.root`, навігаційний `documents.index`, окремий `requirements.root` та `requirements.areas.<id>` для бізнесових/системних вимог. Така явна cfg-карта є пропозицією VIDA, не YAML-форматом, який визначає OKF. Розташування коду лишається незалежним.

Поточний [Agent system specification](../../system-specification.md) зберігає канонічність; фізичне перенесення або розбиття не виконане. Root AGENTS/sidecar залишаються integration hooks. Raw custody evidence лишається у work store.

Luna не змінювала файлів і не запускала checker/tests. Vex був недоступний; локальні твердження отримані bounded direct-source оглядом. Root додає metadata та навігацію лише до створених цим workstream документів; це не підтверджує повну OKF conformance всього існуючого Agent docs tree.

Research bootstrap і чотири призначені instruction IDs прочитані з явними catalog/profile: pin commit, current-code recheck, citations/contrary-evidence brief, evidence beyond training data. Retrieval не надає дозволу на міграцію або Runtime acceptance.

## Пов’язане рішення

[Єдина wiki та вимоги продукту](../../decisions/configuration/product-documents.md) фіксує погоджений намір; [cfg-пропозиція](../../decisions/configuration/project-config.proposed.yaml) показує вкладені продуктові приклади. Точні destinations, required/optional та migration contract залишаються відкритими. [Documentation policy](../../../../../docs/agent-instructions/documentation-policy.v1.json) не видається за налаштований Agent OKF checker.
