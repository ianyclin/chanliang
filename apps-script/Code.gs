/**
 * 展諒課業 — 完成紀錄 Web App
 *
 * 安裝方式：
 * 1. 打開 Google Sheet「展諒課業」→ 擴充功能 → Apps Script
 * 2. 把這個檔案的內容全部貼進 Code.gs，存檔
 * 3. 部署 → 新增部署作業 → 類型「網頁應用程式」
 *    - 執行身分：我
 *    - 誰可以存取：任何人
 * 4. 複製「網頁應用程式網址」（結尾是 /exec），貼到 index.html 的 CONFIG.SCRIPT_URL
 * 5. 之後若改了這份程式，要「管理部署作業 → 編輯 → 版本：新版本」再部署，網址才會更新內容
 */

var LOG_SHEET = '完成紀錄';
var LOG_HEADER = ['時間戳', '日期', '項目ID', '動作', '項目名稱', '伺服器時間'];

function getLogSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(LOG_SHEET);
    sh.appendRow(LOG_HEADER);
    sh.setFrozenRows(1);
  } else if (sh.getLastRow() === 0) {
    sh.appendRow(LOG_HEADER);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 網頁用 fetch POST 送 JSON（body 是 text/plain，避開 CORS preflight）
// 格式：{ ts, date, id, action, name }  或  { records: [ {...}, {...} ] }
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var records = body.records || [body];
    var sh = getLogSheet_();
    var now = new Date();
    var rows = records
      .filter(function (r) { return r && r.id; })
      .map(function (r) {
        return [String(r.ts || now.toISOString()), String(r.date || ''), String(r.id), String(r.action || '完成'), String(r.name || ''), now];
      });
    if (rows.length) {
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, LOG_HEADER.length).setValues(rows);
    }
    return json_({ ok: true, written: rows.length });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

// 健康檢查：瀏覽器直接打開 /exec 會看到 {"ok":true}
// 也可以 ?tab=進度母表 直接拿某個分頁的 JSON（備用，網頁主要走發布的 CSV）
function doGet(e) {
  var tab = e && e.parameter && e.parameter.tab;
  if (!tab) return json_({ ok: true, sheet: SpreadsheetApp.getActiveSpreadsheet().getName() });
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab);
  if (!sh) return json_({ ok: false, error: '找不到分頁：' + tab });
  var values = sh.getDataRange().getDisplayValues();
  return json_({ ok: true, tab: tab, rows: values });
}

// 從編輯器手動執行一次，用來測試寫入是否正常
function testWrite() {
  var res = doPost({ postData: { contents: JSON.stringify({ ts: new Date().toISOString(), date: '2026-01-01', id: 'test:手動測試', action: '完成', name: '測試｜可以刪掉這列' }) } });
  Logger.log(res.getContent());
}
