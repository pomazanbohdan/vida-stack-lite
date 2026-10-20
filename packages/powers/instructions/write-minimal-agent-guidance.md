---
instruction_id: write-minimal-agent-guidance
title: Пиши найменшу настанову під спостережений збій
summary: "Додавай лише те, що усуває зафіксований збій, і не розширюй текст для гіпотетичних випадків."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: Базовий збій уже зафіксований і треба написати текст настанови.
conditions_does_not_apply_when: Базової перевірки ще не було.
artifact_contract_output_type: agent-guidance
artifact_contract_required_data:
  - спостережені збої
  - вимоги
  - заборони
  - приклад
artifact_contract_verified_by: each observed failure maps to a rule
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
status: active
revision: 1
---

# Пиши найменшу настанову під спостережений збій
Почни з переліку спостережених збоїв.
Для кожного збою сформулюй одну вимогу.
Пиши наказовими реченнями.
Вказуй порядок дій.
Вказуй, що заборонено.
Вживай ті самі терміни, що й решта настанов.
Додай ознаки, за якими виконавець розпізнає спокусу порушити правило.
Не додавай положень для випадків, яких не бачив.
Не дублюй те саме правило різними словами.
Не переноси історію одного випадку.
Прибери пояснення очевидного.
Залиш один сильний приклад замість кількох.
Перевір, що текст самодостатній.
Порівняй обсяг із кількістю закритих збоїв.
Не розширюй настанову без нового спостереження.
Повідом, які збої лишилися незакритими.
