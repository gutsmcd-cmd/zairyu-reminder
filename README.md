# 在留リマインダー（Zairyu Reminder）

在留カードの期限まで、あと何日かをこの端末で見る PWA。**無料・広告なし・ログイン不要・オフライン対応。通知は送りません。**

## できること

- 在留期限。任意で在留期間の末日、次の手続き（更新・変更）と予定日、メモ
- 家族など、複数人をこの端末の中だけに記録
- あと何日かを大きく表示。90日未満は黄、30日未満は赤、過ぎると濃い赤
- 「アプリを開いたときに確認できます」。プッシュ通知はありません

名前も日付もメモも送信しません。IndexedDB にだけ保存します。

## English

**Zairyu Reminder** tracks residence-card dates for someone living in Japan. Enter a card expiry (在留期限), optionally when the period of stay ends, an optional next procedure (renewal or change of status) with a date, and a note. Add more than one person — names stay on this device. A large “days left” countdown turns amber under 90 days and red under 30. The app does not ask for notification permission and does not send push alerts; you check when you open it. No network, no analytics, no login. Sensitive-adjacent data is stored only in IndexedDB and is never logged.

## 開発 / Development

```bash
npm install
npm run dev
npm run build
```

Vite + vanilla TypeScript + vite-plugin-pwa（`registerType: 'autoUpdate'`, `base: './'`）。
