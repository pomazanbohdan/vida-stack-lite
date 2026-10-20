---
instruction_id: inspect-security-surface
title: Перевіряй поверхню безпеки на межах довіри
summary: "Шукай ін'єкції, слабку випадковість, секрети в коді та відсутні перевірки вводу користувача."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "Код має зовнішній вхід, працює з доступом, грошима або секретами."
conditions_does_not_apply_when: Код не має зовнішнього входу й не працює з чутливими даними.
artifact_contract_output_type: security-surface-review
artifact_contract_required_data:
  - перелік входів
  - шлях вводу
  - відсутня перевірка
  - випадок використання
artifact_contract_verified_by: each security finding names the input path and the missing check
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

# Перевіряй поверхню безпеки на межах довіри
Переліч усі входи від користувача, мережі, файлів і зовнішніх сервісів.
Прочитай повністю шляхи, де є гроші.
Прочитай повністю шляхи, де є доступ.
Перевір, чи кожен вхід проходить перевірку на межі довіри.
Шукай ін'єкції в запитах, командах, шаблонах, шляхах і десеріалізації.
Шукай слабку випадковість там, де потрібні токени, ключі або ідентифікатори.
Шукай секрети, вбудовані в код, конфігурацію або логи.
Для кожної знахідки назви шлях вводу й відсутню перевірку.
Назви випадок, у якому вхід дає небажаний результат.
Не вигадуй загрозу без шляху використання.
Не знижуй відому дірку до дрібниці.
Не додавай рівень захисту, якого проблема не потребує.
Познач вхід, який не вдалося перевірити.
Заверши, коли кожен вхід перевірено й кожна знахідка має шлях і випадок.
