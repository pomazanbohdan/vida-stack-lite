---
instruction_id: write-report-in-plain-language
title: "Пиши звіт так, щоб його зрозумів той, хто не бачив коду"
summary: "Почни з опису предмета у двох-трьох реченнях і пиши короткими реченнями, пояснюючи терміни при першій згадці."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: "Звіт читатиме людина, яка може не знати цього коду."
conditions_does_not_apply_when: "Звіт призначений лише для того, хто вже знає код."
artifact_contract_output_type: plain-language-report
artifact_contract_required_data:
  - опис предмета
  - знахідки
  - пояснення термінів
artifact_contract_verified_by: a reader who does not know the code understands each finding
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
revision: 3
---

# Пиши звіт так, щоб його зрозумів той, хто не бачив коду
Почни звіт з опису предмета у двох-трьох реченнях.
Для зміни скажи, що вона робить.
Для сховища скажи, що воно робить.
Пиши короткими реченнями.
Використовуй звичайні слова.
Уникай жаргону.
Поясни технічний термін при першій згадці.
Пиши так, ніби читач не бачив цього коду.
Назви конкретні дані й результати замість загальних оцінок.
Переходь до знахідок після опису.
Не починай звіт зі списку знахідок.
Не вживай скорочень без розшифрування.
Тримай одну думку в реченні.
Заверши, коли кожен абзац зрозумілий без додаткового контексту.
