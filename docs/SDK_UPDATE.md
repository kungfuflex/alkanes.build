# Обновление @alkanes/ts-sdk

## Два режима установки

### 1. Production — тарбол с pkg сервера

```bash
pnpm add "https://pkg.alkanes.build/dist/@alkanes/ts-sdk?v=0.1.4-<commit>"
```

SDK устанавливается в `node_modules/.pnpm/...` как обычный пакет. Webpack aliases работают штатно.

### 2. Dev — symlink на локальный alkanes-rs

```bash
pnpm add /path/to/alkanes-rs/ts-sdk
```

SDK становится symlink: `node_modules/@alkanes/ts-sdk -> ../alkanes-rs/ts-sdk`. Это создаёт проблемы с webpack resolution.

## Проблема: `Cannot find module '@alkanes/ts-sdk/wasm'`

### Причина

Внутри `ts-sdk/dist/index.mjs` есть динамические импорты:

```js
const { ... } = await import('../wasm/alkanes_web_sys');
```

При установке из тарбола webpack ловит этот импорт через `NormalModuleReplacementPlugin` и подставляет локальную WASM копию из `lib/oyl/alkanes/`.

При symlink'е webpack резолвит `../wasm/alkanes_web_sys` относительно **реального** пути (`alkanes-rs/ts-sdk/dist/`) — а не `node_modules/`. Стандартные alias'ы `@alkanes/ts-sdk/wasm` не срабатывают, т.к. request уже превратился в абсолютный путь через symlink.

### Решение (next.config.ts)

Три точки фикса:

**1. Alias'ы — добавить реальные пути через symlink:**

```ts
const realSdkPath = fs.existsSync(sdkWasmPath)
  ? fs.realpathSync(path.join(__dirname, "node_modules/@alkanes/ts-sdk"))
  : null;

config.resolve.alias = {
  "@alkanes/ts-sdk/wasm": localWasmPath,
  [sdkWasmPath]: localWasmPath,
  // Symlink-resolved paths
  ...(realSdkPath ? {
    [path.join(realSdkPath, "wasm")]: localWasmPath,
    [path.join(realSdkPath, "wasm/alkanes_web_sys")]: localWasmPath,
    [path.join(realSdkPath, "wasm/alkanes_web_sys.js")]: localWasmPath,
  } : {}),
};
```

**2. NormalModuleReplacementPlugin — расширить regex:**

```ts
new webpack.NormalModuleReplacementPlugin(
  /@alkanes\/ts-sdk\/wasm$|\/wasm\/alkanes_web_sys$/,
  localWasmPath
)
```

**3. ContextReplacementPlugin — добавить паттерн для alkanes-rs:**

```ts
new webpack.ContextReplacementPlugin(
  /@alkanes\/ts-sdk|alkanes-rs\/ts-sdk/,
  path.join(__dirname, "lib/oyl/alkanes"),
  {
    "@alkanes/ts-sdk/wasm": "./alkanes_web_sys.js",
    "../wasm/alkanes_web_sys": "./alkanes_web_sys.js",
  }
)
```

## Процедура обновления SDK

### Из develop ветки alkanes-rs

```bash
# 1. Обновить alkanes-rs develop
cd /path/to/alkanes-rs
git checkout develop
git pull origin develop
# (если конфликт — git stash && git pull origin develop)

# 2. Установить в alkanes.build
cd /path/to/alkanes.build
pnpm add /path/to/alkanes-rs/ts-sdk

# 3. Очистить кэш и перезапустить
rm -rf .next
pnpm dev
```

### Возврат на production тарбол

```bash
# Узнать коммит
cd /path/to/alkanes-rs
git log --oneline -1  # например 9e11c265

# Установить из pkg сервера
cd /path/to/alkanes.build
pnpm add "https://pkg.alkanes.build/dist/@alkanes/ts-sdk?v=0.1.4-9e11c265"
rm -rf .next
pnpm dev
```

## Важно

- **Всегда удаляй `.next`** после смены SDK — webpack кэш хранит старые пути
- **WASM файлы** (`lib/oyl/alkanes/`) — это отдельная локальная копия, НЕ из SDK. Обновлять их нужно вручную если WASM API изменилось
- **Protostone модуль** — чистый TypeScript, НЕ зависит от WASM. Работает в обоих режимах
- Тесты `sdk-version.test.ts` падают при symlink-режиме (проверяют URL формат) — это ожидаемо
