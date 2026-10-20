---
instruction_id: separate-blocking-slowdowns
title: Відділяй справжнє гальмування від дрібної оптимізації
summary: "Велике сповільнення є дефектом, а дрібний виграш у гарячому циклі — лише пропозицією."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Оцінка стосується швидкості виконання.
conditions_does_not_apply_when: Задача не має вимог до швидкості або вимірюваного навантаження.
artifact_contract_output_type: speed-finding-classification
artifact_contract_required_data:
  - місце сповільнення
  - мітка дефекту або пропозиції
  - випадок
  - очікуване навантаження
artifact_contract_verified_by: each speed finding is labeled as a defect or a suggestion
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

# Відділяй справжнє гальмування від дрібної оптимізації
Оцінюй швидкість після правильності, безпеки, навантаження й тестів.
Вважай дефектом сповільнення, що заважає роботі на очікуваному навантаженні.
Вважай пропозицією дрібний виграш, що не змінює поведінку.
Познач роботу, повторену в гарячому циклі.
Назви місце, де час витрачається, і чому це видно з коду.
Врахуй контекст: для частини систем кожна мілісекунда є вимогою.
Відділяй сповільнення від неправильного результату.
Не підвищуй дрібний виграш до дефекту.
Не знижуй велике сповільнення до дрібниці.
Не підмінюй дефект правильності розмовою про швидкість.
Назви випадок, у якому сповільнення проявляється.
Познач вузьке місце, яке не вдалося оцінити.
Не пропонуй ускладнення заради виграшу, якого ніхто не відчує.
Заверши, коли кожна знахідка має мітку дефекту або пропозиції.
