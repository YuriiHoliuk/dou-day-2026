# DOU Day 2026 — Мій план

Неофіційний агенда-компаньйон для DOU Day 2026. Збирай свій ідеальний день
конференції: фільтруй доповіді, відмічай улюблені, ділись планом з друзями
та завантажуй PDF. Працює офлайн як PWA.

## Стек

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (через `@tailwindcss/vite`)
- **shadcn/ui** (Radix-based components, base color `slate`)
- **zustand** (з `persist` у `localStorage`)
- **react-router-dom**
- **vite-plugin-pwa** (`autoUpdate`, Workbox runtime caching)
- **lucide-react** для іконок

## Розробка

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # збірка в ./dist
npm run preview   # локальний preview збірки
npm run lint
```

Шлях `@/*` відображається на `./src/*` (див. `tsconfig.app.json` та
`vite.config.ts`).

## База URL

За замовчуванням `base` дорівнює `/dou-day-2026/` (для GitHub Pages під
шляхом `<user>.github.io/dou-day-2026/`). Перевизначити можна через
змінну `VITE_BASE`:

```bash
VITE_BASE=/ npm run build         # для кореневого деплою
VITE_BASE=/інший/ npm run build   # для іншого префіксу
```

## Деплой на GitHub Pages

1. Запушити в `main`.
2. У налаштуваннях репозиторію → **Pages** → джерело `GitHub Actions`.
3. Workflow `.github/workflows/deploy.yml` збере проєкт із
   `VITE_BASE=/dou-day-2026/` та задеплоїть `dist/` через
   `actions/deploy-pages`.

Якщо репозиторій матиме іншу назву — оновити `VITE_BASE` у workflow.

## Структура

```
src/
  components/      App components
    ui/            shadcn primitives
  data/            Parsed agenda data (filled by scraper)
  hooks/           React hooks
  lib/             utils, urlState, storage, pdf
  pages/           Route components (Timeline, MySchedule, Friends, Compare)
  store/           zustand stores (schedule)
  App.tsx          Router shell + hero
  main.tsx         Bootstrap + SW registration
  index.css        Tailwind import + shadcn tokens + print rules
public/
  icons/           PWA icons (192, 512, maskable 512) — поки що плейсхолдери
```

## PWA

Service worker генерує `vite-plugin-pwa` під час білда. Стратегії:
NetworkFirst для навігації, StaleWhileRevalidate для скриптів/стилів,
CacheFirst для зображень. Маніфест українською: «DOU Day 2026 — Мій план».

Іконки в `public/icons/` — плейсхолдери, замінити фінальними артами.
