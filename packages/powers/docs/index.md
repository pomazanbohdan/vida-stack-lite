---
okf_version: "0.2"
---

# Vida Powers — продуктова документація

Bundle документації продукту Vida Powers у форматі Open Knowledge Format v0.2.
Концепції — research і план впровадження; історія змін — у журналі bundle.
Формат, довіра, життєвий цикл і provenance зафіксовані в frontmatter кожної
концепції.

# Концепції

* [Vida Powers — план впровадження](implementation-plan.md) - Порядок етапів, ворота й приймальні критерії реалізації: від реєстрації продукту й канонічних документів до конвертації корпусу, Router, матеріалізації, Runtime-інтеграції та Standalone-режиму.
* [Vida Powers — продуктова концепція та архітектурний baseline](research/vida-powers-product-research.md) - Фіналізована концепція: межі VP і VIDA Runtime, канонічний instruction corpus із двома вимірами тегів, методологічна політика, artifact-first матеріалізація, Findings, wiki/work layout і режими Configured/Dynamic.

# Журнал

* [Оновлення bundle](log.md) - Хронологія змін концепцій документації: дата, вид зміни, що саме змінилося.

# Рішення

* [D1 — Розташування продукту Vida Powers](decisions/D1-product-placement.md) - VP живе в `packages/powers` як третій продукт репозиторію; `packages/plugin` лишається Codex-прослойкою між хостом Codex і агентом.
* [D2 — Модель власності й робочого простору VP у монорепозиторії](decisions/D2-ownership-and-work-space.md) - Монорепозиторій продуктів: кожен плагін має власного owner'а, документацію, набір задач і простір роботи; Work Items VP — у продукті, координація — у репозиторії.
* [D3 — Каталог інструкцій VP: самостійний плагін і розширений реєстр у пакеті агента](decisions/D3-instruction-catalog-and-registry.md) - VP зберігає власний каталог і власні скрипти пошуку та використання інструкцій; у режимі збирання в пакет поставки агента пакет агента мусить мати свій розширений instruction registry.
* [D4 — Канали доставки VP: окремий плагін, збірка в пакет агента, marketplace](decisions/D4-delivery-channels.md) - Три канали доставки в scope; поверхня скілів VP: `vp-mode` (основний скіл оркестрації) і `vp-setup` (допоміжний налаштування).
* [D4b — Marketplace-власник VP і набір хостів першого релізу](decisions/D4b-marketplace-and-hosts.md) - `packages/powers` сам є marketplace-власником; Codex — перевірений перший хост, решта — заявлена підтримка.
* [D5 — Decision Provider і роутінг у VP: provider-нейтральний інтерфейс, LLM-вибір і формування агентів](decisions/D5-decision-provider.md) - Контракт `decision.evaluate` з двома реалізаціями та обов'язковим Agent Fallback; роутінг = вибір LLM, формування агентів і рівень флоу.

# Поза межами bundle

* [Маніфест донорських джерел](../donors.yaml) - Точні ревізії восьми донорських репозиторіїв (7 методологічних + Open Knowledge Format), ліцензії та лічильники файлів. Не є OKF-концепцією: це машинний маніфест джерел для конвертації корпусу.
