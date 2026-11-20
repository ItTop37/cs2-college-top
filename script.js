// Вставьте URL опубликованного веб-приложения Google Apps Script, оканчивающийся на /exec.
const SCRIPT_URL = '';

const playersContainer = document.getElementById('players');
const sparesContainer = document.getElementById('spares');
const form = document.getElementById('teamForm');
const statusBox = document.getElementById('status');
const submitBtn = document.getElementById('submitBtn');

function addPlayer(container, number, optional = false) {
  const label = document.createElement('label');
  label.htmlFor = `player${number}`;
  label.textContent = optional ? `ЗАПАСНОЙ ${number - 5}` : `ИГРОК ${number}`;
  if (!optional) {
    const required = document.createElement('b');
    required.textContent = ' *';
    label.append(required);
  }
  const input = document.createElement('input');
  input.id = `player${number}`;
  input.name = `player${number}`;
  input.placeholder = 'Фамилия Имя';
  input.maxLength = 100;
  input.minLength = 3;
  input.required = !optional;
  container.append(label, input);
}
for (let i = 2; i <= 5; i++) addPlayer(playersContainer, i);
for (let i = 6; i <= 7; i++) addPlayer(sparesContainer, i, true);

function setStatus(message, kind = '') {
  statusBox.textContent = message;
  statusBox.className = `status ${kind}`;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (!SCRIPT_URL || !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(SCRIPT_URL)) {
    setStatus('Регистрация пока не подключена. Организаторам нужно указать адрес Apps Script.', 'error');
    return;
  }
  const players = Array.from({ length: 7 }, (_, i) =>
    (i === 0 ? document.getElementById('captain') : document.getElementById(`player${i + 1}`)).value.trim()
  );
  if (players.slice(0, 5).some(p => p.length < 3) || players.slice(5).some(p => p && p.length < 3)) {
    setStatus('Проверьте ФИО игроков.', 'error');
    return;
  }
  const payload = {
    team: document.getElementById('team').value.trim(),
    players,
    requestId: crypto.randomUUID()
  };
  submitBtn.disabled = true;
  setStatus('Отправляем заявку…');
  try {
    // text/plain предотвращает preflight. Apps Script возвращает JSON через редирект;
    // доступность ответа зависит от CORS Google, поэтому НЕ используем no-cors.
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'Не удалось сохранить заявку');
    setStatus('Заявка сохранена! Организаторы проверят её.', 'success');
    form.reset();
  } catch (error) {
    console.error('Registration error:', error);
    setStatus('Не удалось подтвердить сохранение. Проверьте заявку у организаторов перед повторной отправкой.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
});
