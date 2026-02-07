# Connect Wallet Modal — Design Documentation

## Overview

`components/ConnectWalletModal.tsx` — модальное окно подключения кошелька. Полностью переработан дизайн для соответствия тёмной теме приложения.

## Структура экранов (Views)

```
select (главный экран)
├── unlock          — Разблокировка существующего кошелька
├── create          — Создание нового кошелька
│   └── show-mnemonic — Показ recovery phrase
├── restore         — Промежуточный экран восстановления
│   ├── restore-mnemonic      — Восстановление из мнемоники
│   ├── restore-json           — Восстановление из keystore файла
│   └── restore-drive-picker   — Выбор бэкапа из Google Drive
│       └── restore-drive-unlock — Разблокировка бэкапа
└── browser-extension — Подключение расширения браузера
```

## Навигация

- Стрелка `ChevronLeft` (22px) в левом верхнем углу — появляется на всех экранах кроме `select`
- Крестик `X` (22px) в правом верхнем углу — закрывает модалку на любом экране
- Навигация назад определяется через `backMap`:
  - `create`, `unlock`, `restore`, `browser-extension`, `show-mnemonic` → `select`
  - `restore-mnemonic`, `restore-json`, `restore-drive-picker` → `restore`
  - `restore-drive-unlock` → `restore-drive-picker`

## Пункты главного меню

| Пункт | Иконка | Цвет | Условие показа |
|-------|--------|------|----------------|
| Unlock Wallet | Lock | blue-400 | `hasExistingKeystore` |
| Create Wallet | Plus | green-400 | всегда |
| Restore Wallet | Key | yellow-400 | всегда |
| Connect Extension | Download | purple-400 | всегда |
| Delete stored wallet | — | red-500 | `hasExistingKeystore` |

## Пункты меню Restore

| Пункт | Иконка | Цвет | Условие |
|-------|--------|------|---------|
| Recovery Phrase | Key | yellow-400 | всегда |
| Keystore File | Upload | orange-400 | всегда |
| Google Drive | Cloud | sky-400 | `driveConfigured` |

## Дизайн

### Модалка
- Ширина: `400px` (max `92vw`)
- Фон: `#1a1a1a` (чуть светлее фона приложения `#0d0d0d`)
- Бордер: `1px solid rgba(255, 255, 255, 0.08)`
- Скругление: `rounded-3xl`
- Backdrop: `bg-black/25 backdrop-blur-sm`

### Карточки меню (SelectRow)
- Фон: `#232323` (непрозрачный)
- Hover: `#2a2a2a`
- Скругление: `rounded-2xl`
- Padding: `px-5 py-4`
- Layout: текст слева, иконка в контейнере `9x9` справа
- Контейнер иконки: `bg-white/[0.06] rounded-lg`
- Текст: `text-base font-semibold`
- Отступ между карточками: `space-y-3`

### Инпуты (InputField)
- Фон: `bg-black/30`
- Бордер: `border-[color:var(--sf-outline)]`, focus: `border-white/20`
- Скругление: `rounded-xl`
- Padding: `px-4 py-3`
- Текст: `text-base font-medium`
- Label: `text-[13px] font-semibold uppercase tracking-widest`

### Кнопки
- Primary: `bg-white text-black rounded-xl py-3 text-base font-medium`
- Без отдельной Back-кнопки — навигация через стрелку в хедере

### Секционные заголовки
- `text-[13px] font-bold uppercase tracking-widest text-[color:var(--sf-muted)]`

## Анимации

### Открытие
- Backdrop: `fadeIn 150ms ease-out`
- Модалка: `modalIn 200ms ease-out` (opacity 0→1, scale 0.97→1, translateY 6px→0)

### Закрытие
- Backdrop: `fadeOut 100ms ease-in forwards`
- Модалка: `modalOut 100ms ease-in forwards` (обратная `modalIn`)
- Закрытие через `isClosing` state + `setTimeout(100ms)` для задержки unmount

### Трансформация высоты
- Контент обёрнут в div с `transition: height 200ms cubic-bezier(0.4, 0, 0.2, 1)`
- Высота измеряется через `useLayoutEffect` + `innerRef.scrollHeight`
- Пересчитывается при изменении: `view`, `error`, `hasExistingKeystore`, `driveConfigured`, `uploadedKeystore`, `walletOptions`, `driveBackups`, `generatedMnemonic`

### CSS Keyframes (globals.css)

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.97) translateY(6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes modalOut {
  from { opacity: 1; transform: scale(1) translateY(0); }
  to { opacity: 0; transform: scale(0.97) translateY(6px); }
}
```

## Sub-компоненты

Определены в конце файла как простые функции:

- **`SelectRow`** — карточка меню (icon, label, onClick, disabled)
- **`InputField`** — поле ввода с лейблом и toggle пароля
- **`ErrorMessage`** — блок ошибки с красным бордером
- **`PrimaryButton`** — белая кнопка действия

## Кнопка в хедере

`components/Header.tsx` — кнопка "Connect Wallet":
- Класс: `btn-primary text-[13px] !px-5 !py-2.5 !rounded-xl`
- Показывается только для `sm+` экранов
- На мобильном — через мобильное меню

## Зависимости

- `@alkanes/ts-sdk` — типы (`BrowserWalletInfo`, `WalletBackupInfo`, `WalletOption`), `BROWSER_WALLETS`, `GoogleDriveBackup`, `unlockKeystore`
- `@/context/WalletContext` — `useWallet` hook
- `lucide-react` — иконки
