# Directory Update Log

## 2026-10-19
* **Creation**: [Рішення D2 — модель власності й робочого простору](decisions/D2-ownership-and-work-space.md) зафіксовано: VP реалізується як монорепозиторій продуктів — кожен плагін має власного owner'а, власну документацію, власний набір задач і власний простір роботи; Work Items і докази VP живуть у продукті (`packages/powers/docs/work/`), координація — у репозиторії (`.agent/`).
* **Creation**: [Рішення D1 — розташування продукту](decisions/D1-product-placement.md) зафіксовано: Vida Powers живе в `packages/powers` як третій продукт репозиторію; `packages/plugin` лишається Codex-прослойкою між хостом Codex і агентом. Додано розділ «Рішення» до bundle-індексу.
* **Update**: [План впровадження](implementation-plan.md) оновлено до rev 2.1 — застосовано зауваження незалежного рев'ю раунду 2: додано рішення D8 (де живе схема методологічного профілю) і Runtime-запит у Stage 4, уточнено D-07 (точний склад `artifact_contracts`, поле `implementation_fingerprint`), задокументовано жорсткий шаблон `source_path` реєстру й Root-інтеграцію проекції, узгоджено DAG із таблицею залежностей, закрито прогалини покриття research §12, §7.3, §9.3 і §5.
* **Update**: [Research-документ](research/vida-powers-product-research.md) переведено на frontmatter OKF v0.2 — `type`, `sources` із сигналами довіри (`author`, `last_modified`), `generated`, `verified`, `status`, `stale_after`; журнал змін research перенесено з окремого файлу в цей bundle-лог, як вимагає сам документ (§7.1).
* **Creation**: [План впровадження](implementation-plan.md) створено (rev 1) і переписано (rev 2) після незалежного рев'ю раунду 1 — вердикт REJECTED, 6 blocker, 12 major, 4 minor.
* **Creation**: [Research-документ](research/vida-powers-product-research.md) додано до bundle; сам документ згенеровано 2026-10-17.
* **Creation**: Bundle-індекс [index.md](index.md) створено, bundle проголошено як Open Knowledge Format v0.2 через `okf_version`.
