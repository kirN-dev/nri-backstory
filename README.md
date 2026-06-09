# Конструктор предысторий для НРИ

SPA на Vite + React + TypeScript + Tailwind + Zustand. Hash-роутинг, деплой на GitHub Pages.

## Этап 1 — каркас (текущий)

5 страниц-заглушек: Главная `/`, Анкета `/quiz`, Карта `/map`, Результат `/result`, Админ `/admin`.

## Локальный запуск

```bash
npm install
npm run dev      # http://localhost:5173/nri-backstory/
npm run build    # сборка в dist/
npm run preview  # предпросмотр сборки
npm test         # юнит-тесты (появятся на Этапе 2)
```

## Первая публикация (делается один раз)

1. Залить файлы в репозиторий `kirN-dev/nri-backstory` в ветку `main` (команды ниже).
2. В браузере: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. После push вкладка **Actions** покажет сборку. По завершении сайт будет тут:
   `https://kirn-dev.github.io/nri-backstory/`

### Команды git (из папки проекта)

```bash
git init
git add .
git commit -m "Этап 1: каркас и деплой"
git branch -M main
git remote add origin https://github.com/kirN-dev/nri-backstory.git
git push -u origin main
```

## Важное

- `vite.config.ts` → `base: '/nri-backstory/'` — без этого на Pages не загрузятся ассеты.
- Роутер в hash-режиме (`/#/...`) — чтобы перезагрузка любой страницы не давала 404.
- Пароль админа будет зашит как `admin` на Этапе 5 — это **не** настоящая защита.
