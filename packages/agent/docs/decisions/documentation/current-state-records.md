---
type: Decision Record
title: Актуальні тематичні ресерчі та рішення
---
# Актуальні тематичні ресерчі та рішення

Статус: погоджено прямими поточними інструкціями користувача. Власник продукту: Agent; publisher/координатор: Root.

## Правило

- Дослідження належить продуктові й розміщується за темою: `packages/agent/docs/research/<topic>/<subject>.md` для Agent; інші продукти мають свої configured locations.
- Рішення належить тому самому продуктові: `packages/agent/docs/decisions/<topic>/<subject>.md`.
- На тему є один активний документ. Кожне уточнення оновлює його на місці: питання, факти, висновок, статус і невирішене.
- Рішення фіксується одразу після явного погодження; не чекає закриття задачі або реалізації.
- Рішення містить посилання на research evidence; research містить посилання на пов’язане рішення.
- Поточний стан не містить хронологічних дописів, r1/r2 копій або переліку відкинутих проміжних формулювань. Історію версій зберігає Git.
- У створених концептах застосовується OKF v0.2 YAML `type`. `index.md` є навігацією без concept frontmatter; посилання згруповані за темами. Root index є вимогою VIDA; повна conformance всього існуючого дерева потребує своєї перевірки.
- Запропонований намір, погоджений намір, implemented Source і Runtime acceptance позначаються окремо. Зміна evidence, яка впливає на рішення, оновлює його status/відкриті питання до залежної дії.
- Збережені raw captures, custody receipts і fenced UNKNOWN не видаляються; вони залишаються evidence під configured work root і не є активними research/decision documents.

## Застосування інструкцій

Root застосовує `vida-bootstrap` orchestrator та відповідні research/documentation sources перед synthesis/publication. Research agents читають base + рівно одну research delta, отримують bounded envelope і відповідні profile-aware instruction IDs до дослідження. Research lane лишається read-only, якщо write authority не видана окремо; Root публікує результат до продуктового місця.

Докази retrieval і перевірок зберігаються під configured work root; вони не створюють ще одну authority для продуктового рішення. Технічний receipt не заміняє перевірку змісту.

## Підстави

- Користувач: кожне дослідження й рішення має своє продуктове місце; дослідження розділені тематично; уточнення негайно оновлюють активні записи.
- [Дослідження документів](../../research/configuration/product-documents.md): класи і source ownership.
- [Product context](../../../../../AGENT.sidecar.md): project-owned locations, role/bootstrap policy та ownership.

Поточні записи: [research index](../../research/index.md), [decision index](../index.md).
