---
instruction_id: automate-enforceable-rules
title: "Автоматизуй те, що можна перевірити механічно"
summary: "Правило, яке перевіряється автоматично, переноси в перевірку, а настанову лишай для судження."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: Правило можна перевірити без розуміння контексту.
conditions_does_not_apply_when: Правило вимагає судження або оцінки наміру.
artifact_contract_output_type: automated-rule
artifact_contract_required_data:
  - правило
  - перевірка
  - повідомлення про порушення
artifact_contract_verified_by: automated check fails on a real violation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/anthropic-best-practices.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-encode-lessons-in-structure/SKILL.md
status: active
revision: 2
---

# Автоматизуй те, що можна перевірити механічно
Визнач, чи правило можна перевірити механічно.
Якщо можна, додай перевірку в робочий процес.
Зроби помилку видимою до завершення.
Не тримай механічне правило лише в тексті.
Не дублюй перевірку й текстове нагадування.
Залиш у настанові причину правила й межі.
Для судження залиш настанову.
Перевір, що автоматика не пропускає виняток.
Перевір, що автоматика не блокує правильну роботу.
Опиши, як виправити порушення.
Не приховуй правило в ненаглядній перевірці.
Дай зрозумілу помилку.
Онови настанову після зміни перевірки.
Не автоматизуй те, що потребує контексту.
Коли впіймав себе на повторі тієї самої настанови, закодуй правило в перевірку, прапорець метаданих або скрипт.
Для правила, що потребує судження, зроби настанову помітнішою й додай приклад самого порушення.
Структурне виправлення замінює текст, а не дублює його.
Вважай текст настанови симптомом, коли ту саму помилку вже виправляли двічі.
Перевір автоматику на реальному порушенні.
