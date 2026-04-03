# Локалізація StableFit (`locales/*.json`)

Файли `ua.json` та `en.json` мають **однакову структуру ключів**. У коді використовується `data-i18n="шлях.до.ключа"` (крапка як роздільник).

## Загальні ключі (усі сторінки з `main.js` / перекладами)

Ці гілки підключаються на **кожній** сторінці, де є відповідні атрибути:

| Гілка | Призначення |
|--------|-------------|
| `meta` | `title`, `brand`, `logoAlt` — шапка, `<title>`, alt логотипу |
| `nav` | `coaches`, `clients`, `support` — навігація між лендінгами |
| `buttons` | `download`, `tryFree`, `tryNow` — кнопки |
| `aria` | `langUa`, `langEn` — підказки для перемикача мови |
| `card` | `footerScan` — підпис під QR у картках завантаження |
| `footer` | Опис бренду, блок «Платформа», контакти, реквізити, копірайт, privacy/terms |

## Сторінка тренера — `coach/index.html`

Уся верстка секцій бере текст з **`coach.*`**:

- `coach.hero` — hero
- `coach.features` — проблеми / рішення
- `coach.functionality` — акордеон + заголовок секції
- `coach.progress`, `coach.automatisation`, `coach.testimonials`, `coach.pricing`, `coach.downloadApp`, `coach.howToStart`

## Сторінка клієнта — `client/index.html`

Тексти клієнтського лендінгу — **`client.*`**:

- `client.hero`
- `client.functionality` — окремі копії для клієнта (заголовок секції + слайди `items.program`, `feedback`, `nutrition`, `progressTracking`, `communication`)
- `client.progress`, `client.howToStart`, `client.testimonials`, `client.downloadApp`

## Сторінки без повного i18n

`privacy-policy/`, `terms-and-conditions/`, `support/` зараз мають переважно статичний текст у HTML; спільні елементи (навбар, футер) можуть використовувати `meta`, `nav`, `buttons`, `footer` за потреби.

## Кеш браузера

У `script/main.js` змінюється **`LOCALE_CACHE_VERSION`**, коли структура JSON ламає сумісність зі старим кешем у `localStorage`.
