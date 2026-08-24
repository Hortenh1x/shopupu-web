# План доведения до 100% — shopupu-web

Текущее состояние: по фичам ~95% (витрина + полная админка + AI-фичи готовы), но инженерная обвязка почти отсутствует. «100%» = типы из реального OpenAPI, тесты, CI, Docker, зафиксированные версии.

## 1. Реальные API-типы (сейчас `src/generated/api.d.ts` — заглушка)
- [x] Поднять бэкенд (`../shopupu`: `docker compose up -d db && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`) → `npm run api:generate`. _(2026-08-11: сгенерировано 3945 строк, закоммичено)_
- [x] Устранить дрейф: перевести ручные типы в `src/lib/api/types.ts` на сгенерированные (или проверить соответствие), `npm run typecheck`. _(добавлен `src/lib/api/types.compat.ts` — компайл-тайм проверка каждого DTO/enum против сгенерированной схемы; найденный дрейф исправлен: sortOrder у загрузки изображений, enum-статусы shipment)_
- [x] Закоммитить сгенерированный файл или генерить его шагом CI. _(закоммичен; CI не может достучаться до localhost-бэкенда)_

## 2. Зафиксировать зависимости
- [x] В `package.json` ВСЕ зависимости стоят как `"latest"` — заменить на конкретные версии из `package-lock.json` (иначе любая переустановка без lockfile может молча сломать сборку). _(caret-диапазоны от установленных версий)_

## 3. Тесты (сейчас ноль)
- [x] Vitest + Testing Library, минимальный костяк 10–15 тестов: auto-refresh JWT в `src/lib/api/client.ts`, guest cart token + merge при логине, idempotency key, валидация checkout-формы (Zod), промокод. _(22 теста, `npm test`)_
- [x] Playwright e2e-смоук против локального бэкенда: каталог → товар → корзина → checkout со stub-оплатой. _(`npm run e2e`; с E2E_PAYMENT_CALLBACK_SECRET подписывает callback и доводит платёж до SUCCEEDED — проверено против dev-бэкенда на :8081)_

## 4. Инфраструктура
- [x] `CLAUDE.md`: команды, структура (app/features/lib), контракт с бэкендом (API 8080, CORS разрешает только localhost:3000/5173), правило «сначала api:generate».
- [x] Dockerfile (multi-stage standalone Next.js, как у portfolio) + опционально сервис `frontend` в docker-compose соседнего shopupu. _(образ собран и проверен; compose-сниппет задокументирован в README, соседний репозиторий не трогал)_
- [x] CI: `typecheck` + `build` (+ тесты из п.3). _(.github/workflows/ci.yml; e2e остаётся локальным — нужен Java-бэкенд с сидированной БД)_

## 5. Деплой
- [x] Зафиксировать, где хостится фронт для shopupu.net (`.env.production` уже указывает `NEXT_PUBLIC_API_BASE_URL=https://shopupu.net`): Vercel или VPS рядом с бэкендом; задокументировать в README. _(та же машина, что и бэкенд: Cloudflare Tunnel + path-роутинг, same-origin API; см. README «Deployment» и ../shopupu/docs/deploy-cloudflare.md)_
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` и `NEXT_PUBLIC_BANK_APP_PROTOCOL` — боевые значения. **(нужны значения от оператора: Google Cloud Console + схема банковского deep-link; чеклист в README)**
- [ ] Смоук на проде после деплоя бэкенда. **(заблокировано: shopupu.net пока не резолвится — зона/hostnames туннеля ещё не настроены в дашборде Cloudflare)**

## Локальный порт (зафиксирован)
Dev и start — **3000** (`-p 3000` в package.json). Менять нельзя: CORS бэкенда разрешает только 3000/5173/127.0.0.1:3000. Соседи разведены: portfolio → 3001, docqa UI → 3002.
