# AM Goal Dashboard v2 — 部署指南

## 資料來源說明（重要）

本 Dashboard 的資料來源是 **HubSpot Company**，而非 Deal：

| 欄位 | Property Name | 說明 |
|------|--------------|------|
| 各客戶年度目標 | `acv` | 每家公司的 2026 ACV Goal |
| 今年實績 | `ke_hu_jin_nian_du_zong_jin_e` | 今年累計成交 |
| 去年實績 | `qu_nian_du_zong_cheng_jiao_jin_e` | 去年全年（YoY 基準）|
| 客戶階段 | `inv_clientstage` | Active/At Risk/Churned… |
| 客戶等級 | `inv_clientlevel` | Top/Key/SMB/Potential |
| 客戶風險 | `inv_client_risk_level` | 高/中/健康 |
| 下一步計畫 | `inv_developeplan` | 自由文字 |

篩選條件（對應 2026 AM Goal view）：
- `inv_clientlevel` HAS_PROPERTY
- `am_guan_li = "true"`

---

## STEP 1｜建立 Firebase 專案（10 分鐘）

1. 開啟 https://console.firebase.google.com → Add project
2. 輸入名稱如 `invos-am-goal-dashboard` → 關閉 Analytics → Create

### 1-A 啟用 Authentication
左側 Authentication → Get Started → Google → Enable → 填你的 email → Save

### 1-B 啟用 Firestore
左側 Firestore Database → Create Database → Production mode → `asia-east1`

### 1-C Firestore Security Rules
Firestore → Rules → 貼入以下 → Publish：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /allowed_emails/{email} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.auth.token.email == 'helen.lin@invos.com.tw';
    }

    match /snapshots/{slot} {
      allow read, write: if request.auth != null;
    }

    match /daily_logs/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null
                            && resource.data.authorEmail == request.auth.token.email;
    }

    match /meta/{doc} {
      allow read, write: if request.auth != null;
    }
  }
}
```

⚠️ 把 `helen.lin@invos.com.tw` 改成你自己的 Gmail！

### 1-D 取得 Firebase 設定值
Project Settings（齒輪）→ Your apps → `</>` → Register app → 複製 config

---

## STEP 2｜設定白名單

Firestore → + Start collection → Collection ID: `allowed_emails`

Document ID 規則：把 email 的 `.` 換成 `_`，`@` 換成 `__at__`
例如：`helen.lin@invos.com.tw` → `helen_lin__at__invos_com_tw`

每個授權用戶都加一筆，Field: `email` (string) = 完整 email

---

## STEP 3｜本地設定

```bash
# 複製 env
cp .env.example .env
# 填入 Firebase config、HubSpot Token、Anthropic Key

# 安裝依賴
npm install

# 本地測試
npm start
```

確認：
- [ ] Google 登入成功
- [ ] 客戶列表有資料（約 111 家）
- [ ] AM 進度 / 風險警示正確
- [ ] AI 洞察可生成

---

## STEP 4｜部署到 Firebase

```bash
# 安裝 Firebase CLI（首次）
npm install -g firebase-tools
firebase login

# Build + Deploy
npm run build
firebase deploy --only hosting
```

→ 部署網址：`https://invos-am-goal-dashboard.web.app`

---

## 自動更新機制（每日 08:00 / 14:00）

每次有人開啟儀表板時，系統會：
1. 讀取 Firestore `meta/lastFetch` 的上次更新時間
2. 判斷最近一個應更新時間點（08:00 / 14:00）是否已過
3. 若需要更新 → 自動從 HubSpot 拉取最新資料並儲存快照至 Firestore

> 注意：只有在有人開啟儀表板時才會觸發。若需完全自動（無人開啟也更新），
> 需要另外設定 Firebase Cloud Functions 定時任務。

---

## 後續維護

**新增授權用戶**：Firestore → `allowed_emails` → 新增 document

**AM Owner ID 確認**：
| AM | ownerId（hubspot_owner_id）|
|----|--------------------------|
| Helen  | 699497618   |
| Yvonne | 1238823096  |
| Megan  | 80411630    |
| Ethan  | 159919059   |
| Vicky  | 959579815   |
| Andy   | 78812708    |
| Ray    | 1458325751  |

---

## 檔案結構

```
src/
├── firebase.js              # Firebase 初始化
├── App.js                   # Auth 路由
├── utils/
│   ├── constants.js         # AM 設定、HubSpot property 名、篩選條件
│   └── formatters.js        # 格式化工具
├── hooks/
│   ├── useCompanies.js      # ← 核心：從 HubSpot Company 拉資料
│   └── useFirestore.js      # 白名單、快照、Daily Log
└── components/
    ├── Login.js
    ├── Dashboard.js
    └── tabs/
        ├── TabOverview.js    # 總覽
        ├── TabAMProgress.js  # AM 進度
        ├── TabRiskAlerts.js  # 風險警示
        ├── TabClientList.js  # 客戶列表
        ├── TabYoY.js         # YoY 比較
        ├── TabHistory.js     # 歷史紀錄
        ├── TabInsights.js    # AI 洞察
        ├── TabDailyLog.js    # 每日記錄
        └── TabDefinitions.js # 名詞定義
```
