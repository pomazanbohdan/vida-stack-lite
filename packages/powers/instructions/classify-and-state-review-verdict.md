---
instruction_id: classify-and-state-review-verdict
title: Класифікуй знахідки й дай ясний висновок
summary: "Розділяй знахідки за впливом і завершуй перегляд рішенням: готово, не готово або після виправлень."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Перегляд зібрав знахідки й потребує підсумку.
conditions_does_not_apply_when: Перегляд ще не завершено.
artifact_contract_output_type: review-verdict
artifact_contract_required_data:
  - знахідки
  - рівні
  - сильні сторони
  - висновок
artifact_contract_verified_by: verdict follows finding severity
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/requesting-code-review/code-reviewer.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 4
---

# Класифікуй знахідки й дай ясний висновок
Класифікуй кожну знахідку за фактичним впливом.
Поясни, що саме неправильно.
Поясни, чому це важливо.
Назви сильні сторони зміни конкретно.
Окремо переліч те, що вирішив не оцінювати.
Додай до цього переліку те, чого не вдалося запустити або прочитати.
Дай висновок: готово, не готово або після виправлень.
Назви номери знахідок, які треба виправити першими, щоб власник міг відповісти номерами.
Для здорової зміни скажи, що виправляти нічого, і назви, що саме перевірив.
Коли є знахідки про скорочення, назви пораховану кількість рядків і залежностей, які можна прибрати.
Підсумуй залишковий ризик.
Не пиши виглядає добре.
Не підвищуй дрібницю до блокера.
Не приховуй знахідку без місця доказу.
Не давай оцінку без прочитаної зміни.
Не наводь оцінку скорочення без підрахунку в прочитаному коді.
Познач незакриті питання.
Заверши перегляд одним рішенням.
