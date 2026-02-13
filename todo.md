# Project TODO

## 資料庫設計
- [x] 課程資料表 (courses)
- [x] 訂單資料表 (orders)
- [x] 訂單項目資料表 (orderItems)
- [x] 客戶資料表 (customers)
- [x] 交易明細表 (transactions)
- [x] 交換課程資料表 (exchanges)

## 後端 API
- [x] 課程 CRUD API
- [x] 訂單建立與管理 API
- [x] 客戶管理 API
- [x] 課程交換申請 API
- [x] 交換申請管理 API
- [x] Telegram Bot 訊息發送 API
- [x] Telegram Bot Webhook 接收與指令處理
- [x] 自動化提醒 Cron Job

## 前端頁面
- [x] 課程清單頁面（含狀態標籤、來源標示）
- [x] 購物車功能（加入、修改、移除、組合優惠計算）
- [x] 結帳流程（填寫資料、確認訂單、付款資訊、付款確認）
- [x] 課程交換表單頁面
- [x] 交換申請確認頁面

## 後台管理
- [x] 訂單管理（查看、篩選、搜尋、狀態操作）
- [x] 課程管理（新增、編輯、刪除、公開/隱藏）
- [x] 交換課程管理
- [x] 客戶管理（購買記錄、備註）
- [x] 統計報表（今日/本週/本月）

## Telegram Bot
- [x] 新訂單自動通知
- [x] 付款通知
- [x] 課程交換申請通知
- [x] 課程開課提醒（每日 9:00 自動檢查）
- [x] /paid 指令（確認付款、生成課程連結訊息）
- [x] /accept /reject 指令（交換審核）
- [x] /received 指令（記錄收到課程）
- [x] /exchange list /exchange pending 指令
- [x] /course add/list/status/link/schedule/open/upcoming/publish/hide 指令
- [x] /check /today /pending /stats /customer 查詢指令

## 其他
- [x] 組合優惠自動計算（2門9折、3門以上85折）
- [x] 付款方式顯示（銀行轉帳、LINE Pay、街口支付）
- [x] 課程連結自動帶入
- [x] 交換課程自動新增（隱藏狀態）
- [x] Vitest 測試
