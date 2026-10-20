---
instruction_id: review-code-quality-and-tests
title: Перевіряй якість коду й доказовість тестів
summary: "Оцінюй розділення відповідальностей, обробку помилок, межові випадки й тести, які доводять поведінку."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "Зміна містить код, конфігурацію або тести."
conditions_does_not_apply_when: Зміна є лише текстом документа без поведінки.
artifact_contract_output_type: quality-review
artifact_contract_required_data:
  - якість коду
  - обробка помилок
  - тести
  - ризики
artifact_contract_verified_by: tests demonstrate behavior and edge cases
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/requesting-code-review/code-reviewer.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 3
---

# Перевіряй якість коду й доказовість тестів
Перевір розділення відповідальностей.
Перевір обробку помилок.
Перевір типи й сумісність інтерфейсів.
Для зміни підпису, значення, що повертається, або поведінки знайди всіх викликів, а не лише ті, що є в дифі.
Вважай знахідкою виправлення в одному виклику, коли спільна функція лишається зламаною.
Перевір, чи тести доводять реальну поведінку.
Перевір, чи тести не перевіряють підміни.
Перевір покриття важливих шляхів.
Перевір читабельність і відсутність зайвої складності.
Перевір, чи зміна не ламає сусідній код.
Не підвищуй стиль до блокера без впливу.
Не знижуй дефект правильності до дрібниці.
Не вимагай переписати код поза межами задачі.
Не вважай зелені тести доказом повноти.
Познач тести, які нічого не ловлять.
Не оцінюй код, якого не бачив.
Дай окремий висновок про якість.
