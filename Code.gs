const SHEET_NAME = 'Заявки';
function sheet_() { const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME); if(!s) throw Error('Нет листа Заявки'); return s; }
function safe_(v) { const s=String(v||'').trim(); return /^[=+\-@\t\r]/.test(s) ? "'"+s : s; }
function validId_(s) { return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s); }
function exists_(s,id) { const n=s.getLastRow(); return n>1 && !!s.getRange(2,11,n-1,1).createTextFinder(id).matchEntireCell(true).findNext(); }
function doPost(e) {
 const lock=LockService.getScriptLock();
 try {
  const d=JSON.parse(e.postData.contents), team=String(d.team||'').trim(), p=d.players, id=String(d.requestId||'');
  if(!validId_(id)||team.length<2||team.length>80||!Array.isArray(p)||p.length!==7||p.some((v,i)=>typeof v!=='string'||v.trim().length>100||(i<5&&v.trim().length<3)||(i>=5&&v.trim()&&v.trim().length<3))) throw Error('Некорректная заявка');
  lock.waitLock(15000);
  const s=sheet_();
  if(!exists_(s,id)) {s.appendRow([new Date(),safe_(team),...p.map(safe_),'Новая',id]);SpreadsheetApp.flush();}
  return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
 } catch(err) { console.error(err);return ContentService.createTextOutput(JSON.stringify({ok:false})).setMimeType(ContentService.MimeType.JSON); }
 finally {if(lock.hasLock())lock.releaseLock();}
}
function doGet(e) {
 const p=e&&e.parameter||{}, id=String(p.requestId||'');
 let result={ok:true,saved:false};
 try {if(p.action!=='status'||!validId_(id))throw Error('Bad request');result.saved=exists_(sheet_(),id);}catch(err){result={ok:false,saved:false};}
 const cb=String(p.callback||'');
 if(/^[A-Za-z_$][A-Za-z0-9_$]{0,80}$/.test(cb)) return ContentService.createTextOutput(cb+'('+JSON.stringify(result)+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
 return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
