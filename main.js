// main.js — processo principale Electron
const { app, BrowserWindow, ipcMain, dialog, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let db;
let anthropicClient = null;

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
      nodeIntegration: false,
      // Necessario per accesso fotocamera nel renderer
      webSecurity: true
    },
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    checkTodayNotifications();
    initAnthropicClient();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  db = require('./db.js');
  await db.init(app);
  createWindow();
  registerIpcHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Permetti accesso alla fotocamera dal renderer
app.on('web-contents-created', (_, contents) => {
  contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') callback(true);
    else callback(false);
  });
});

// ─── CLIENT ANTHROPIC ────────────────────────────────────────────────────────

function initAnthropicClient() {
  try {
    const apiKey = db.getSetting('anthropic_api_key');
    if (apiKey) {
      const Anthropic = require('@anthropic-ai/sdk');
      anthropicClient = new Anthropic.default({ apiKey });
    }
  } catch (e) {
    console.error('Errore init Anthropic:', e.message);
  }
}

// ─── CONTROLLI FINESTRA ───────────────────────────────────────────────────────

ipcMain.on('win-minimize', () => mainWindow?.minimize());
ipcMain.on('win-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('win-close', () => mainWindow?.close());

// ─── REGISTRAZIONE HANDLER IPC ────────────────────────────────────────────────

function registerIpcHandlers() {
  function handle(channel, fn) {
    ipcMain.handle(channel, (_event, ...args) => {
      try { return { ok: true, data: fn(...args) }; }
      catch (e) { console.error(channel, e); return { ok: false, error: e.message }; }
    });
  }

  // ── Eventi ──
  handle('db:getEventsByDate',  (date) => db.getEventsByDate(date));
  handle('db:getEventsByWeek',  (s, e) => db.getEventsByWeek(s, e));
  handle('db:getEventsByMonth', (y, m) => db.getEventsByMonth(y, m));
  handle('db:addEvent',         (ev)   => db.addEvent(ev));
  handle('db:updateEvent',      (id, ev) => db.updateEvent(id, ev));
  handle('db:deleteEvent',      (id)   => db.deleteEvent(id));

  // ── Transazioni ──
  handle('db:getTransactionsByMonth', (y, m) => db.getTransactionsByMonth(y, m));
  handle('db:getMonthSummary',        (y, m) => db.getMonthSummary(y, m));
  handle('db:getWeeklyTotals',        (y, m) => db.getWeeklyTotals(y, m));
  handle('db:getCategoryTotals',      (y, m) => db.getCategoryTotals(y, m));
  handle('db:addTransaction',         (tx)   => db.addTransaction(tx));
  handle('db:updateTransaction',      (id, tx) => db.updateTransaction(id, tx));
  handle('db:deleteTransaction',      (id)   => db.deleteTransaction(id));

  // ── Sport ──
  handle('db:getSportByMonth',    (y, m) => db.getSportByMonth(y, m));
  handle('db:getSportStats',      (y, m) => db.getSportStats(y, m));
  handle('db:addSportSession',    (s)    => db.addSportSession(s));
  handle('db:updateSportSession', (id, s) => db.updateSportSession(id, s));
  handle('db:deleteSportSession', (id)   => db.deleteSportSession(id));

  // ── Task ──
  handle('db:getAllTasks',      ()       => db.getAllTasks());
  handle('db:getTasksByStatus', (st)    => db.getTasksByStatus(st));
  handle('db:addTask',          (t)     => db.addTask(t));
  handle('db:updateTask',       (id, t) => db.updateTask(id, t));
  handle('db:deleteTask',       (id)    => db.deleteTask(id));

  // ── Abitudini ──
  handle('db:getActiveHabits',      ()          => db.getActiveHabits());
  handle('db:addHabit',             (h)         => db.addHabit(h));
  handle('db:updateHabit',          (id, h)     => db.updateHabit(id, h));
  handle('db:deleteHabit',          (id)        => db.deleteHabit(id));
  handle('db:getHabitLogsForWeek',  (s, e)      => db.getHabitLogsForWeek(s, e));
  handle('db:toggleHabitLog',       (hid, d, c) => db.toggleHabitLog(hid, d, c));

  // ── Note ──
  handle('db:getAllNotes',   ()       => db.getAllNotes());
  handle('db:getNoteById',   (id)    => db.getNoteById(id));
  handle('db:searchNotes',   (q)     => db.searchNotes(q));
  handle('db:addNote',       (n)     => db.addNote(n));
  handle('db:updateNote',    (id, n) => db.updateNote(id, n));
  handle('db:deleteNote',    (id)    => db.deleteNote(id));

  // ── Settings ──
  handle('settings:get', (key)        => db.getSetting(key));
  handle('settings:set', (key, value) => db.setSetting(key, value));

  // ── Chat ──
  handle('db:getChatMessages', ()     => db.getChatMessages());
  handle('db:addChatMessage',  (r, c) => db.addChatMessage(r, c));
  handle('db:clearChat',       ()     => db.clearChat());

  // ── Studio ──
  handle('db:getStudyFolders',    ()       => db.getStudyFolders());
  handle('db:addStudyFolder',     (f)      => db.addStudyFolder(f));
  handle('db:updateStudyFolder',  (id, f)  => db.updateStudyFolder(id, f));
  handle('db:deleteStudyFolder',  (id)     => db.deleteStudyFolder(id));
  handle('db:getStudyItems',      (fid)    => db.getStudyItems(fid));
  handle('db:getStudyItemById',   (id)     => db.getStudyItemById(id));
  handle('db:addStudyItem',       (item)   => db.addStudyItem(item));
  handle('db:updateStudyItem',    (id, it) => db.updateStudyItem(id, it));
  handle('db:deleteStudyItem',    (id)     => db.deleteStudyItem(id));
  handle('db:searchStudyItems',   (q)      => db.searchStudyItems(q));

  // ── AI Chat (streaming via evento) ──
  ipcMain.handle('ai:chat', async (_event, userMessage) => {
    const apiKey = db.getSetting('anthropic_api_key');
    if (!apiKey) return { ok: false, error: 'API key non configurata. Vai in Impostazioni.' };

    try {
      if (!anthropicClient) initAnthropicClient();
      const Anthropic = require('@anthropic-ai/sdk');
      if (!anthropicClient) {
        anthropicClient = new Anthropic.default({ apiKey });
      }

      // Contesto dati utente
      const ctx = db.getAIContext();
      const systemPrompt = buildSystemPrompt(ctx);

      // Storico recente (ultime 20 coppie)
      const history = db.getChatMessages(40);
      const messages = history.map(m => ({ role: m.role, content: m.content }));
      messages.push({ role: 'user', content: userMessage });

      const response = await anthropicClient.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages
      });

      const reply = response.content[0].text;
      db.addChatMessage('user', userMessage);
      db.addChatMessage('assistant', reply);
      return { ok: true, data: reply };
    } catch (e) {
      console.error('AI chat error:', e);
      return { ok: false, error: e.message };
    }
  });

  // ── AI Azione su contenuto studio ──
  ipcMain.handle('ai:action', async (_event, action, content, itemId) => {
    const apiKey = db.getSetting('anthropic_api_key');
    if (!apiKey) return { ok: false, error: 'API key non configurata. Vai in Impostazioni.' };

    try {
      if (!anthropicClient) initAnthropicClient();
      const Anthropic = require('@anthropic-ai/sdk');
      if (!anthropicClient) anthropicClient = new Anthropic.default({ apiKey });

      const prompts = {
        summarize:  `Riassumi il seguente contenuto in modo chiaro e conciso, mantenendo i punti chiave. Usa il markdown. Rispondi in italiano:\n\n${content}`,
        schema:     `Crea uno schema/mappa concettuale strutturata del seguente contenuto. Usa titoli, elenchi puntati e numerati. Rispondi in italiano con markdown:\n\n${content}`,
        humanize:   `Riscrivi il seguente contenuto in modo più colloquiale e comprensibile, come se lo spiegassi a un amico. Mantieni tutte le informazioni. Rispondi in italiano:\n\n${content}`,
        organize:   `Analizza questo contenuto e suggerisci come organizzarlo meglio (struttura, suddivisione in sezioni, tag consigliati, correlazioni con altri argomenti). Rispondi in italiano con markdown:\n\n${content}`
      };

      const prompt = prompts[action];
      if (!prompt) return { ok: false, error: 'Azione non valida' };

      const response = await anthropicClient.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      });

      const result = response.content[0].text;

      // Salva il risultato nell'item se esiste
      if (itemId) {
        const fieldMap = { summarize: 'ai_summary', schema: 'ai_schema', humanize: 'ai_humanized' };
        if (fieldMap[action]) db.updateStudyItemAI(itemId, fieldMap[action], result);
      }

      return { ok: true, data: result };
    } catch (e) {
      console.error('AI action error:', e);
      return { ok: false, error: e.message };
    }
  });

  // ── Impostazioni API key (ricarica client) ──
  ipcMain.handle('ai:setApiKey', async (_event, key) => {
    try {
      db.setSetting('anthropic_api_key', key);
      anthropicClient = null;
      initAnthropicClient();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('ai:testConnection', async () => {
    const apiKey = db.getSetting('anthropic_api_key');
    if (!apiKey) return { ok: false, error: 'Nessuna API key' };
    try {
      if (!anthropicClient) initAnthropicClient();
      const Anthropic = require('@anthropic-ai/sdk');
      if (!anthropicClient) anthropicClient = new Anthropic.default({ apiKey });
      const res = await anthropicClient.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  // ── File (per studio: salva file caricati) ──
  ipcMain.handle('file:save', async (_event, fileName, dataBase64) => {
    try {
      const filesDir = path.join(__dirname, 'data', 'files');
      if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });
      const safeName = Date.now() + '_' + fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = path.join(filesDir, safeName);
      const buf = Buffer.from(dataBase64, 'base64');
      fs.writeFileSync(filePath, buf);
      return { ok: true, data: safeName };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('file:read', (_event, fileName) => {
    try {
      const filePath = path.join(__dirname, 'data', 'files', fileName);
      const buf = fs.readFileSync(filePath);
      return { ok: true, data: buf.toString('base64') };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('file:delete', (_event, fileName) => {
    try {
      const filePath = path.join(__dirname, 'data', 'files', fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('file:openDialog', async () => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Documenti', extensions: ['pdf','doc','docx','txt','md'] },
        { name: 'Immagini', extensions: ['png','jpg','jpeg','gif','bmp','webp'] },
        { name: 'Tutti i file', extensions: ['*'] }
      ]
    });
    if (!filePaths.length) return { ok: false, error: 'Annullato' };
    const filePath = filePaths[0];
    const fileName = path.basename(filePath);
    const buf = fs.readFileSync(filePath);
    return { ok: true, data: { fileName, base64: buf.toString('base64'), size: buf.length } };
  });

  // ── Export ──
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

// ─── SYSTEM PROMPT PER LA CHAT ────────────────────────────────────────────────

function buildSystemPrompt(ctx) {
  const eventsText = ctx.events_today.length
    ? ctx.events_today.map(e => `- ${e.time_start||'tutto il giorno'}: ${e.title}${e.location?' @ '+e.location:''}`).join('\n')
    : '- Nessun evento';

  const tasksText = ctx.pending_tasks.length
    ? ctx.pending_tasks.slice(0,10).map(t => `- [${t.priority}] ${t.title}${t.due_date?' (scad. '+t.due_date+')':''}`).join('\n')
    : '- Nessun task pendente';

  const habitsText = ctx.habits.map(h => `- ${h.name}: ${h.done_today ? '✓ fatto' : '✗ non fatto'}`).join('\n');

  return `Sei l'assistente personale integrato in WeekOrganizer, un'app di organizzazione personale.
Sei gentile, preciso e rispondi sempre in italiano. Hai accesso ai dati dell'utente in tempo reale.

DATA ODIERNA: ${ctx.today}

EVENTI DI OGGI:
${eventsText}

TASK IN SOSPESO (priorità alta prima):
${tasksText}

ABITUDINI OGGI:
${habitsText}

FINANZE MESE CORRENTE:
- Entrate: €${ctx.month_finance.income.toFixed(2)}
- Uscite: €${ctx.month_finance.expense.toFixed(2)}
- Saldo: €${ctx.month_finance.balance.toFixed(2)}

Puoi aiutare l'utente a:
- Rispondere a domande sui suoi dati (eventi, task, abitudini, finanze)
- Suggerire come organizzare meglio la giornata/settimana
- Ricordare impegni e scadenze
- Analizzare trend e dare consigli
- Rispondere a qualsiasi domanda generale

Sii conciso ma completo. Usa emoji dove appropriato. Formatta le risposte con markdown.`;
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
