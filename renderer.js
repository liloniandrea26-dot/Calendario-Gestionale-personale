// renderer.js — logica UI completa WeekOrganizer
'use strict';

// ─── UTILITIES ────────────────────────────────────────────────────────────────

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function fmt(date) {
  // YYYY-MM-DD string da oggetto Date
  return date.toISOString().split('T')[0];
}

function today() { return fmt(new Date()); }

function todayDate() { return new Date(); }

function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

function fmtEuro(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function fmtDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function dayOfWeek(str) {
  return new Date(str + 'T00:00:00').getDay(); // 0=dom
}

function addDays(str, n) {
  const d = new Date(str + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return fmt(d);
}

function isoWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=dom
  const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return fmt(d);
}

function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('#toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

async function confirmDialog(text) {
  return new Promise(resolve => {
    openModal(`
      <div class="modal-header">
        <span class="modal-title">Conferma</span>
      </div>
      <p class="confirm-text">${text}</p>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="conf-no">Annulla</button>
        <button class="btn btn-danger" id="conf-yes">Elimina</button>
      </div>
    `);
    $('#conf-no').onclick = () => { closeModal(); resolve(false); };
    $('#conf-yes').onclick = () => { closeModal(); resolve(true); };
  });
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

function openModal(html) {
  const overlay = $('#modal-overlay');
  const modal = $('#modal');
  modal.innerHTML = html;
  overlay.classList.add('open');
  // Focus trap: focus sul primo input
  setTimeout(() => {
    const first = modal.querySelector('input,select,textarea,button:not(.win-btn)');
    if (first) first.focus();
  }, 100);
}

function closeModal() {
  $('#modal-overlay').classList.remove('open');
}

$('#modal-overlay').addEventListener('click', e => {
  if (e.target === $('#modal-overlay')) closeModal();
});

// ─── TITLEBAR ─────────────────────────────────────────────────────────────────

$('#btn-minimize').onclick = () => window.api.minimize();
$('#btn-maximize').onclick = () => window.api.maximize();
$('#btn-close').onclick = () => window.api.close();

// ─── SIDEBAR — DATA E NAVIGAZIONE ─────────────────────────────────────────────

function initSidebar() {
  const now = new Date();
  const days = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const months = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  $('#sb-day').textContent = days[now.getDay()];
  $('#sb-date').textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  // Mostra conteggio eventi di oggi
  window.api.getEventsByDate(today()).then(r => {
    const n = r.data?.length || 0;
    $('#sb-count').textContent = n > 0 ? `${n} event${n === 1 ? 'o' : 'i'} oggi` : 'Nessun evento oggi';
  });
}

initSidebar();

// Navigazione sezioni
$$('.nav-item[data-section]').forEach(item => {
  item.addEventListener('click', () => {
    const sec = item.dataset.section;
    $$('.nav-item[data-section]').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    $$('.section').forEach(s => s.classList.remove('active'));
    $(`#s-${sec}`).classList.add('active');
    App[sec]?.load?.();
  });
});

// Shortcut tastiera Ctrl+1..7 e Ctrl+N, Escape
const sections = ['oggi','calendario','finanze','sport','lavoro','abitudini','note'];
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key >= '1' && e.key <= '7') {
    e.preventDefault();
    const idx = parseInt(e.key) - 1;
    $$('.nav-item[data-section]')[idx]?.click();
  }
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    openQuickAdd();
  }
  if (e.key === 'Escape') closeModal();
});

// Export dati
$('#btn-export').addEventListener('click', async () => {
  const res = await window.api.exportAll();
  if (res.ok) showToast(`Dati esportati in: ${res.data}`, 'success');
  else if (res.error !== 'Annullato') showToast('Errore export: ' + res.error, 'error');
});

// ─── QUICK ADD ────────────────────────────────────────────────────────────────

$('#btn-quick-add').addEventListener('click', openQuickAdd);

function openQuickAdd() {
  openModal(`
    <div class="modal-header">
      <span class="modal-title">Aggiungi rapido</span>
      <button class="btn-icon" onclick="closeModal()">✕</button>
    </div>
    <div class="quick-add-types">
      <button class="quick-type-btn" onclick="closeModal();App.calendario.openAddModal()">
        <span class="qt-icon">📅</span><span class="qt-label">Evento</span>
      </button>
      <button class="quick-type-btn" onclick="closeModal();App.lavoro.openAddModal()">
        <span class="qt-icon">✅</span><span class="qt-label">Task</span>
      </button>
      <button class="quick-type-btn" onclick="closeModal();App.note.addNew()">
        <span class="qt-icon">📝</span><span class="qt-label">Nota</span>
      </button>
      <button class="quick-type-btn" onclick="closeModal();App.finanze.openAddModal()">
        <span class="qt-icon">💰</span><span class="qt-label">Transazione</span>
      </button>
    </div>
  `);
}

// ─── NAMESPACE App ────────────────────────────────────────────────────────────
const App = {};

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE: OGGI
// ═══════════════════════════════════════════════════════════════════════════════

App.oggi = {
  async load() {
    const now = new Date();
    const days = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
    const months = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
    $('#oggi-date-header').textContent = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

    await Promise.all([
      this.loadEvents(),
      this.loadTasks(),
      this.loadHabits(),
      this.loadFinance()
    ]);
  },

  async loadEvents() {
    const res = await window.api.getEventsByDate(today());
    const events = res.data || [];
    const el = $('#oggi-events');
    if (!events.length) {
      el.innerHTML = '<div class="empty-state"><p>Nessun evento oggi</p></div>';
      return;
    }
    el.innerHTML = events.map(ev => `
      <div class="event-item">
        <div class="event-time">${ev.time_start || '—'}</div>
        <div>
          <div class="event-title">${ev.title}</div>
          ${ev.location ? `<div class="event-loc">📍 ${ev.location}</div>` : ''}
        </div>
        <span class="badge badge-${ev.category}" style="margin-left:auto;">${ev.category}</span>
      </div>
    `).join('');
  },

  async loadTasks() {
    const res = await window.api.getAllTasks();
    const tasks = (res.data || []).filter(t => t.due_date === today() && t.status !== 'done');
    const el = $('#oggi-tasks');
    if (!tasks.length) {
      el.innerHTML = '<div class="empty-state"><p>Nessun task in scadenza oggi</p></div>';
      return;
    }
    el.innerHTML = tasks.map(t => `
      <div class="task-check-item" data-id="${t.id}">
        <div class="checkbox ${t.status === 'done' ? 'checked' : ''}" data-id="${t.id}">
          ${t.status === 'done' ? '✓' : ''}
        </div>
        <span style="${t.status === 'done' ? 'text-decoration:line-through;color:var(--text-3)' : ''}">${t.title}</span>
        <span class="badge badge-${t.priority}" style="margin-left:auto;">${t.priority}</span>
      </div>
    `).join('');

    $$('.checkbox[data-id]', el).forEach(cb => {
      cb.addEventListener('click', async () => {
        const id = parseInt(cb.dataset.id);
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        await window.api.updateTask(id, { ...task, status: newStatus });
        this.loadTasks();
      });
    });
  },

  async loadHabits() {
    const el = $('#oggi-habits');
    const [habRes, logRes] = await Promise.all([
      window.api.getActiveHabits(),
      window.api.getHabitLogsForWeek(today(), today())
    ]);
    const habits = habRes.data || [];
    const logs = logRes.data || [];
    const todayIdx = (new Date().getDay() + 6) % 7; // 0=lun

    const todayHabits = habits.filter(h => h.target_days[todayIdx] === '1');
    if (!todayHabits.length) {
      el.innerHTML = '<div class="empty-state"><p>Nessuna abitudine programmata oggi</p></div>';
      return;
    }

    el.innerHTML = todayHabits.map(h => {
      const log = logs.find(l => l.habit_id === h.id && l.date === today());
      const done = log?.completed === 1;
      return `
        <div class="task-check-item" style="cursor:pointer;" data-hid="${h.id}" data-done="${done}">
          <div class="checkbox ${done ? 'checked' : ''}">${done ? '✓' : ''}</div>
          <span>${h.icon} ${h.name}</span>
        </div>
      `;
    }).join('');

    $$('[data-hid]', el).forEach(row => {
      row.addEventListener('click', async () => {
        const hid = parseInt(row.dataset.hid);
        const done = row.dataset.done === 'true';
        await window.api.toggleHabitLog(hid, today(), !done);
        this.loadHabits();
      });
    });
  },

  async loadFinance() {
    const el = $('#oggi-finance');
    const now = new Date();
    const res = await window.api.getMonthSummary(now.getFullYear(), now.getMonth() + 1);
    const s = res.data || { income: 0, expense: 0, balance: 0 };
    const col = s.balance >= 0 ? 'green' : 'red';
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--text-2);">Entrate</span>
          <span style="color:var(--green);font-weight:600;">${fmtEuro(s.income)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--text-2);">Uscite</span>
          <span style="color:var(--red);font-weight:600;">${fmtEuro(s.expense)}</span>
        </div>
        <div style="height:1px;background:var(--border);margin:4px 0;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:600;">Saldo</span>
          <span style="color:var(--${col});font-size:18px;font-weight:700;">${fmtEuro(s.balance)}</span>
        </div>
      </div>
    `;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE: CALENDARIO
// ═══════════════════════════════════════════════════════════════════════════════

App.calendario = App.cal = (() => {
  let view = 'week';
  let curDate = today();

  const HOURS = [];
  for (let h = 7; h <= 23; h++) HOURS.push(`${String(h).padStart(2,'0')}:00`);

  const DAYS_IT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
  const CAT_COLORS = { lavoro: 'lavoro', sport: 'sport', personale: 'personale', salute: 'salute', altro: 'altro' };

  function getWeekDates(startDate) {
    const start = isoWeekStart(startDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }

  function updateLabel() {
    if (view === 'week') {
      const dates = getWeekDates(curDate);
      const [y1, m1, d1] = dates[0].split('-');
      const [y2, m2, d2] = dates[6].split('-');
      const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
      let label = m1 === m2
        ? `${d1} – ${d2} ${months[parseInt(m1)-1]} ${y1}`
        : `${d1} ${months[parseInt(m1)-1]} – ${d2} ${months[parseInt(m2)-1]} ${y1}`;
      $('#cal-period-label').textContent = label;
    } else {
      const d = new Date(curDate + 'T00:00:00');
      $('#cal-period-label').textContent = monthLabel(d.getFullYear(), d.getMonth() + 1);
    }
  }

  async function render() {
    updateLabel();
    if (view === 'week') await renderWeek();
    else await renderMonth();
  }

  async function renderWeek() {
    const dates = getWeekDates(curDate);
    const start = dates[0], end = dates[6];
    const res = await window.api.getEventsByWeek(start, end);
    const events = res.data || [];

    let html = '<div class="week-grid" style="max-height:calc(100vh - 220px);overflow-y:auto;">';
    // Header riga
    html += '<div class="week-header"></div>';
    dates.forEach((d, i) => {
      const isToday = d === today();
      const dayN = new Date(d + 'T00:00:00').getDate();
      html += `<div class="week-header ${isToday ? 'today-col' : ''}">${DAYS_IT[i]}<br><span style="font-size:15px;font-weight:700;">${dayN}</span></div>`;
    });

    // Righe ore
    HOURS.forEach(hour => {
      html += `<div class="week-time">${hour}</div>`;
      dates.forEach(d => {
        const isToday = d === today();
        const slotEvents = events.filter(ev => ev.date === d && ev.time_start && ev.time_start.startsWith(hour.slice(0,2)));
        html += `<div class="week-cell ${isToday ? 'today-col' : ''}" data-date="${d}" data-hour="${hour}">`;
        slotEvents.forEach(ev => {
          html += `<div class="week-event cat-${ev.category}" data-id="${ev.id}" title="${ev.title}${ev.time_start ? ' '+ev.time_start : ''}">${ev.time_start ? ev.time_start+' ' : ''}${ev.title}</div>`;
        });
        html += '</div>';
      });
    });
    html += '</div>';

    const container = $('#cal-container');
    container.innerHTML = html;

    // Click su cella → aggiungi evento
    $$('.week-cell', container).forEach(cell => {
      cell.addEventListener('click', e => {
        if (e.target.classList.contains('week-event')) return;
        openAddModal(cell.dataset.date, cell.dataset.hour);
      });
    });
    // Click su evento → modifica
    $$('.week-event', container).forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const ev = events.find(ev => ev.id === parseInt(el.dataset.id));
        if (ev) openEditModal(ev);
      });
    });
  }

  async function renderMonth() {
    const d = new Date(curDate + 'T00:00:00');
    const year = d.getFullYear(), month = d.getMonth() + 1;
    const res = await window.api.getEventsByMonth(year, month);
    const events = res.data || [];

    const firstDay = new Date(year, month - 1, 1);
    let startDow = firstDay.getDay(); // 0=dom
    startDow = startDow === 0 ? 6 : startDow - 1; // 0=lun
    const daysInMonth = new Date(year, month, 0).getDate();

    let html = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">`;
    DAYS_IT.forEach(d => { html += `<div style="text-align:center;font-size:11px;font-weight:600;color:var(--text-3);padding:6px 0;">${d}</div>`; });

    for (let i = 0; i < startDow; i++) html += '<div></div>';
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const isToday = dateStr === today();
      const dayEvs = events.filter(e => e.date === dateStr);
      html += `<div style="min-height:80px;border:1px solid var(--border);border-radius:var(--radius-sm);padding:4px;cursor:pointer;background:${isToday ? 'rgba(99,102,241,0.06)' : 'var(--bg-surface)'}" data-date="${dateStr}">
        <div style="font-size:12px;font-weight:${isToday?'700':'500'};color:${isToday?'var(--accent)':'var(--text-2)'};margin-bottom:3px;">${day}</div>
        ${dayEvs.slice(0,3).map(ev => `<div class="week-event cat-${ev.category}" style="position:static;margin-bottom:2px;" data-id="${ev.id}">${ev.title}</div>`).join('')}
        ${dayEvs.length > 3 ? `<div style="font-size:10px;color:var(--text-3);">+${dayEvs.length-3} altri</div>` : ''}
      </div>`;
    }
    html += '</div>';

    const container = $('#cal-container');
    container.innerHTML = html;

    $$('[data-date]', container).forEach(cell => {
      cell.addEventListener('click', e => {
        if (e.target.dataset.id) {
          const ev = events.find(ev => ev.id === parseInt(e.target.dataset.id));
          if (ev) openEditModal(ev);
        } else {
          openAddModal(cell.dataset.date);
        }
      });
    });
  }

  function openAddModal(date = today(), hour = '') {
    openModal(`
      <div class="modal-header">
        <span class="modal-title">Nuovo evento</span>
        <button class="btn-icon" onclick="closeModal()">✕</button>
      </div>
      ${eventForm({ date, time_start: hour, time_end: '', category: 'altro', repeat: 'never' })}
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
        <button class="btn btn-primary" id="ev-save">Salva</button>
      </div>
    `);
    $('#ev-save').onclick = async () => {
      const ev = readEventForm();
      if (!ev.title) { showToast('Titolo obbligatorio', 'error'); return; }
      await window.api.addEvent(ev);
      closeModal(); render(); initSidebar();
      showToast('Evento aggiunto', 'success');
    };
  }

  function openEditModal(ev) {
    openModal(`
      <div class="modal-header">
        <span class="modal-title">Modifica evento</span>
        <button class="btn-icon" onclick="closeModal()">✕</button>
      </div>
      ${eventForm(ev)}
      <div class="modal-footer">
        <button class="btn btn-danger btn-sm" id="ev-delete">Elimina</button>
        <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
        <button class="btn btn-primary" id="ev-save">Salva</button>
      </div>
    `);
    $('#ev-save').onclick = async () => {
      const data = readEventForm();
      if (!data.title) { showToast('Titolo obbligatorio', 'error'); return; }
      await window.api.updateEvent(ev.id, data);
      closeModal(); render(); showToast('Evento aggiornato', 'success');
    };
    $('#ev-delete').onclick = async () => {
      const ok = await confirmDialog(`Eliminare "${ev.title}"?`);
      if (!ok) return;
      await window.api.deleteEvent(ev.id);
      render(); showToast('Evento eliminato', 'success');
    };
  }

  function eventForm(ev = {}) {
    return `
      <div class="form-group"><label class="label">Titolo *</label>
        <input class="input" id="ev-title" value="${ev.title || ''}" placeholder="Titolo evento" /></div>
      <div class="form-row">
        <div class="form-group"><label class="label">Data</label>
          <input type="date" class="input" id="ev-date" value="${ev.date || today()}" /></div>
        <div class="form-group"><label class="label">Ora inizio</label>
          <input type="time" class="input" id="ev-start" value="${ev.time_start || ''}" /></div>
        <div class="form-group"><label class="label">Ora fine</label>
          <input type="time" class="input" id="ev-end" value="${ev.time_end || ''}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="label">Categoria</label>
          <select class="select" id="ev-cat">
            ${['lavoro','sport','personale','salute','altro'].map(c => `<option value="${c}" ${ev.category===c?'selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
          </select></div>
        <div class="form-group"><label class="label">Ripeti</label>
          <select class="select" id="ev-repeat">
            <option value="never" ${ev.repeat==='never'?'selected':''}>Mai</option>
            <option value="weekly" ${ev.repeat==='weekly'?'selected':''}>Ogni settimana</option>
            <option value="monthly" ${ev.repeat==='monthly'?'selected':''}>Ogni mese</option>
          </select></div>
      </div>
      <div class="form-group"><label class="label">Luogo</label>
        <input class="input" id="ev-location" value="${ev.location || ''}" placeholder="Luogo (opzionale)" /></div>
      <div class="form-group"><label class="label">Note</label>
        <textarea class="textarea" id="ev-notes" placeholder="Note...">${ev.notes || ''}</textarea></div>
    `;
  }

  function readEventForm() {
    return {
      title: $('#ev-title').value.trim(),
      date: $('#ev-date').value,
      time_start: $('#ev-start').value || null,
      time_end: $('#ev-end').value || null,
      category: $('#ev-cat').value,
      repeat: $('#ev-repeat').value,
      location: $('#ev-location').value.trim() || null,
      notes: $('#ev-notes').value.trim() || null
    };
  }

  // Navigazione
  $('#cal-prev').onclick = () => {
    if (view === 'week') curDate = addDays(isoWeekStart(curDate), -7);
    else { const d = new Date(curDate + 'T00:00:00'); d.setMonth(d.getMonth() - 1); curDate = fmt(d); }
    render();
  };
  $('#cal-next').onclick = () => {
    if (view === 'week') curDate = addDays(isoWeekStart(curDate), 7);
    else { const d = new Date(curDate + 'T00:00:00'); d.setMonth(d.getMonth() + 1); curDate = fmt(d); }
    render();
  };
  $('#cal-today-btn').onclick = () => { curDate = today(); render(); };
  $('#btn-add-event').onclick = () => openAddModal();

  return {
    load: render,
    setView(v) {
      view = v;
      $$('.toggle-btn', $('#s-calendario')).forEach(b => b.classList.remove('active'));
      $(`#cal-view-${v}`)?.classList.add('active');
      render();
    },
    openAddModal
  };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE: FINANZE
// ═══════════════════════════════════════════════════════════════════════════════

App.finanze = App.fin = (() => {
  const now = new Date();
  let year = now.getFullYear(), month = now.getMonth() + 1;
  let allTx = [];
  let sortKey = 'date', sortAsc = false;
  let chartWeekly = null, chartCat = null;

  const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

  async function load() {
    $('#fin-period-label').textContent = `${MONTHS_IT[month-1]} ${year}`;
    const [txRes, summRes, weekRes, catRes] = await Promise.all([
      window.api.getTransactionsByMonth(year, month),
      window.api.getMonthSummary(year, month),
      window.api.getWeeklyTotals(year, month),
      window.api.getCategoryTotals(year, month)
    ]);
    allTx = txRes.data || [];
    const s = summRes.data || { income: 0, expense: 0, balance: 0 };

    $('#fin-income').textContent = fmtEuro(s.income);
    $('#fin-expense').textContent = fmtEuro(s.expense);
    const balEl = $('#fin-balance');
    balEl.textContent = fmtEuro(s.balance);
    balEl.className = 'kpi-value ' + (s.balance >= 0 ? 'green' : 'red');

    renderTable();
    renderCharts(weekRes.data || [], catRes.data || []);
  }

  function renderTable() {
    const filterType = $('#fin-filter-type').value;
    const filterMethod = $('#fin-filter-method').value;
    let rows = [...allTx];
    if (filterType) rows = rows.filter(r => r.type === filterType);
    if (filterMethod) rows = rows.filter(r => r.method === filterMethod);
    rows.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === 'amount') { va = parseFloat(va); vb = parseFloat(vb); }
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

    const methodLabel = { cash: 'Contanti', debit: 'Debito', credit: 'Credito' };
    $('#fin-table-body').innerHTML = rows.map(tx => `
      <tr>
        <td>${fmtDate(tx.date)}</td>
        <td>${tx.description || '—'}</td>
        <td><span style="color:var(--text-2);font-size:12px;">${tx.category || '—'}</span></td>
        <td><span style="color:var(--text-3);font-size:12px;">${methodLabel[tx.method] || tx.method || '—'}</span></td>
        <td style="text-align:right;font-weight:600;color:${tx.type==='income'?'var(--green)':'var(--red)'};">
          ${tx.type==='income'?'+':'−'}${fmtEuro(tx.amount)}
        </td>
        <td style="text-align:right;">
          <button class="btn-icon" onclick="App.fin.openEditModal(${tx.id})">✏️</button>
          <button class="btn-icon" onclick="App.fin.deleteTx(${tx.id})">🗑️</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-3);padding:20px;">Nessuna transazione</td></tr>';
  }

  function renderCharts(weekData, catData) {
    // Grafico settimanale
    const weeks = [1,2,3,4,5];
    const incomeByWeek = weeks.map(w => weekData.find(r => r.week===w && r.type==='income')?.total || 0);
    const expByWeek = weeks.map(w => weekData.find(r => r.week===w && r.type==='expense')?.total || 0);

    if (chartWeekly) chartWeekly.destroy();
    chartWeekly = new Chart($('#chart-weekly'), {
      type: 'bar',
      data: {
        labels: ['Sett.1','Sett.2','Sett.3','Sett.4','Sett.5'],
        datasets: [
          { label: 'Entrate', data: incomeByWeek, backgroundColor: 'rgba(34,197,94,0.6)', borderColor: '#22c55e', borderWidth: 1 },
          { label: 'Uscite', data: expByWeek, backgroundColor: 'rgba(239,68,68,0.6)', borderColor: '#ef4444', borderWidth: 1 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#9898b0', font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: '#9898b0', font: { size: 10 } }, grid: { color: '#2a2a40' } },
          y: { ticks: { color: '#9898b0', font: { size: 10 }, callback: v => '€'+v }, grid: { color: '#2a2a40' } }
        }
      }
    });

    // Grafico ciambella categorie
    if (chartCat) chartCat.destroy();
    if (catData.length) {
      const catColors = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#a855f7','#ec4899','#14b8a6'];
      chartCat = new Chart($('#chart-categories'), {
        type: 'doughnut',
        data: {
          labels: catData.map(c => c.category || 'Altro'),
          datasets: [{ data: catData.map(c => c.total), backgroundColor: catColors }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#9898b0', font: { size: 11 }, padding: 10 } }
          }
        }
      });
    }
  }

  function sortBy(key) {
    if (sortKey === key) sortAsc = !sortAsc;
    else { sortKey = key; sortAsc = false; }
    renderTable();
  }

  function openAddModal(prefill = {}) {
    openModal(`
      <div class="modal-header">
        <span class="modal-title">Nuova transazione</span>
        <button class="btn-icon" onclick="closeModal()">✕</button>
      </div>
      <div class="form-group">
        <label class="label">Tipo</label>
        <div class="toggle-group" id="tx-type-toggle">
          <button class="toggle-btn active" data-val="expense">Uscita</button>
          <button class="toggle-btn" data-val="income">Entrata</button>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:0 0 140px;"><label class="label">Importo *</label>
          <input type="number" class="input" id="tx-amount" placeholder="0.00" min="0" step="0.01" value="${prefill.amount||''}" /></div>
        <div class="form-group"><label class="label">Descrizione</label>
          <input class="input" id="tx-desc" value="${prefill.description||''}" placeholder="Descrizione" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="label">Data</label>
          <input type="date" class="input" id="tx-date" value="${prefill.date||today()}" /></div>
        <div class="form-group"><label class="label">Metodo</label>
          <select class="select" id="tx-method">
            <option value="debit">Carta di debito</option>
            <option value="cash">Contanti</option>
            <option value="credit">Carta di credito</option>
          </select></div>
      </div>
      <div class="form-group"><label class="label">Categoria</label>
        <select class="select" id="tx-cat">
          <option value="">— Seleziona —</option>
          <optgroup label="Uscite" id="tx-cat-expense">
            ${['Cibo','Trasporti','Svago','Salute','Casa','Abbigliamento','Lavoro','Altro'].map(c=>`<option>${c}</option>`).join('')}
          </optgroup>
          <optgroup label="Entrate" id="tx-cat-income">
            ${['Stipendio','Freelance','Regalo','Rimborso','Altro'].map(c=>`<option>${c}</option>`).join('')}
          </optgroup>
        </select></div>
      <div class="form-group"><label class="label">Note</label>
        <textarea class="textarea" id="tx-notes" placeholder="Note..." style="min-height:60px;">${prefill.notes||''}</textarea></div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
        <button class="btn btn-primary" id="tx-save">Salva</button>
      </div>
    `);

    // Toggle tipo
    let txType = prefill.type || 'expense';
    $$('#tx-type-toggle .toggle-btn').forEach(btn => {
      if (btn.dataset.val === txType) btn.classList.add('active');
      else btn.classList.remove('active');
      btn.onclick = () => {
        txType = btn.dataset.val;
        $$('#tx-type-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      };
    });

    $('#tx-save').onclick = async () => {
      const amount = parseFloat($('#tx-amount').value);
      if (!amount || amount <= 0) { showToast('Importo obbligatorio', 'error'); return; }
      await window.api.addTransaction({
        type: txType,
        amount,
        description: $('#tx-desc').value.trim(),
        date: $('#tx-date').value,
        category: $('#tx-cat').value || null,
        method: $('#tx-method').value,
        notes: $('#tx-notes').value.trim() || null
      });
      closeModal(); load(); showToast('Transazione aggiunta', 'success');
    };
  }

  async function openEditModal(id) {
    const tx = allTx.find(t => t.id === id);
    if (!tx) return;
    openAddModal(tx);
    // Sovrascrivi il save per update
    $('#tx-save').onclick = async () => {
      const amount = parseFloat($('#tx-amount').value);
      if (!amount) { showToast('Importo obbligatorio', 'error'); return; }
      const txType = $$('#tx-type-toggle .toggle-btn').find(b => b.classList.contains('active'))?.dataset.val || tx.type;
      await window.api.updateTransaction(id, {
        type: txType, amount,
        description: $('#tx-desc').value.trim(),
        date: $('#tx-date').value,
        category: $('#tx-cat').value || null,
        method: $('#tx-method').value,
        notes: $('#tx-notes').value.trim() || null
      });
      closeModal(); load(); showToast('Transazione aggiornata', 'success');
    };
  }

  async function deleteTx(id) {
    const tx = allTx.find(t => t.id === id);
    const ok = await confirmDialog(`Eliminare la transazione "${tx?.description || 'questa transazione'}"?`);
    if (!ok) return;
    await window.api.deleteTransaction(id);
    load(); showToast('Transazione eliminata', 'success');
  }

  $('#fin-prev').onclick = () => { month--; if (month<1){month=12;year--;} load(); };
  $('#fin-next').onclick = () => { month++; if (month>12){month=1;year++;} load(); };
  $('#btn-add-tx').onclick = () => openAddModal();
  $('#fin-filter-type').onchange = renderTable;
  $('#fin-filter-method').onchange = renderTable;

  return { load, sortBy, openEditModal, deleteTx, openAddModal };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE: SPORT
// ═══════════════════════════════════════════════════════════════════════════════

App.sport = (() => {
  const now = new Date();
  let year = now.getFullYear(), month = now.getMonth() + 1;
  const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const SPORT_TYPES = ['⚽ Calcio a 5','🏃 Corsa','🚴 Bici','💪 Palestra','🏊 Nuoto','🎾 Tennis','🧘 Yoga','🏋️ Altro'];

  async function load() {
    $('#sport-period-label').textContent = `${MONTHS_IT[month-1]} ${year}`;
    const [sessRes, statsRes] = await Promise.all([
      window.api.getSportByMonth(year, month),
      window.api.getSportStats(year, month)
    ]);
    const sessions = sessRes.data || [];
    const stats = statsRes.data || {};

    $('#sport-count').textContent = stats.count || 0;
    $('#sport-hours').textContent = (stats.totalHours || 0) + 'h';
    $('#sport-streak').textContent = (stats.streak || 0) + ' gg';

    renderMiniCal(sessions);
    renderSessionsList(sessions);
  }

  function renderMiniCal(sessions) {
    const sessionDates = new Set(sessions.map(s => s.date));
    const firstDay = new Date(year, month - 1, 1);
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const DAYS_IT = ['L','M','M','G','V','S','D'];

    let html = '<div class="mini-cal">';
    DAYS_IT.forEach(d => { html += `<div class="mini-cal-header">${d}</div>`; });
    for (let i = 0; i < startDow; i++) html += '<div></div>';
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const isToday = dateStr === today();
      const hasSes = sessionDates.has(dateStr);
      html += `<div class="mini-cal-day ${hasSes?'has-session':''} ${isToday?'today':''}" title="${dateStr}">${day}</div>`;
    }
    html += '</div>';
    $('#sport-mini-cal').innerHTML = html;
  }

  function renderSessionsList(sessions) {
    if (!sessions.length) {
      $('#sport-sessions-list').innerHTML = '<div class="empty-state"><p>Nessuna sessione questo mese</p></div>';
      return;
    }
    const intensityLabel = { low: 'Bassa', medium: 'Media', high: 'Alta' };
    $('#sport-sessions-list').innerHTML = sessions.map(s => `
      <div class="session-row">
        <div class="session-type">${s.type.split(' ')[0]}</div>
        <div class="session-info">
          <div class="session-name">${s.type}</div>
          <div class="session-detail">${s.duration_min ? s.duration_min+'min' : ''}${s.calories ? ' · '+s.calories+' kcal' : ''}</div>
        </div>
        <span class="intensity-badge ${s.intensity || 'medium'}">${intensityLabel[s.intensity] || 'Media'}</span>
        <span class="session-date">${fmtDate(s.date)}</span>
        <button class="btn-icon" onclick="App.sport.deleteSession(${s.id})">🗑️</button>
      </div>
    `).join('');
  }

  function openAddModal(prefill = {}) {
    openModal(`
      <div class="modal-header">
        <span class="modal-title">Nuova sessione</span>
        <button class="btn-icon" onclick="closeModal()">✕</button>
      </div>
      <div class="form-group"><label class="label">Tipo sport</label>
        <select class="select" id="sp-type">
          ${SPORT_TYPES.map(t => `<option value="${t}" ${prefill.type===t?'selected':''}>${t}</option>`).join('')}
        </select></div>
      <div class="form-row">
        <div class="form-group"><label class="label">Data</label>
          <input type="date" class="input" id="sp-date" value="${prefill.date||today()}" /></div>
        <div class="form-group"><label class="label">Durata (min)</label>
          <input type="number" class="input" id="sp-dur" value="${prefill.duration_min||''}" placeholder="45" min="1" /></div>
      </div>
      <div class="form-group"><label class="label">Intensità</label>
        <div class="pill-group" id="sp-intensity">
          <button class="pill ${(!prefill.intensity||prefill.intensity==='low')?'active':''}" data-val="low">Bassa</button>
          <button class="pill ${prefill.intensity==='medium'?'active':''}" data-val="medium">Media</button>
          <button class="pill ${prefill.intensity==='high'?'active':''}" data-val="high">Alta</button>
        </div>
      </div>
      <div class="form-group"><label class="label">Calorie bruciate (opzionale)</label>
        <input type="number" class="input" id="sp-cal" value="${prefill.calories||''}" placeholder="350" /></div>
      <div class="form-group"><label class="label">Note</label>
        <textarea class="textarea" id="sp-notes" style="min-height:60px;">${prefill.notes||''}</textarea></div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
        <button class="btn btn-primary" id="sp-save">Salva</button>
      </div>
    `);

    let intensity = prefill.intensity || 'low';
    $$('#sp-intensity .pill').forEach(p => {
      p.onclick = () => {
        intensity = p.dataset.val;
        $$('#sp-intensity .pill').forEach(b => b.classList.remove('active'));
        p.classList.add('active');
      };
    });

    $('#sp-save').onclick = async () => {
      await window.api.addSportSession({
        type: $('#sp-type').value,
        date: $('#sp-date').value,
        duration_min: parseInt($('#sp-dur').value) || null,
        intensity,
        calories: parseInt($('#sp-cal').value) || null,
        notes: $('#sp-notes').value.trim() || null
      });
      closeModal(); load(); showToast('Sessione aggiunta', 'success');
    };
  }

  async function deleteSession(id) {
    const ok = await confirmDialog('Eliminare questa sessione?');
    if (!ok) return;
    await window.api.deleteSportSession(id);
    load(); showToast('Sessione eliminata', 'success');
  }

  $('#sport-prev').onclick = () => { month--; if(month<1){month=12;year--;} load(); };
  $('#sport-next').onclick = () => { month++; if(month>12){month=1;year++;} load(); };
  $('#btn-add-sport').onclick = () => openAddModal();

  return { load, openAddModal, deleteSession };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE: LAVORO (Kanban)
// ═══════════════════════════════════════════════════════════════════════════════

App.lavoro = App.tasks = (() => {
  let allTasks = [];
  let filterMode = 'all';
  let dragTask = null;

  async function load() {
    const res = await window.api.getAllTasks();
    allTasks = res.data || [];
    renderKanban();
  }

  function getFilteredTasks() {
    if (filterMode === 'today') return allTasks.filter(t => t.due_date === today());
    if (filterMode === 'week') {
      const start = isoWeekStart(today());
      const end = addDays(start, 6);
      return allTasks.filter(t => t.due_date >= start && t.due_date <= end);
    }
    return allTasks;
  }

  function renderKanban() {
    const tasks = getFilteredTasks();
    const statuses = ['todo','inprogress','done'];
    statuses.forEach(status => {
      const col = tasks.filter(t => t.status === status);
      $(`#count-${status}`).textContent = col.length;
      $(`#cards-${status}`).innerHTML = col.map(t => renderTaskCard(t)).join('');
    });

    // Drag & drop
    $$('.task-card').forEach(card => {
      card.draggable = true;
      card.addEventListener('dragstart', e => {
        dragTask = parseInt(card.dataset.id);
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('click', () => {
        const t = allTasks.find(t => t.id === parseInt(card.dataset.id));
        if (t) openEditModal(t);
      });
    });

    $$('.kanban-col').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-target'); });
      col.addEventListener('dragleave', () => col.classList.remove('drag-target'));
      col.addEventListener('drop', async e => {
        e.preventDefault();
        col.classList.remove('drag-target');
        if (!dragTask) return;
        const newStatus = col.dataset.status;
        const task = allTasks.find(t => t.id === dragTask);
        if (task && task.status !== newStatus) {
          await window.api.updateTask(dragTask, { ...task, status: newStatus });
          load();
        }
        dragTask = null;
      });
    });
  }

  function renderTaskCard(t) {
    const td = today();
    let dueClass = '';
    if (t.due_date) {
      if (t.due_date < td && t.status !== 'done') dueClass = 'overdue';
      else if (t.due_date === td) dueClass = 'today';
    }
    return `
      <div class="task-card" data-id="${t.id}">
        <div class="task-title">${t.title}</div>
        <div class="task-meta">
          <span class="badge badge-${t.priority}">${t.priority==='high'?'🔴 Alta':t.priority==='medium'?'🟡 Media':'🟢 Bassa'}</span>
          ${t.due_date ? `<span class="task-due ${dueClass}">📅 ${fmtDate(t.due_date)}</span>` : ''}
          ${t.project ? `<span class="task-project">📁 ${t.project}</span>` : ''}
        </div>
      </div>
    `;
  }

  function openAddModal(prefill = {}) {
    openModal(`
      <div class="modal-header">
        <span class="modal-title">Nuovo task</span>
        <button class="btn-icon" onclick="closeModal()">✕</button>
      </div>
      <div class="form-group"><label class="label">Titolo *</label>
        <input class="input" id="tk-title" value="${prefill.title||''}" placeholder="Titolo task" /></div>
      <div class="form-group"><label class="label">Descrizione</label>
        <textarea class="textarea" id="tk-desc" style="min-height:60px;">${prefill.description||''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label class="label">Scadenza</label>
          <input type="date" class="input" id="tk-due" value="${prefill.due_date||''}" /></div>
        <div class="form-group"><label class="label">Progetto</label>
          <input class="input" id="tk-project" value="${prefill.project||''}" placeholder="es. Commerciale" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="label">Priorità</label>
          <div class="pill-group" id="tk-priority">
            <button class="pill ${(!prefill.priority||prefill.priority==='low')?'active':''}" data-val="low">🟢 Bassa</button>
            <button class="pill ${prefill.priority==='medium'?'active':''}" data-val="medium">🟡 Media</button>
            <button class="pill ${prefill.priority==='high'?'active':''}" data-val="high">🔴 Alta</button>
          </div></div>
        <div class="form-group"><label class="label">Stato</label>
          <select class="select" id="tk-status">
            <option value="todo" ${(!prefill.status||prefill.status==='todo')?'selected':''}>Da fare</option>
            <option value="inprogress" ${prefill.status==='inprogress'?'selected':''}>In corso</option>
            <option value="done" ${prefill.status==='done'?'selected':''}>Completato</option>
          </select></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
        <button class="btn btn-primary" id="tk-save">Salva</button>
      </div>
    `);

    let priority = prefill.priority || 'low';
    $$('#tk-priority .pill').forEach(p => {
      if (p.dataset.val === priority) p.classList.add('active');
      else p.classList.remove('active');
      p.onclick = () => {
        priority = p.dataset.val;
        $$('#tk-priority .pill').forEach(b => b.classList.remove('active'));
        p.classList.add('active');
      };
    });

    $('#tk-save').onclick = async () => {
      const title = $('#tk-title').value.trim();
      if (!title) { showToast('Titolo obbligatorio', 'error'); return; }
      await window.api.addTask({
        title, priority,
        description: $('#tk-desc').value.trim() || null,
        due_date: $('#tk-due').value || null,
        status: $('#tk-status').value,
        project: $('#tk-project').value.trim() || null
      });
      closeModal(); load(); showToast('Task aggiunto', 'success');
    };
  }

  function openEditModal(t) {
    openAddModal(t);
    $('#tk-save').onclick = async () => {
      const title = $('#tk-title').value.trim();
      if (!title) { showToast('Titolo obbligatorio', 'error'); return; }
      const priority = $$('#tk-priority .pill').find(p => p.classList.contains('active'))?.dataset.val || t.priority;
      await window.api.updateTask(t.id, {
        title, priority,
        description: $('#tk-desc').value.trim() || null,
        due_date: $('#tk-due').value || null,
        status: $('#tk-status').value,
        project: $('#tk-project').value.trim() || null
      });
      closeModal(); load(); showToast('Task aggiornato', 'success');
    };
    // Aggiungi bottone elimina nel footer
    const footer = $('.modal-footer');
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger btn-sm';
    delBtn.textContent = 'Elimina';
    delBtn.style.marginRight = 'auto';
    delBtn.onclick = async () => {
      const ok = await confirmDialog(`Eliminare "${t.title}"?`);
      if (!ok) return;
      await window.api.deleteTask(t.id);
      load(); showToast('Task eliminato', 'success');
    };
    footer.prepend(delBtn);
  }

  function setFilter(mode) {
    filterMode = mode;
    $$('#s-lavoro .toggle-btn').forEach((b, i) => {
      b.classList.toggle('active', ['all','today','week'][i] === mode);
    });
    renderKanban();
  }

  $('#btn-add-task').onclick = () => openAddModal();

  return { load, openAddModal, openEditModal, setFilter };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE: ABITUDINI
// ═══════════════════════════════════════════════════════════════════════════════

App.abitudini = (() => {
  let weekStart = isoWeekStart(today());
  const EMOJIS = ['✅','💧','📚','🧘','😴','💪','🏃','🥗','☀️','🎯','🎸','💊','🌿','🧹','🛌','📖','🥤','🚶','🍎','✏️'];
  const DAYS_IT_SHORT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

  function getWeekDates() {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }

  function updateLabel() {
    const dates = getWeekDates();
    const [y1,m1,d1] = dates[0].split('-');
    const [,m2,d2] = dates[6].split('-');
    const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
    let label = m1===m2 ? `${d1}–${d2} ${months[parseInt(m1)-1]} ${y1}` : `${d1} ${months[parseInt(m1)-1]} – ${d2} ${months[parseInt(m2)-1]} ${y1}`;
    $('#hab-period-label').textContent = label;
  }

  async function load() {
    updateLabel();
    const dates = getWeekDates();
    const [habRes, logRes] = await Promise.all([
      window.api.getActiveHabits(),
      window.api.getHabitLogsForWeek(dates[0], dates[6])
    ]);
    const habits = habRes.data || [];
    const logs = logRes.data || [];

    // Header
    let thead = '<tr><th class="habit-name-col">Abitudine</th>';
    dates.forEach((d, i) => {
      const isToday = d === today();
      thead += `<th class="${isToday?'today-col-h':''}" title="${d}">${DAYS_IT_SHORT[i]}<br><span style="font-size:10px;color:var(--text-3);">${parseInt(d.split('-')[2])}</span></th>`;
    });
    thead += '<th style="width:50px;text-align:right;"></th></tr>';
    $('#habits-thead').innerHTML = thead;

    // Righe abitudini
    let tbody = '';
    habits.forEach(h => {
      const colorMap = { indigo:'var(--accent)', green:'var(--green)', amber:'var(--amber)', red:'var(--red)', violet:'var(--violet)' };
      const color = colorMap[h.color] || 'var(--accent)';

      // Calcola percentuale settimana corrente
      const targetDays = dates.filter((_, i) => h.target_days[i] === '1');
      const completedDays = targetDays.filter(d => {
        const log = logs.find(l => l.habit_id === h.id && l.date === d);
        return log?.completed === 1;
      });
      const pct = targetDays.length ? Math.round(completedDays.length / targetDays.length * 100) : 0;

      tbody += `<tr>
        <td>
          <div class="habit-name-cell">
            <span class="habit-icon">${h.icon}</span>
            <div>
              <div class="habit-name" style="color:${color};">${h.name}</div>
              <div class="habit-pct">${pct}% questa settimana</div>
            </div>
          </div>
        </td>`;

      dates.forEach((d, i) => {
        const isTarget = h.target_days[i] === '1';
        if (!isTarget) {
          tbody += '<td class="habit-cell"><div style="width:32px;height:32px;"></div></td>';
          return;
        }
        const log = logs.find(l => l.habit_id === h.id && l.date === d);
        const done = log?.completed === 1;
        const isFuture = d > today();
        const cls = isFuture ? '' : (done ? 'done' : 'missed');
        const icon = done ? '✓' : (isFuture ? '' : '');
        tbody += `<td class="habit-cell">
          <button class="habit-toggle ${cls}" data-hid="${h.id}" data-date="${d}" data-done="${done}" ${isFuture?'disabled':''}>
            ${icon}
          </button>
        </td>`;
      });

      tbody += `<td style="text-align:right;">
        <button class="btn-icon" onclick="App.abitudini.deleteHabit(${h.id})" title="Elimina">🗑️</button>
      </td></tr>`;
    });

    if (!habits.length) {
      tbody = '<tr><td colspan="9" class="empty-state" style="padding:30px;"><p>Nessuna abitudine. Aggiungine una!</p></td></tr>';
    }

    $('#habits-tbody').innerHTML = tbody;

    // Toggle log
    $$('.habit-toggle:not([disabled])', $('#habits-tbody')).forEach(btn => {
      btn.addEventListener('click', async () => {
        const hid = parseInt(btn.dataset.hid);
        const date = btn.dataset.date;
        const done = btn.dataset.done === 'true';
        await window.api.toggleHabitLog(hid, date, !done);
        load();
      });
    });
  }

  function openAddModal() {
    let selectedEmoji = '✅';
    let selectedColor = 'indigo';
    let targetDays = '1111111';

    openModal(`
      <div class="modal-header">
        <span class="modal-title">Nuova abitudine</span>
        <button class="btn-icon" onclick="closeModal()">✕</button>
      </div>
      <div class="form-group"><label class="label">Nome</label>
        <input class="input" id="hab-name" placeholder="es. Acqua 8 bicchieri" /></div>
      <div class="form-group"><label class="label">Icona</label>
        <div class="emoji-grid" id="emoji-grid">
          ${EMOJIS.map(e => `<button class="emoji-btn ${e==='✅'?'selected':''}" data-emoji="${e}">${e}</button>`).join('')}
        </div>
      </div>
      <div class="form-group"><label class="label">Giorni target</label>
        <div class="pill-group" id="days-group">
          ${['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map((d,i) => `<button class="pill active" data-idx="${i}">${d}</button>`).join('')}
        </div>
      </div>
      <div class="form-group"><label class="label">Colore</label>
        <div class="color-grid">
          <div class="color-dot indigo selected" data-color="indigo"></div>
          <div class="color-dot green" data-color="green"></div>
          <div class="color-dot amber" data-color="amber"></div>
          <div class="color-dot red" data-color="red"></div>
          <div class="color-dot violet" data-color="violet"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
        <button class="btn btn-primary" id="hab-save">Salva</button>
      </div>
    `);

    // Emoji picker
    $$('.emoji-btn').forEach(btn => {
      btn.onclick = () => {
        selectedEmoji = btn.dataset.emoji;
        $$('.emoji-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
    });

    // Giorni toggle
    const days = ['1','1','1','1','1','1','1'];
    $$('#days-group .pill').forEach(p => {
      p.onclick = () => {
        const idx = parseInt(p.dataset.idx);
        days[idx] = days[idx] === '1' ? '0' : '1';
        p.classList.toggle('active', days[idx] === '1');
        targetDays = days.join('');
      };
    });

    // Color picker
    $$('.color-dot').forEach(dot => {
      dot.onclick = () => {
        selectedColor = dot.dataset.color;
        $$('.color-dot').forEach(d => d.classList.remove('selected'));
        dot.classList.add('selected');
      };
    });

    $('#hab-save').onclick = async () => {
      const name = $('#hab-name').value.trim();
      if (!name) { showToast('Nome obbligatorio', 'error'); return; }
      await window.api.addHabit({ name, icon: selectedEmoji, target_days: targetDays, color: selectedColor });
      closeModal(); load(); showToast('Abitudine aggiunta', 'success');
    };
  }

  async function deleteHabit(id) {
    const ok = await confirmDialog('Eliminare questa abitudine e tutti i suoi log?');
    if (!ok) return;
    await window.api.deleteHabit(id);
    load(); showToast('Abitudine eliminata', 'success');
  }

  $('#hab-prev').onclick = () => { weekStart = addDays(weekStart, -7); load(); };
  $('#hab-next').onclick = () => { weekStart = addDays(weekStart, 7); load(); };
  $('#btn-add-habit').onclick = () => openAddModal();

  return { load, openAddModal, deleteHabit };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE: NOTE
// ═══════════════════════════════════════════════════════════════════════════════

App.note = (() => {
  let allNotes = [];
  let activeId = null;
  let saveTimer = null;

  async function load() {
    const res = await window.api.getAllNotes();
    allNotes = res.data || [];
    renderList(allNotes);
    if (activeId) {
      const still = allNotes.find(n => n.id === activeId);
      if (!still && allNotes.length) openNote(allNotes[0].id);
    } else if (allNotes.length) {
      openNote(allNotes[0].id);
    }
  }

  function renderList(notes) {
    const el = $('#notes-items');
    if (!notes.length) {
      el.innerHTML = '<div class="empty-state" style="padding:20px;"><p>Nessuna nota</p></div>';
      return;
    }
    el.innerHTML = notes.map(n => `
      <div class="note-item ${n.id === activeId ? 'active' : ''}" data-id="${n.id}">
        <div class="note-item-title">${n.title || 'Senza titolo'}</div>
        <div class="note-item-preview">${(n.preview||'').replace(/[#*_`]/g,'')}</div>
        <div class="note-item-date">${fmtDatetime(n.updated_at)}</div>
      </div>
    `).join('');

    $$('.note-item', el).forEach(item => {
      item.addEventListener('click', () => openNote(parseInt(item.dataset.id)));
    });
  }

  function fmtDatetime(str) {
    if (!str) return '';
    const d = new Date(str);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  }

  async function openNote(id) {
    activeId = id;
    const res = await window.api.getNoteById(id);
    const note = res.data;
    if (!note) return;

    $('#notes-empty').style.display = 'none';
    $('#note-title').style.display = 'block';
    $('#note-body').style.display = 'block';
    $('#note-toolbar').style.display = 'flex';

    $('#note-title').value = note.title || '';
    $('#note-body').value = note.body || '';
    $('#note-tags').value = note.tags || '';
    $('#note-date').textContent = 'Modificato: ' + fmtDatetime(note.updated_at);

    // Evidenzia nota attiva nella lista
    $$('.note-item').forEach(el => el.classList.toggle('active', parseInt(el.dataset.id) === id));
  }

  function scheduleAutosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveActive, 800);
  }

  async function saveActive() {
    if (!activeId) return;
    await window.api.updateNote(activeId, {
      title: $('#note-title').value || 'Senza titolo',
      body: $('#note-body').value,
      tags: $('#note-tags').value
    });
    $('#note-date').textContent = 'Modificato: adesso';
    // Aggiorna preview nella lista senza reload completo
    const res = await window.api.getAllNotes();
    allNotes = res.data || [];
    renderList(allNotes);
  }

  async function addNew() {
    const res = await window.api.addNote({ title: 'Nuova nota', body: '', tags: '' });
    const newId = res.data;
    await load();
    openNote(newId);
    $('#note-title').focus();
    $('#note-title').select();
  }

  async function deleteActive() {
    if (!activeId) return;
    const ok = await confirmDialog('Eliminare questa nota?');
    if (!ok) return;
    await window.api.deleteNote(activeId);
    activeId = null;
    $('#note-title').style.display = 'none';
    $('#note-body').style.display = 'none';
    $('#note-toolbar').style.display = 'none';
    $('#notes-empty').style.display = 'block';
    load();
    showToast('Nota eliminata', 'success');
  }

  // Autosave al typing
  $('#note-title').addEventListener('input', scheduleAutosave);
  $('#note-body').addEventListener('input', scheduleAutosave);
  $('#note-tags').addEventListener('input', scheduleAutosave);

  // Ricerca
  $('#notes-search').addEventListener('input', async e => {
    const q = e.target.value.trim();
    if (!q) { renderList(allNotes); return; }
    const res = await window.api.searchNotes(q);
    renderList(res.data || []);
  });

  $('#btn-add-note').onclick = () => addNew();
  $('#btn-delete-note').onclick = () => deleteActive();

  return { load, addNew };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE: CHAT AI
// ═══════════════════════════════════════════════════════════════════════════════

App.chat = (() => {
  async function load() {
    const keyRes = await window.api.getSetting('anthropic_api_key');
    const hasKey = !!(keyRes.data);
    $('#chat-no-key').style.display = hasKey ? 'none' : 'block';
    $('#chat-container').style.display = hasKey ? 'flex' : 'none';
    if (hasKey) await loadHistory();
  }

  async function loadHistory() {
    const res = await window.api.getChatMessages();
    const msgs = res.data || [];
    const el = $('#chat-messages');
    if (!msgs.length) {
      el.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text-3);">
        <div style="font-size:32px;margin-bottom:12px;">🤖</div>
        <p>Ciao! Sono il tuo assistente personale.<br>Chiedimi qualcosa sul tuo calendario, task o finanze.</p>
      </div>`;
      return;
    }
    el.innerHTML = msgs.map(m => renderBubble(m.role, m.content, m.timestamp)).join('');
    el.scrollTop = el.scrollHeight;
  }

  function renderBubble(role, content, timestamp) {
    const time = timestamp ? new Date(timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
    const html = markdownToHtml(content);
    return `<div class="chat-msg ${role}">
      <div class="chat-avatar">${role === 'user' ? '👤' : '🤖'}</div>
      <div>
        <div class="chat-bubble">${html}</div>
        <div class="chat-time">${time}</div>
      </div>
    </div>`;
  }

  // Markdown minimale → HTML
  function markdownToHtml(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/```[\s\S]*?```/g, m => `<pre><code>${m.slice(3,-3).trim()}</code></pre>`)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/^#{1,3}\s(.+)$/gm, '<strong>$1</strong>')
      .replace(/^[-*]\s(.+)$/gm, '• $1')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>').replace(/$/, '</p>');
  }

  async function send() {
    const input = $('#chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';
    input.style.height = 'auto';

    const el = $('#chat-messages');
    // Rimuovi empty state
    const empty = el.querySelector('div[style*="text-align:center"]');
    if (empty) empty.remove();

    // Mostra messaggio utente
    const time = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    el.insertAdjacentHTML('beforeend', `<div class="chat-msg user">
      <div class="chat-avatar">👤</div>
      <div><div class="chat-bubble">${msg.replace(/</g,'&lt;')}</div><div class="chat-time">${time}</div></div>
    </div>`);

    // Mostra typing indicator
    const thinkId = 'think-' + Date.now();
    el.insertAdjacentHTML('beforeend', `<div class="chat-msg assistant" id="${thinkId}">
      <div class="chat-avatar">🤖</div>
      <div class="chat-thinking"><div class="chat-dots"><span></span><span></span><span></span></div> Sto pensando…</div>
    </div>`);
    el.scrollTop = el.scrollHeight;

    // Chiama AI
    const res = await window.api.aiChat(msg);
    document.getElementById(thinkId)?.remove();

    if (res.ok) {
      el.insertAdjacentHTML('beforeend', renderBubble('assistant', res.data, new Date().toISOString()));
    } else {
      el.insertAdjacentHTML('beforeend', `<div class="chat-msg assistant">
        <div class="chat-avatar">🤖</div>
        <div><div class="chat-bubble" style="color:var(--red);">❌ Errore: ${res.error}</div></div>
      </div>`);
    }
    el.scrollTop = el.scrollHeight;
  }

  function sendSuggestion(btn) {
    $('#chat-input').value = btn.textContent.replace(/^[^\s]+\s/,'').trim();
    send();
  }

  // Auto-resize textarea e invio con Enter
  $('#chat-input').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  $('#chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  $('#btn-chat-send').onclick = () => send();

  $('#btn-clear-chat').onclick = async () => {
    const ok = await confirmDialog('Eliminare tutta la cronologia della chat?');
    if (!ok) return;
    await window.api.clearChat();
    load();
  };

  return { load, send, sendSuggestion };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONE: STUDIO
// ═══════════════════════════════════════════════════════════════════════════════

App.studio = (() => {
  let activeFolder = undefined; // undefined = non inizializzato, null = tutti
  let activeItemId = null;
  let saveTimer = null;
  let scanStream = null;
  let capturedImage = null;

  const TYPE_ICONS = { note: '📝', exercise: '🏋️', file: '📄', scan: '📷', summary: '🤖' };
  const TYPE_LABELS = { note: 'Appunto', exercise: 'Esercizio', file: 'File', scan: 'Scansione', summary: 'Sintesi AI' };
  const FOLDER_COLORS = ['indigo','green','amber','red','violet'];

  async function load() {
    await renderFolders();
    await selectFolder(null);
  }

  async function renderFolders() {
    const res = await window.api.getStudyFolders();
    const folders = res.data || [];
    const tree = $('#studio-folders-tree');
    tree.innerHTML = folders.map(f => {
      const colorMap = { indigo:'var(--accent)', green:'var(--green)', amber:'var(--amber)', red:'var(--red)', violet:'var(--violet)' };
      const col = colorMap[f.color] || 'var(--text-2)';
      return `<div class="studio-folder-item ${activeFolder === f.id ? 'active' : ''}" data-id="${f.id}" onclick="App.studio.selectFolder(${f.id})">
        <span class="studio-folder-icon" style="color:${col};">${f.icon}</span>
        <span class="studio-folder-name">${f.name}</span>
        <div class="studio-folder-actions">
          <button class="btn-icon" style="font-size:11px;" onclick="event.stopPropagation();App.studio.editFolder(${f.id})" title="Rinomina">✏️</button>
          <button class="btn-icon" style="font-size:11px;" onclick="event.stopPropagation();App.studio.deleteFolder(${f.id})" title="Elimina">🗑️</button>
        </div>
      </div>`;
    }).join('');
  }

  async function selectFolder(folderId) {
    activeFolder = folderId;
    // Aggiorna selezione UI
    $$('.studio-folder-item').forEach(el => {
      const id = el.dataset.id;
      el.classList.toggle('active',
        (folderId === null && id === 'all') || (folderId !== null && parseInt(id) === folderId)
      );
    });
    // Titolo
    if (folderId === null) {
      $('#studio-folder-title').textContent = 'Tutti gli elementi';
    } else {
      const res = await window.api.getStudyFolders();
      const f = (res.data||[]).find(f => f.id === folderId);
      $('#studio-folder-title').textContent = f ? `${f.icon} ${f.name}` : 'Cartella';
    }
    await renderItems();
  }

  async function renderItems(query = '') {
    let items;
    if (query) {
      const res = await window.api.searchStudyItems(query);
      items = res.data || [];
    } else {
      const res = await window.api.getStudyItems(activeFolder);
      items = res.data || [];
    }

    const grid = $('#studio-items-grid');
    if (!items.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:40px;">
        <div class="icon">${activeFolder !== null ? '📁' : '📚'}</div>
        <p>Nessun elemento. Usa "+ Aggiungi" per creare appunti, esercizi o caricare file.</p>
      </div>`;
      return;
    }
    grid.innerHTML = items.map(item => {
      const icon = TYPE_ICONS[item.type] || '📄';
      const preview = (item.content || item.file_name || '').slice(0, 80).replace(/[#*`]/g,'');
      return `<div class="studio-item-card ${item.id === activeItemId ? 'active' : ''}" data-id="${item.id}" onclick="App.studio.openItem(${item.id})">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span class="studio-item-type-icon">${icon}</span>
          <span class="item-type-badge item-type-${item.type}">${TYPE_LABELS[item.type]||item.type}</span>
        </div>
        <div class="studio-item-name">${item.title}</div>
        ${preview ? `<div class="studio-item-preview">${preview}</div>` : ''}
        <div class="studio-item-meta">${fmtDate(item.updated_at?.split(' ')[0]||item.created_at?.split(' ')[0])}</div>
      </div>`;
    }).join('');
  }

  async function openItem(id) {
    activeItemId = id;
    const res = await window.api.getStudyItemById(id);
    const item = res.data;
    if (!item) return;

    // Mostra pannello dettaglio
    const layout = $('.studio-layout');
    layout.classList.add('with-detail');
    $('#studio-detail').style.display = 'flex';

    $('#studio-item-title').value = item.title || '';
    $('#studio-item-body').value = item.type === 'file' ? (item.file_name || '') : (item.content || '');
    $('#studio-item-tags').value = item.tags || '';
    $('#studio-item-date').textContent = 'Aggiornato: ' + (item.updated_at?.split(' ')[0] || '');

    // Immagine scan
    const existingImg = $('#studio-detail').querySelector('.studio-scan-img');
    if (existingImg) existingImg.remove();
    if (item.type === 'scan' && item.file_path) {
      const imgRes = await window.api.fileRead(item.file_path);
      if (imgRes.ok) {
        const img = document.createElement('img');
        img.className = 'studio-scan-img';
        img.src = `data:image/jpeg;base64,${imgRes.data}`;
        $('#studio-item-body').insertAdjacentElement('afterend', img);
      }
    }

    // Body read-only per file/scan
    $('#studio-item-body').readOnly = (item.type === 'file');

    // Nascondi AI result precedente
    $('#studio-ai-result').style.display = 'none';

    // Aggiorna cards
    $$('.studio-item-card').forEach(c => c.classList.toggle('active', parseInt(c.dataset.id) === id));
  }

  function closeDetail() {
    $('.studio-layout').classList.remove('with-detail');
    $('#studio-detail').style.display = 'none';
    activeItemId = null;
    $$('.studio-item-card').forEach(c => c.classList.remove('active'));
  }

  function scheduleItemSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveActiveItem, 600);
  }

  async function saveActiveItem() {
    if (!activeItemId) return;
    await window.api.updateStudyItem(activeItemId, {
      title: $('#studio-item-title').value || 'Senza titolo',
      content: $('#studio-item-body').value,
      tags: $('#studio-item-tags').value
    });
    // Aggiorna la card nella griglia
    const card = $(`.studio-item-card[data-id="${activeItemId}"]`);
    if (card) {
      const nameEl = card.querySelector('.studio-item-name');
      if (nameEl) nameEl.textContent = $('#studio-item-title').value || 'Senza titolo';
    }
  }

  // Autosave
  $('#studio-item-title').addEventListener('input', scheduleItemSave);
  $('#studio-item-body').addEventListener('input', scheduleItemSave);
  $('#studio-item-tags').addEventListener('input', scheduleItemSave);

  function openAddModal() {
    openModal(`
      <div class="modal-header">
        <span class="modal-title">Nuovo elemento</span>
        <button class="btn-icon" onclick="closeModal()">✕</button>
      </div>
      <div class="form-group"><label class="label">Tipo</label>
        <div class="toggle-group" id="item-type-toggle">
          <button class="toggle-btn active" data-val="note">📝 Appunto</button>
          <button class="toggle-btn" data-val="exercise">🏋️ Esercizio</button>
          <button class="toggle-btn" data-val="file">📄 File</button>
        </div>
      </div>
      <div class="form-group"><label class="label">Titolo *</label>
        <input class="input" id="si-title" placeholder="Titolo" /></div>
      <div class="form-group"><label class="label">Contenuto</label>
        <textarea class="textarea" id="si-content" placeholder="Appunti, testo, descrizione…" style="min-height:100px;"></textarea></div>
      <div class="form-group"><label class="label">Tag</label>
        <input class="input" id="si-tags" placeholder="matematica, esame, importante" /></div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
        <button class="btn btn-primary" id="si-save">Crea</button>
      </div>
    `);

    let itemType = 'note';
    $$('#item-type-toggle .toggle-btn').forEach(btn => {
      btn.onclick = () => {
        itemType = btn.dataset.val;
        $$('#item-type-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      };
    });

    $('#si-save').onclick = async () => {
      const title = $('#si-title').value.trim();
      if (!title) { showToast('Titolo obbligatorio', 'error'); return; }
      const res = await window.api.addStudyItem({
        folder_id: activeFolder || null,
        type: itemType,
        title,
        content: $('#si-content').value.trim(),
        tags: $('#si-tags').value.trim()
      });
      closeModal();
      await renderItems();
      if (res.data) openItem(res.data);
      showToast('Elemento creato', 'success');
    };
  }

  function openAddFolderModal(existing = null) {
    openModal(`
      <div class="modal-header">
        <span class="modal-title">${existing ? 'Modifica cartella' : 'Nuova cartella'}</span>
        <button class="btn-icon" onclick="closeModal()">✕</button>
      </div>
      <div class="form-group"><label class="label">Nome</label>
        <input class="input" id="fold-name" value="${existing?.name||''}" placeholder="es. Matematica" /></div>
      <div class="form-group"><label class="label">Icona</label>
        <div class="emoji-grid" id="fold-emoji-grid">
          ${['📁','📚','📐','📜','🔬','🎨','🌍','💡','🏛️','⚗️','🖥️','📖','🎵','🧮','✏️','📊'].map(e =>
            `<button class="emoji-btn ${(existing?.icon||'📁')===e?'selected':''}" data-emoji="${e}">${e}</button>`
          ).join('')}
        </div>
      </div>
      <div class="form-group"><label class="label">Colore</label>
        <div class="color-grid">
          ${FOLDER_COLORS.map(c => `<div class="color-dot ${c} ${(existing?.color||'indigo')===c?'selected':''}" data-color="${c}"></div>`).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
        <button class="btn btn-primary" id="fold-save">${existing ? 'Salva' : 'Crea'}</button>
      </div>
    `);

    let icon = existing?.icon || '📁';
    let color = existing?.color || 'indigo';

    $$('#fold-emoji-grid .emoji-btn').forEach(btn => {
      btn.onclick = () => {
        icon = btn.dataset.emoji;
        $$('#fold-emoji-grid .emoji-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
    });
    $$('.color-dot').forEach(dot => {
      dot.onclick = () => {
        color = dot.dataset.color;
        $$('.color-dot').forEach(d => d.classList.remove('selected'));
        dot.classList.add('selected');
      };
    });

    $('#fold-save').onclick = async () => {
      const name = $('#fold-name').value.trim();
      if (!name) { showToast('Nome obbligatorio', 'error'); return; }
      if (existing) {
        await window.api.updateStudyFolder(existing.id, { name, icon, color });
        showToast('Cartella aggiornata', 'success');
      } else {
        await window.api.addStudyFolder({ name, icon, color });
        showToast('Cartella creata', 'success');
      }
      closeModal();
      await renderFolders();
    };
  }

  async function editFolder(id) {
    const res = await window.api.getStudyFolders();
    const f = (res.data||[]).find(f => f.id === id);
    if (f) openAddFolderModal(f);
  }

  async function deleteFolder(id) {
    const ok = await confirmDialog('Eliminare questa cartella e tutto il suo contenuto?');
    if (!ok) return;
    await window.api.deleteStudyFolder(id);
    if (activeFolder === id) { activeFolder = null; closeDetail(); }
    await renderFolders();
    await renderItems();
    showToast('Cartella eliminata', 'success');
  }

  async function deleteItem() {
    if (!activeItemId) return;
    const ok = await confirmDialog('Eliminare questo elemento?');
    if (!ok) return;
    await window.api.deleteStudyItem(activeItemId);
    closeDetail();
    await renderItems();
    showToast('Elemento eliminato', 'success');
  }

  // ── AI ──────────────────────────────────────────────────────────────────────

  async function aiAction(action) {
    if (!activeItemId) return;

    const content = $('#studio-item-body').value.trim();
    if (!content) { showToast('Nessun contenuto da elaborare', 'error'); return; }

    const labels = { summarize:'✨ Riassunto', schema:'🗂️ Schema', humanize:'💬 Versione semplificata', organize:'🧠 Suggerimenti organizzazione' };
    const resultEl = $('#studio-ai-result');
    const labelEl = $('#studio-ai-result-label');
    const bodyEl = $('#studio-ai-result-body');

    labelEl.textContent = labels[action] || action;
    bodyEl.textContent = '⏳ Elaborazione in corso…';
    resultEl.style.display = 'block';

    const res = await window.api.aiAction(action, content, activeItemId);
    if (res.ok) {
      bodyEl.textContent = res.data;
    } else {
      bodyEl.textContent = '❌ ' + res.error;
    }
  }

  // ── SCANNER ─────────────────────────────────────────────────────────────────

  async function openScanner() {
    if (!activeItemId) { showToast('Seleziona prima un elemento', 'error'); return; }
    capturedImage = null;
    $('#scanner-preview').style.display = 'none';
    $('#scanner-video').style.display = 'block';
    $('#btn-scanner-capture').style.display = 'inline-flex';
    $('#btn-scanner-use').style.display = 'none';
    $('#btn-scanner-retake').style.display = 'none';
    $('#scanner-overlay').classList.add('open');

    try {
      scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      $('#scanner-video').srcObject = scanStream;
    } catch(e) {
      showToast('Fotocamera non disponibile: ' + e.message, 'error');
      closeScanner();
    }
  }

  function scannerCapture() {
    const video = $('#scanner-video');
    const canvas = $('#scanner-canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    capturedImage = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    $('#scanner-preview').src = 'data:image/jpeg;base64,' + capturedImage;
    $('#scanner-preview').style.display = 'block';
    $('#scanner-video').style.display = 'none';
    $('#btn-scanner-capture').style.display = 'none';
    $('#btn-scanner-use').style.display = 'inline-flex';
    $('#btn-scanner-retake').style.display = 'inline-flex';
    if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  }

  function scannerRetake() {
    capturedImage = null;
    openScanner();
  }

  async function scannerUse() {
    if (!capturedImage || !activeItemId) return;
    const title = $('#studio-item-title').value || 'scansione';
    const fileName = `scan_${Date.now()}.jpg`;
    const saveRes = await window.api.fileSave(fileName, capturedImage);
    if (!saveRes.ok) { showToast('Errore salvataggio: ' + saveRes.error, 'error'); return; }

    // Aggiorna l'item come scan con file_path
    await window.api.updateStudyItem(activeItemId, {
      title: title,
      content: $('#studio-item-body').value,
      tags: $('#studio-item-tags').value
    });
    // Salva file_path tramite addStudyItem workaround: usa db direttamente via updateStudyItem
    // Ricarichiamo l'item con file_path aggiornato
    const r = await window.api.getStudyItemById(activeItemId);
    if (r.data) {
      // Aggiorna anche file_path: utilizziamo deleteItem + addStudyItem
      await window.api.deleteStudyItem(activeItemId);
      const newRes = await window.api.addStudyItem({
        folder_id: r.data.folder_id,
        type: 'scan',
        title: title,
        content: r.data.content || '',
        file_path: saveRes.data,
        file_name: fileName,
        tags: r.data.tags || ''
      });
      activeItemId = newRes.data;
    }

    closeScanner();
    await renderItems();
    if (activeItemId) openItem(activeItemId);
    showToast('Scansione salvata!', 'success');
  }

  function closeScanner() {
    if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
    $('#scanner-overlay').classList.remove('open');
  }

  // ── FILE UPLOAD ──────────────────────────────────────────────────────────────

  async function uploadFile() {
    const res = await window.api.fileOpenDialog();
    if (!res.ok) return;
    const { fileName, base64, size } = res.data;
    const saveRes = await window.api.fileSave(fileName, base64);
    if (!saveRes.ok) { showToast('Errore upload: ' + saveRes.error, 'error'); return; }

    const sizeLabel = size > 1024*1024 ? (size/1024/1024).toFixed(1)+'MB' : Math.round(size/1024)+'KB';
    const newRes = await window.api.addStudyItem({
      folder_id: activeFolder || null,
      type: 'file',
      title: fileName,
      content: `File caricato: ${fileName} (${sizeLabel})`,
      file_path: saveRes.data,
      file_name: fileName,
    });
    await renderItems();
    if (newRes.data) openItem(newRes.data);
    showToast('File caricato: ' + fileName, 'success');
  }

  // ── RICERCA ──────────────────────────────────────────────────────────────────
  let searchTimer = null;
  $('#studio-search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => renderItems(e.target.value.trim()), 300);
  });

  // ── PULSANTI ─────────────────────────────────────────────────────────────────
  $('#btn-add-folder').onclick = () => openAddFolderModal();
  $('#btn-add-item').onclick = () => {
    // Se viene cliccato con Alt, carica file direttamente
    openAddModal();
  };
  $('#btn-delete-item').onclick = () => deleteItem();
  $('#btn-studio-scan').onclick = () => openScanner();
  $('#btn-close-detail').onclick = () => closeDetail();

  return {
    load, selectFolder, openItem, closeDetail,
    editFolder, deleteFolder, aiAction,
    openScanner, scannerCapture, scannerRetake, scannerUse, closeScanner,
    uploadFile
  };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// IMPOSTAZIONI (API KEY)
// ═══════════════════════════════════════════════════════════════════════════════

App.openSettings = async function() {
  const keyRes = await window.api.getSetting('anthropic_api_key');
  const currentKey = keyRes.data || '';
  const masked = currentKey ? currentKey.slice(0,8) + '…' + currentKey.slice(-4) : '';

  openModal(`
    <div class="modal-header">
      <span class="modal-title">⚙️ Impostazioni</span>
      <button class="btn-icon" onclick="closeModal()">✕</button>
    </div>

    <div style="margin-bottom:16px;">
      <label class="label">🔑 Anthropic API Key</label>
      <div style="font-size:11px;color:var(--text-3);margin-bottom:8px;">
        Ottieni la tua key su <span style="color:var(--accent);">console.anthropic.com</span> → API Keys.
        Necessaria per Chat AI e funzioni AI nello Studio.
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        <input type="text" class="input" id="settings-api-key"
          placeholder="sk-ant-api03-…"
          value="${currentKey}"
          autocomplete="off" spellcheck="false"
          style="font-family:monospace;font-size:12px;flex:1;" />
        <button class="btn btn-ghost btn-sm" id="btn-paste-key" title="Incolla dagli appunti" style="flex-shrink:0;white-space:nowrap;">
          📋 Incolla
        </button>
      </div>
      ${masked ? `<div style="font-size:11px;color:var(--text-3);margin-top:4px;">Key attuale: ${masked}</div>` : ''}
    </div>

    <div style="margin-bottom:16px;">
      <label class="label">🤖 Modello AI</label>
      <select class="select" id="settings-model">
        <option value="claude-sonnet-4-6" selected>Claude Sonnet 4.6 (consigliato)</option>
        <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (più veloce)</option>
        <option value="claude-opus-4-8">Claude Opus 4.8 (più potente)</option>
      </select>
    </div>

    <div id="settings-test-result" style="display:none;padding:8px 12px;border-radius:var(--radius-sm);font-size:12px;margin-bottom:12px;"></div>

    <div class="modal-footer">
      <button class="btn btn-ghost" id="btn-test-ai">🔌 Testa connessione</button>
      <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
      <button class="btn btn-primary" id="btn-save-settings">Salva</button>
    </div>
  `);

  // Bottone incolla dagli appunti
  $('#btn-paste-key').onclick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      $('#settings-api-key').value = text.trim();
      $('#settings-api-key').focus();
      showToast('API key incollata', 'success');
    } catch(e) {
      // Fallback: porta il focus sul campo e triggera un paste nativo
      const input = $('#settings-api-key');
      input.focus();
      document.execCommand('paste');
    }
  };

  // Focus automatico sul campo all'apertura
  setTimeout(() => $('#settings-api-key')?.focus(), 120);

  $('#btn-test-ai').onclick = async () => {
    const key = $('#settings-api-key').value.trim();
    if (!key) { showToast('Inserisci prima una API key', 'error'); return; }
    await window.api.aiSetApiKey(key);
    $('#btn-test-ai').textContent = '⏳ Test…';
    const res = await window.api.aiTestConnection();
    const el = $('#settings-test-result');
    el.style.display = 'block';
    if (res.ok) {
      el.style.background = 'rgba(34,197,94,0.1)';
      el.style.color = 'var(--green)';
      el.style.border = '1px solid rgba(34,197,94,0.3)';
      el.textContent = '✓ Connessione riuscita! L\'AI è pronta.';
    } else {
      el.style.background = 'rgba(239,68,68,0.1)';
      el.style.color = 'var(--red)';
      el.style.border = '1px solid rgba(239,68,68,0.3)';
      el.textContent = '✗ Errore: ' + res.error;
    }
    $('#btn-test-ai').textContent = '🔌 Testa connessione';
  };

  $('#btn-save-settings').onclick = async () => {
    const key = $('#settings-api-key').value.trim();
    if (key) await window.api.aiSetApiKey(key);
    closeModal();
    showToast('Impostazioni salvate', 'success');
    // Ricarica chat se aperta
    if ($('#s-chat').classList.contains('active')) App.chat.load();
  };
};

$('#btn-settings').addEventListener('click', App.openSettings);

// ─── AGGIORNA NAVIGAZIONE PER NUOVE SEZIONI ───────────────────────────────────

// Ricarica le nuove sezioni quando vengono selezionate
const sectionLoaders = {
  chat: () => App.chat.load(),
  studio: () => App.studio.load()
};

$$('.nav-item[data-section]').forEach(item => {
  item.addEventListener('click', () => {
    const sec = item.dataset.section;
    if (sectionLoaders[sec]) sectionLoaders[sec]();
  });
});

// ─── AVVIO APP ────────────────────────────────────────────────────────────────

App.oggi.load();
