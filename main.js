// main.js — processo principale Electron
const { app, BrowserWindow, ipcMain, dialog, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0d0d14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    checkTodayNotifications();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  // Inizializza db in modo asincrono (sql.js carica WASM)
  db = require('./db.js');
  await db.init(app);
  createWindow();
  registerIpcHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── CONTROLLI FINESTRA ───────────────────────────────────────────────────────

ipcMain.on('win-minimize', () => mainWindow?.minimize());
ipcMain.on('win-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('win-close', () => mainWindow?.close());

// ─── REGISTRAZIONE HANDLER IPC ────────────────────────────────────────────────

function registerIpcHandlers() {
  // Wrapper generico per handler sincroni db
  function handle(channel, fn) {
    ipcMain.handle(channel, (_event, ...args) => {
      try { return { ok: true, data: fn(...args) }; }
      catch (e) { console.error(channel, e); return { ok: false, error: e.message }; }
    });
  }

  // Eventi
  handle('db:getEventsByDate',  (date) => db.getEventsByDate(date));
  handle('db:getEventsByWeek',  (s, e) => db.getEventsByWeek(s, e));
  handle('db:getEventsByMonth', (y, m) => db.getEventsByMonth(y, m));
  handle('db:addEvent',         (ev)   => db.addEvent(ev));
  handle('db:updateEvent',      (id, ev) => db.updateEvent(id, ev));
  handle('db:deleteEvent',      (id)   => db.deleteEvent(id));

  // Transazioni
  handle('db:getTransactionsByMonth', (y, m) => db.getTransactionsByMonth(y, m));
  handle('db:getMonthSummary',        (y, m) => db.getMonthSummary(y, m));
  handle('db:getWeeklyTotals',        (y, m) => db.getWeeklyTotals(y, m));
  handle('db:getCategoryTotals',      (y, m) => db.getCategoryTotals(y, m));
  handle('db:addTransaction',         (tx)   => db.addTransaction(tx));
  handle('db:updateTransaction',      (id, tx) => db.updateTransaction(id, tx));
  handle('db:deleteTransaction',      (id)   => db.deleteTransaction(id));

  // Sport
  handle('db:getSportByMonth',    (y, m) => db.getSportByMonth(y, m));
  handle('db:getSportStats',      (y, m) => db.getSportStats(y, m));
  handle('db:addSportSession',    (s)    => db.addSportSession(s));
  handle('db:updateSportSession', (id, s) => db.updateSportSession(id, s));
  handle('db:deleteSportSession', (id)   => db.deleteSportSession(id));

  // Task
  handle('db:getAllTasks',    ()       => db.getAllTasks());
  handle('db:getTasksByStatus', (st)  => db.getTasksByStatus(st));
  handle('db:addTask',        (t)     => db.addTask(t));
  handle('db:updateTask',     (id, t) => db.updateTask(id, t));
  handle('db:deleteTask',     (id)    => db.deleteTask(id));

  // Abitudini
  handle('db:getActiveHabits',      ()          => db.getActiveHabits());
  handle('db:addHabit',             (h)         => db.addHabit(h));
  handle('db:updateHabit',          (id, h)     => db.updateHabit(id, h));
  handle('db:deleteHabit',          (id)        => db.deleteHabit(id));
  handle('db:getHabitLogsForWeek',  (s, e)      => db.getHabitLogsForWeek(s, e));
  handle('db:toggleHabitLog',       (hid, d, c) => db.toggleHabitLog(hid, d, c));

  // Note
  handle('db:getAllNotes',   ()       => db.getAllNotes());
  handle('db:getNoteById',   (id)    => db.getNoteById(id));
  handle('db:searchNotes',   (q)     => db.searchNotes(q));
  handle('db:addNote',       (n)     => db.addNote(n));
  handle('db:updateNote',    (id, n) => db.updateNote(id, n));
  handle('db:deleteNote',    (id)    => db.deleteNote(id));

  // Export
  ipcMain.handle('db:exportAll', async () => {
    try {
      const data = db.exportAll();
      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Esporta dati WeekOrganizer',
        defaultPath: `weekorganizer-export-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });
      if (!filePath) return { ok: false, error: 'Annullato' };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { ok: true, data: filePath };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
}

// ─── NOTIFICHE EVENTI DEL GIORNO ──────────────────────────────────────────────

function checkTodayNotifications() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const events = db.getEventsByDate(today);
    const tasks = db.getAllTasks().filter(t => t.due_date === today && t.status !== 'done');

    if (tasks.length > 0 && Notification.isSupported()) {
      new Notification({
        title: 'WeekOrganizer — Task di oggi',
        body: `Hai ${tasks.length} task in scadenza oggi`
      }).show();
    }

    // Pianifica notifiche per eventi con orario
    const now = new Date();
    events.forEach(ev => {
      if (!ev.time_start) return;
      const [h, m] = ev.time_start.split(':').map(Number);
      const evTime = new Date();
      evTime.setHours(h, m, 0, 0);
      const notifyAt = new Date(evTime.getTime() - 15 * 60000);
      const delay = notifyAt.getTime() - now.getTime();
      if (delay > 0 && delay < 8 * 3600000) {
        setTimeout(() => {
          if (Notification.isSupported()) {
            new Notification({
              title: `Evento tra 15 minuti: ${ev.title}`,
              body: ev.location ? `📍 ${ev.location}` : `Alle ${ev.time_start}`
            }).show();
          }
        }, delay);
      }
    });
  } catch (e) {
    console.error('Errore notifiche:', e);
  }
}
