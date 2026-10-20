---
instruction_id: check-requested-feature-usage
title: Перевіряй потребу в запропонованій функції
summary: "Перед реалізацією правильної функції перевір, чи її справді викликають, і відкидай невикористане."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: Зауваження або запит пропонує реалізувати нову функцію.
conditions_does_not_apply_when: Функція вже має підтверджених споживачів у коді.
artifact_contract_output_type: usage-check
artifact_contract_required_data:
  - функція
  - місця виклику
  - рішення
artifact_contract_verified_by: code search for actual callers
compatibility_excludes: []
compatibility_requires:
  - minimize-code-surface
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/receiving-code-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 4
---

# Перевіряй потребу в запропонованій функції
Визнач, яку функцію просять реалізувати.
Знайди всі місця, де вона має викликатися.
Перевір фактичне використання в коді.
Якщо викликів немає, запропонуй видалити функцію.
Якщо виклики є, реалізуй її повністю.
Перед тим як назвати код невикористаним, шукай його по всьому дереву.
Шукай у тестах, фікстурах, конфігурації, рядкових і динамічних посиланнях.
Не називай код мертвим лише за відсутністю викликів у дифі.
Не додавай функцію лише тому, що вона виглядає професійно.
Не розширюй обсяг без підтвердженого використання.
Зафіксуй доказ використання або його відсутності.
Повідом власнику про невикористану функцію.
Не залишай мертвий код як заготовку.
Перевір, що видалення не ламає наявні виклики.
Не вважай згадку в зауваженні доказом використання.
Не вигадуй майбутніх споживачів.
Звіряй межу зміни з minimize-code-surface.
Не додавай прапорець для невикористаної можливості.
Заверши лише після рішення про долю функції.
