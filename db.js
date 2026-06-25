// db.js — gestione SQLite con sql.js (puro WebAssembly, senza compilazione nativa)
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

let db;       // istanza Database sql.js
let dbPath;   // percorso file .db

// ─── UTILS QUERY ─────────────────────────────────────────────────────────────

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function run(sql, params = []) {
  db.run(sql, params);
  persist();
  // Restituisce lastInsertRowid
  const r = get('SELECT last_insert_rowid() as id');
  return r ? r.id : null;
}

function exec(sql) {
  db.exec(sql);
  persist();
}

function persist() {
  if (!dbPath) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// ─── INIZIALIZZAZIONE ASINCRONA ──────────────────────────────────────────────

async function init(app) {
  const SQL = await initSqlJs({
    locateFile: file => path.join(__dirname, 'node_modules/sql.js/dist/', file)
  });

  if (app.isPackaged) {
    dbPath = path.join(app.getPath('userData'), 'organizer.db');
  } else {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    dbPath = path.join(dataDir, 'organizer.db');
  }

  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  createTables();
  seedIfEmpty();
}

// ─── CREAZIONE TABELLE ────────────────────────────────────────────────────────

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time_start TEXT,
      time_end TEXT,
      category TEXT DEFAULT 'altro',
      location TEXT,
      notes TEXT,
      repeat TEXT DEFAULT 'never'
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      category TEXT,
      method TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS sport_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      duration_min INTEGER,
      intensity TEXT,
      calories INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'todo',
      project TEXT,
      created_at TEXT DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '✅',
      target_days TEXT DEFAULT '1111111',
      color TEXT DEFAULT 'indigo',
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      UNIQUE(habit_id, date),
      FOREIGN KEY(habit_id) REFERENCES habits(id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT DEFAULT 'Nuova nota',
      body TEXT,
      tags TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  persist();
}

// ─── SEED DATI DI ESEMPIO ─────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split('T')[0]; }
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
function daysAhead(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function seedIfEmpty() {
  const cnt = get('SELECT COUNT(*) as c FROM events');
  if (cnt && cnt.c > 0) return;

  const today = todayStr();
  const tomorrow = daysAhead(1);
  const monthPfx = today.slice(0,7);

  // Seed eventi
  db.run(`INSERT INTO events (title,date,time_start,time_end,category,location,notes) VALUES
    ('Riunione progetto','${today}','09:00','10:30','lavoro','Ufficio sala riunioni','Presentazione Q3'),
    ('Palestra','${today}','18:00','19:30','sport','Palestra FitLife',''),
    ('Cena con Marco','${tomorrow}','20:00','22:00','personale','Ristorante da Paolo','')`);

  // Seed transazioni
  db.run(`INSERT INTO transactions (type,amount,description,date,category,method) VALUES
    ('income',1800,'Stipendio giugno','${monthPfx}-01','Stipendio','debit'),
    ('expense',45.50,'Spesa supermercato','${today}','Cibo','debit'),
    ('expense',12.00,'Pranzo fuori','${today}','Cibo','cash'),
    ('expense',60.00,'Abbonamento palestra','${monthPfx}-05','Salute','debit'),
    ('income',300,'Freelance logo design','${monthPfx}-10','Freelance','debit')`);

  // Seed sessioni sport
  const d1 = daysAgo(2), d2 = daysAgo(4);
  db.run(`INSERT INTO sport_sessions (type,date,duration_min,intensity,calories) VALUES
    ('💪 Palestra','${d1}',75,'high',420),
    ('🏃 Corsa','${d2}',45,'medium',380),
    ('🚴 Bici','${today}',60,'medium',350)`);

  // Seed task
  db.run(`INSERT INTO tasks (title,description,due_date,priority,status,project) VALUES
    ('Revisione contratto cliente','Verificare clausole e condizioni','${today}','high','todo','Commerciale'),
    ('Aggiornare portfolio','Aggiungere ultimi 3 progetti completati','${tomorrow}','medium','inprogress','Personale'),
    ('Preparare presentazione Q3','Slide con KPI e obiettivi','${today}','high','todo','Commerciale'),
    ('Backup database','Eseguire backup settimanale','${today}','low','done','Tech')`);

  // Seed abitudini
  db.run(`INSERT INTO habits (name,icon,target_days,color) VALUES
    ('Acqua (8 bicchieri)','💧','1111111','indigo'),
    ('Sport','💪','1110100','green'),
    ('Lettura','📚','1111111','amber'),
    ('Meditazione','🧘','1111111','violet'),
    ('Sonno regolare','😴','1111111','indigo')`);

  // Seed log abitudini ultimi 5 giorni
  const habits = all('SELECT id FROM habits');
  for (let i = 1; i <= 5; i++) {
    const d = daysAgo(i);
    habits.forEach(h => {
      const completed = Math.random() > 0.3 ? 1 : 0;
      db.run(`INSERT OR IGNORE INTO habit_logs (habit_id,date,completed) VALUES (?,?,?)`, [h.id, d, completed]);
    });
  }

  // Seed note
  db.run(`INSERT INTO notes (title,body,tags) VALUES
    ('Idee progetto weekend','## Idee\n- Costruire un parser CSV\n- Studiare Three.js\n- Riparare la bici\n\n## Risorse\n- MDN Web Docs\n- YouTube tutorials','idee,weekend,progetti'),
    ('Lista libri da leggere','1. **Il nome della rosa** — Umberto Eco\n2. **Sapiens** — Harari\n3. **Il Maestro e Margherita** — Bulgakov','libri,lettura')`);

  persist();
}

// ─── CRUD EVENTI ──────────────────────────────────────────────────────────────

function getEventsByDate(date) {
  return all('SELECT * FROM events WHERE date = ? ORDER BY time_start', [date]);
}

function getEventsByWeek(startDate, endDate) {
  return all('SELECT * FROM events WHERE date >= ? AND date <= ? ORDER BY date, time_start', [startDate, endDate]);
}

function getEventsByMonth(year, month) {
  const prefix = `${year}-${String(month).padStart(2,'0')}%`;
  return all('SELECT * FROM events WHERE date LIKE ? ORDER BY date, time_start', [prefix]);
}

function addEvent(ev) {
  return run('INSERT INTO events (title,date,time_start,time_end,category,location,notes,repeat) VALUES (?,?,?,?,?,?,?,?)',
    [ev.title, ev.date, ev.time_start||null, ev.time_end||null, ev.category||'altro', ev.location||null, ev.notes||null, ev.repeat||'never']);
}

function updateEvent(id, ev) {
  run('UPDATE events SET title=?,date=?,time_start=?,time_end=?,category=?,location=?,notes=?,repeat=? WHERE id=?',
    [ev.title, ev.date, ev.time_start||null, ev.time_end||null, ev.category||'altro', ev.location||null, ev.notes||null, ev.repeat||'never', id]);
}

function deleteEvent(id) {
  run('DELETE FROM events WHERE id=?', [id]);
}

// ─── CRUD TRANSAZIONI ─────────────────────────────────────────────────────────

function getTransactionsByMonth(year, month) {
  const prefix = `${year}-${String(month).padStart(2,'0')}%`;
  return all('SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC', [prefix]);
}

function getMonthSummary(year, month) {
  const prefix = `${year}-${String(month).padStart(2,'0')}%`;
  const rows = all('SELECT type, SUM(amount) as total FROM transactions WHERE date LIKE ? GROUP BY type', [prefix]);
  const income = rows.find(r => r.type === 'income')?.total || 0;
  const expense = rows.find(r => r.type === 'expense')?.total || 0;
  return { income, expense, balance: income - expense };
}

function getWeeklyTotals(year, month) {
  const prefix = `${year}-${String(month).padStart(2,'0')}%`;
  return all(`
    SELECT CAST((CAST(strftime('%d', date) AS INTEGER) - 1) / 7 AS INTEGER) + 1 as week,
      type, SUM(amount) as total
    FROM transactions WHERE date LIKE ?
    GROUP BY week, type ORDER BY week`, [prefix]);
}

function getCategoryTotals(year, month) {
  const prefix = `${year}-${String(month).padStart(2,'0')}%`;
  return all(`SELECT category, SUM(amount) as total FROM transactions
    WHERE date LIKE ? AND type='expense' GROUP BY category ORDER BY total DESC`, [prefix]);
}

function addTransaction(tx) {
  return run('INSERT INTO transactions (type,amount,description,date,category,method,notes) VALUES (?,?,?,?,?,?,?)',
    [tx.type, tx.amount, tx.description||null, tx.date, tx.category||null, tx.method||null, tx.notes||null]);
}

function updateTransaction(id, tx) {
  run('UPDATE transactions SET type=?,amount=?,description=?,date=?,category=?,method=?,notes=? WHERE id=?',
    [tx.type, tx.amount, tx.description||null, tx.date, tx.category||null, tx.method||null, tx.notes||null, id]);
}

function deleteTransaction(id) { run('DELETE FROM transactions WHERE id=?', [id]); }

// ─── CRUD SPORT ───────────────────────────────────────────────────────────────

function getSportByMonth(year, month) {
  const prefix = `${year}-${String(month).padStart(2,'0')}%`;
  return all('SELECT * FROM sport_sessions WHERE date LIKE ? ORDER BY date DESC', [prefix]);
}

function getSportStats(year, month) {
  const prefix = `${year}-${String(month).padStart(2,'0')}%`;
  const sessions = all('SELECT * FROM sport_sessions WHERE date LIKE ? ORDER BY date', [prefix]);
  const totalMin = sessions.reduce((s,r) => s + (r.duration_min||0), 0);

  const allDates = all('SELECT DISTINCT date FROM sport_sessions ORDER BY date DESC').map(r => r.date);
  let streak = 0;
  const td = todayStr();
  let check = td;
  while (allDates.includes(check)) {
    streak++;
    const d = new Date(check + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    check = d.toISOString().split('T')[0];
  }
  return { count: sessions.length, totalMin, totalHours: (totalMin/60).toFixed(1), streak };
}

function addSportSession(s) {
  return run('INSERT INTO sport_sessions (type,date,duration_min,intensity,calories,notes) VALUES (?,?,?,?,?,?)',
    [s.type, s.date, s.duration_min||null, s.intensity||null, s.calories||null, s.notes||null]);
}

function updateSportSession(id, s) {
  run('UPDATE sport_sessions SET type=?,date=?,duration_min=?,intensity=?,calories=?,notes=? WHERE id=?',
    [s.type, s.date, s.duration_min||null, s.intensity||null, s.calories||null, s.notes||null, id]);
}

function deleteSportSession(id) { run('DELETE FROM sport_sessions WHERE id=?', [id]); }

// ─── CRUD TASK ────────────────────────────────────────────────────────────────

function getAllTasks() {
  return all(`SELECT * FROM tasks ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, due_date`);
}

function getTasksByStatus(status) {
  return all('SELECT * FROM tasks WHERE status=? ORDER BY due_date', [status]);
}

function addTask(t) {
  return run('INSERT INTO tasks (title,description,due_date,priority,status,project) VALUES (?,?,?,?,?,?)',
    [t.title, t.description||null, t.due_date||null, t.priority||'medium', t.status||'todo', t.project||null]);
}

function updateTask(id, t) {
  run('UPDATE tasks SET title=?,description=?,due_date=?,priority=?,status=?,project=? WHERE id=?',
    [t.title, t.description||null, t.due_date||null, t.priority||'medium', t.status||'todo', t.project||null, id]);
}

function deleteTask(id) { run('DELETE FROM tasks WHERE id=?', [id]); }

// ─── CRUD ABITUDINI ───────────────────────────────────────────────────────────

function getActiveHabits() { return all('SELECT * FROM habits WHERE active=1'); }

function addHabit(h) {
  return run('INSERT INTO habits (name,icon,target_days,color) VALUES (?,?,?,?)',
    [h.name, h.icon||'✅', h.target_days||'1111111', h.color||'indigo']);
}

function updateHabit(id, h) {
  run('UPDATE habits SET name=?,icon=?,target_days=?,color=? WHERE id=?',
    [h.name, h.icon||'✅', h.target_days||'1111111', h.color||'indigo', id]);
}

function deleteHabit(id) {
  run('DELETE FROM habits WHERE id=?', [id]);
  run('DELETE FROM habit_logs WHERE habit_id=?', [id]);
}

function getHabitLogsForWeek(startDate, endDate) {
  return all('SELECT * FROM habit_logs WHERE date >= ? AND date <= ?', [startDate, endDate]);
}

function toggleHabitLog(habitId, date, completed) {
  run(`INSERT INTO habit_logs (habit_id,date,completed) VALUES (?,?,?)
    ON CONFLICT(habit_id,date) DO UPDATE SET completed=excluded.completed`,
    [habitId, date, completed ? 1 : 0]);
}

// ─── CRUD NOTE ────────────────────────────────────────────────────────────────

function getAllNotes() {
  return all("SELECT id,title,tags,substr(body,1,100) as preview,updated_at FROM notes ORDER BY updated_at DESC");
}

function getNoteById(id) {
  return get('SELECT * FROM notes WHERE id=?', [id]);
}

function searchNotes(query) {
  const q = `%${query}%`;
  return all("SELECT id,title,tags,substr(body,1,100) as preview,updated_at FROM notes WHERE title LIKE ? OR body LIKE ? ORDER BY updated_at DESC", [q, q]);
}

function addNote(n) {
  return run('INSERT INTO notes (title,body,tags) VALUES (?,?,?)',
    [n.title||'Nuova nota', n.body||'', n.tags||'']);
}

function updateNote(id, n) {
  run("UPDATE notes SET title=?,body=?,tags=?,updated_at=datetime('now') WHERE id=?",
    [n.title, n.body||'', n.tags||'', id]);
}

function deleteNote(id) { run('DELETE FROM notes WHERE id=?', [id]); }

// ─── EXPORT ───────────────────────────────────────────────────────────────────

function exportAll() {
  return {
    events: all('SELECT * FROM events'),
    transactions: all('SELECT * FROM transactions'),
    sport_sessions: all('SELECT * FROM sport_sessions'),
    tasks: all('SELECT * FROM tasks'),
    habits: all('SELECT * FROM habits'),
    habit_logs: all('SELECT * FROM habit_logs'),
    notes: all('SELECT * FROM notes'),
    exported_at: new Date().toISOString()
  };
}

module.exports = {
  init,
  getEventsByDate, getEventsByWeek, getEventsByMonth, addEvent, updateEvent, deleteEvent,
  getTransactionsByMonth, getMonthSummary, getWeeklyTotals, getCategoryTotals,
  addTransaction, updateTransaction, deleteTransaction,
  getSportByMonth, getSportStats, addSportSession, updateSportSession, deleteSportSession,
  getAllTasks, getTasksByStatus, addTask, updateTask, deleteTask,
  getActiveHabits, addHabit, updateHabit, deleteHabit, getHabitLogsForWeek, toggleHabitLog,
  getAllNotes, getNoteById, searchNotes, addNote, updateNote, deleteNote,
  exportAll
};
