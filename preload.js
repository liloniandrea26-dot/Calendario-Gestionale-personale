// preload.js — bridge sicuro tra main process e renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Controlli finestra
  minimize: () => ipcRenderer.send('win-minimize'),
  maximize: () => ipcRenderer.send('win-maximize'),
  close:    () => ipcRenderer.send('win-close'),

  // ── Eventi ──
  getEventsByDate:  (date)    => ipcRenderer.invoke('db:getEventsByDate', date),
  getEventsByWeek:  (s, e)    => ipcRenderer.invoke('db:getEventsByWeek', s, e),
  getEventsByMonth: (y, m)    => ipcRenderer.invoke('db:getEventsByMonth', y, m),
  addEvent:         (ev)      => ipcRenderer.invoke('db:addEvent', ev),
  updateEvent:      (id, ev)  => ipcRenderer.invoke('db:updateEvent', id, ev),
  deleteEvent:      (id)      => ipcRenderer.invoke('db:deleteEvent', id),

  // ── Transazioni ──
  getTransactionsByMonth: (y, m)    => ipcRenderer.invoke('db:getTransactionsByMonth', y, m),
  getMonthSummary:        (y, m)    => ipcRenderer.invoke('db:getMonthSummary', y, m),
  getWeeklyTotals:        (y, m)    => ipcRenderer.invoke('db:getWeeklyTotals', y, m),
  getCategoryTotals:      (y, m)    => ipcRenderer.invoke('db:getCategoryTotals', y, m),
  addTransaction:         (tx)      => ipcRenderer.invoke('db:addTransaction', tx),
  updateTransaction:      (id, tx)  => ipcRenderer.invoke('db:updateTransaction', id, tx),
  deleteTransaction:      (id)      => ipcRenderer.invoke('db:deleteTransaction', id),

  // ── Sport ──
  getSportByMonth:    (y, m)   => ipcRenderer.invoke('db:getSportByMonth', y, m),
  getSportStats:      (y, m)   => ipcRenderer.invoke('db:getSportStats', y, m),
  addSportSession:    (s)      => ipcRenderer.invoke('db:addSportSession', s),
  updateSportSession: (id, s)  => ipcRenderer.invoke('db:updateSportSession', id, s),
  deleteSportSession: (id)     => ipcRenderer.invoke('db:deleteSportSession', id),

  // ── Task ──
  getAllTasks:       ()       => ipcRenderer.invoke('db:getAllTasks'),
  getTasksByStatus: (st)     => ipcRenderer.invoke('db:getTasksByStatus', st),
  addTask:          (t)      => ipcRenderer.invoke('db:addTask', t),
  updateTask:       (id, t)  => ipcRenderer.invoke('db:updateTask', id, t),
  deleteTask:       (id)     => ipcRenderer.invoke('db:deleteTask', id),

  // ── Abitudini ──
  getActiveHabits:     ()           => ipcRenderer.invoke('db:getActiveHabits'),
  addHabit:            (h)          => ipcRenderer.invoke('db:addHabit', h),
  updateHabit:         (id, h)      => ipcRenderer.invoke('db:updateHabit', id, h),
  deleteHabit:         (id)         => ipcRenderer.invoke('db:deleteHabit', id),
  getHabitLogsForWeek: (s, e)       => ipcRenderer.invoke('db:getHabitLogsForWeek', s, e),
  toggleHabitLog:      (hid, d, c)  => ipcRenderer.invoke('db:toggleHabitLog', hid, d, c),

  // ── Note ──
  getAllNotes:  ()       => ipcRenderer.invoke('db:getAllNotes'),
  getNoteById:  (id)    => ipcRenderer.invoke('db:getNoteById', id),
  searchNotes:  (q)     => ipcRenderer.invoke('db:searchNotes', q),
  addNote:      (n)     => ipcRenderer.invoke('db:addNote', n),
  updateNote:   (id, n) => ipcRenderer.invoke('db:updateNote', id, n),
  deleteNote:   (id)    => ipcRenderer.invoke('db:deleteNote', id),

  // ── Settings ──
  getSetting: (key)        => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  // ── Chat ──
  getChatMessages: ()      => ipcRenderer.invoke('db:getChatMessages'),
  addChatMessage:  (r, c)  => ipcRenderer.invoke('db:addChatMessage', r, c),
  clearChat:       ()      => ipcRenderer.invoke('db:clearChat'),

  // ── AI ──
  aiChat:          (msg)          => ipcRenderer.invoke('ai:chat', msg),
  aiAction:        (act, txt, id) => ipcRenderer.invoke('ai:action', act, txt, id),
  aiSetApiKey:     (key)          => ipcRenderer.invoke('ai:setApiKey', key),
  aiTestConnection: ()            => ipcRenderer.invoke('ai:testConnection'),

  // ── Studio ──
  getStudyFolders:   ()        => ipcRenderer.invoke('db:getStudyFolders'),
  addStudyFolder:    (f)       => ipcRenderer.invoke('db:addStudyFolder', f),
  updateStudyFolder: (id, f)   => ipcRenderer.invoke('db:updateStudyFolder', id, f),
  deleteStudyFolder: (id)      => ipcRenderer.invoke('db:deleteStudyFolder', id),
  getStudyItems:     (fid)     => ipcRenderer.invoke('db:getStudyItems', fid),
  getStudyItemById:  (id)      => ipcRenderer.invoke('db:getStudyItemById', id),
  addStudyItem:      (item)    => ipcRenderer.invoke('db:addStudyItem', item),
  updateStudyItem:   (id, it)  => ipcRenderer.invoke('db:updateStudyItem', id, it),
  deleteStudyItem:   (id)      => ipcRenderer.invoke('db:deleteStudyItem', id),
  searchStudyItems:  (q)       => ipcRenderer.invoke('db:searchStudyItems', q),

  // ── File ──
  fileSave:       (name, b64) => ipcRenderer.invoke('file:save', name, b64),
  fileRead:       (name)      => ipcRenderer.invoke('file:read', name),
  fileDelete:     (name)      => ipcRenderer.invoke('file:delete', name),
  fileOpenDialog: ()          => ipcRenderer.invoke('file:openDialog'),

  // ── Export ──
  exportAll: () => ipcRenderer.invoke('db:exportAll')
});
