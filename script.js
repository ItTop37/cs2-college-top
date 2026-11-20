const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxY4BwU2nB0KvEOLIr49M059xkbClhMfJ-Osz-RLibiXTnnaQ_8BnBDajXRCnFDALk/exec';
const form = document.getElementById('teamForm');
const statusBox = document.getElementById('status');
const submitBtn = document.getElementById('submitBtn');

function addPlayer(container, number, optional = false) {
  const label = document.createElement('label');
  label.htmlFor = `player${number}`;
  label.textContent = optional ? `ЗАПАСНОЙ ${number - 5}` : `ИГРОК ${number}`;
  if (!optional) label.textContent += ' *';
  const input = document.createElement('input');
  input.id = `player${number}`;
  input.name = `player${number}`;
  input.placeholder = 'Фамилия Имя';
  input.maxLength = 100;
  input.minLength = 3;
  input.required = !optional;
  container.append(label, input);
}
for (let i = 2; i <= 5; i++) addPlayer(document.getElementById('players'), i);
for (let i = 6; i <= 7; i++) addPlayer(document.getElementById('spares'), i, true);

function setStatus(message, kind = '') {
  statusBox.textContent = message;
  statusBox.className = `status ${kind}`;
}

// Apps Script ContentService не поддерживает обычное чтение fetch из другого origin.
// Читаем только безопасный статус по случайному идентификатору через JSONP.
function checkStatus(requestId) {
  return new Promise((resolve, reject) => {
    const callback = `cs2Status_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const timeout = setTimeout(() => finish(new Error('Тайм-аут проверки')), 8000);
    function finish(err, data) {
      clearTimeout(timeout);
      delete window[callback];
      script.remove();
      err ? reject(err) : resolve(data);
    }
    window[callback] = data => finish(null, data);
    script.onerror = () => finish(new Error('Не удалось проверить статус'));
    script.src = `${SCRIPT_URL}?action=status&requestId=${encodeURIComponent(requestId)}&callback=${callback}&t=${Date.now()}`;
    document.head.append(script);
  });
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const players = Array.from({length: 7}, (_, i) =>
    (i === 0 ? document.getElementById('captain') : document.getElementById(`player${i+1}`)).value.trim()
  );
  if (players.slice(0, 5).some(p => p.length < 3) ||
      players.slice(5).some(p => p && p.length < 3)) {
    setStatus('Проверьте ФИО игроков.', 'error');
    return;
  }
  const payload = {
    team: document.getElementById('team').value.trim(),
    players,
    requestId: crypto.randomUUID()
  };
  submitBtn.disabled = true;
  setStatus('Отправляем заявку и проверяем сохранение…');
  try {
    // no-cors отправляет POST, но не подтверждает сохранение — проверяем отдельно.
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify(payload)
    });
    let confirmed = false;
    for (let i = 0; i < 8; i++) {
      await sleep(1500);
      try {
        const result = await checkStatus(payload.requestId);
        if (result.ok && result.saved === true) { confirmed = true; break; }
      } catch (err) { console.warn('Проверка статуса:', err); }
    }
    if (!confirmed) throw new Error('Нет подтверждения записи');
    setStatus('Заявка сохранена! Организаторы проверят её.', 'success');
    form.reset();
  } catch (err) {
    console.error(err);
    setStatus(`Не удалось подтвердить сохранение. Не отправляйте повторно сразу — уточните у организаторов. Код заявки: ${payload.requestId}`, 'error');
  } finally {
    submitBtn.disabled = false;
  }
});
