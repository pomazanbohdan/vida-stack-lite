---
instruction_id: establish-review-scope
title: Визнач межі перегляду й простеж головні потоки
summary: "Перед оцінкою коду визнач, що саме переглядаєш, і прочитай шляхи, де помилка коштує найдорожче."
capability_tags:
  - review-code
  - audit-codebase
pattern_tags:
  - code-review
  - code-audit
conditions_applies_when: Ти переглядаєш зміну або ціле сховище і ще не визначив межі.
conditions_does_not_apply_when: "Межі перегляду вже названі, а матеріали прочитані."
artifact_contract_output_type: review-scope-map
artifact_contract_required_data:
  - мета перегляду
  - прочитані джерела
  - головні потоки
  - глибина й пропущене
artifact_contract_verified_by: every named flow is traced from input to stored result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 2
---

# Визнач межі перегляду й простеж головні потоки
Переглядай те, що назвав власник: незакомічені або індексовані зміни, гілку, запит на приєднання чи окремі файли.
Якщо власник нічого не назвав, візьми незакомічені зміни, а коли їх немає — останній коміт.
Для аудиту бери названу теку, пакет або все сховище.
Прочитай опис проєкту, конфігурацію збирання й розгортання, список залежностей, точки входу й тести.
Простеж головні потоки від появи даних до збереження й виходу.
Для кожного головного потоку назви, де дані входять, де зберігаються і де виходять.
Прочитай повністю шляхи, де є ввід користувача, гроші, доступ, записи даних, фонові задачі та спільний між процесами стан.
У великому сховищі йди глибоко туди, де помилка коштує найдорожче, а не файл за файлом.
Для зміни читай не лише диф, а й код навколо: виклики змінених функцій, те, що вони викликають, і тести.
Зміна може зламати код, якого вона не торкалася.
Запиши, які частини прочитав повністю, а які лише переглянув.
Запиши, які частини не читав узагалі.
Не оцінюй те, чого не прочитав.
Не підмінюй карту перегляду переказом дифа.
Заверши, коли межі названі, головні потоки простежені, а глибина й пропущене зафіксовані.
