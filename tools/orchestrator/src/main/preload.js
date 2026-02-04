/**
 * Preload Script - Secure Bridge between Main and Renderer (v2.0)
 *
 * Exposes a comprehensive API for:
 * - Session/task management
 * - Agent execution with real-time streaming
 * - Auto-run control
 * - Settings and email
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer
contextBridge.exposeInMainWorld('orchestrator', {
  // Session management
  session: {
    create: (name) => ipcRenderer.invoke('session:create', name),
    list: () => ipcRenderer.invoke('session:list'),
    load: (sessionId) => ipcRenderer.invoke('session:load', sessionId),
    delete: (sessionId) => ipcRenderer.invoke('session:delete', sessionId),
  },

  // Task management
  task: {
    create: (sessionId, task) => ipcRenderer.invoke('task:create', sessionId, task),
    update: (taskId, updates) => ipcRenderer.invoke('task:update', taskId, updates),
    move: (taskId, newStatus, newPosition) => ipcRenderer.invoke('task:move', taskId, newStatus, newPosition),
    delete: (taskId) => ipcRenderer.invoke('task:delete', taskId),
    list: (sessionId) => ipcRenderer.invoke('task:list', sessionId),

    // Real-time task updates
    onCreated: (callback) => {
      const handler = (_, task) => callback(task);
      ipcRenderer.on('task:created', handler);
      return () => ipcRenderer.removeListener('task:created', handler);
    },
    onUpdated: (callback) => {
      const handler = (_, task) => callback(task);
      ipcRenderer.on('task:updated', handler);
      return () => ipcRenderer.removeListener('task:updated', handler);
    },
    onDeleted: (callback) => {
      const handler = (_, data) => callback(data);
      ipcRenderer.on('task:deleted', handler);
      return () => ipcRenderer.removeListener('task:deleted', handler);
    },
  },

  // Agent execution
  agent: {
    runPlanner: (sessionId, featureDescription) => ipcRenderer.invoke('agent:runPlanner', sessionId, featureDescription),
    runExecutor: (task, useWorktree) => ipcRenderer.invoke('agent:runExecutor', task, useWorktree),
    kill: (runId) => ipcRenderer.invoke('agent:kill', runId),
    getActive: () => ipcRenderer.invoke('agent:getActive'),

    // Real-time output subscription
    onOutput: (callback) => {
      const handler = (_, data) => callback(data);
      ipcRenderer.on('agent:output', handler);
      return () => ipcRenderer.removeListener('agent:output', handler);
    },

    onComplete: (callback) => {
      const handler = (_, data) => callback(data);
      ipcRenderer.on('agent:complete', handler);
      return () => ipcRenderer.removeListener('agent:complete', handler);
    },

    // Activity indicator (blinking light)
    onActivity: (callback) => {
      const handler = (_, data) => callback(data);
      ipcRenderer.on('agent:activity', handler);
      return () => ipcRenderer.removeListener('agent:activity', handler);
    },
  },

  // Auto-run control
  autorun: {
    start: (sessionId) => ipcRenderer.invoke('autorun:start', sessionId),
    stop: () => ipcRenderer.invoke('autorun:stop'),
    status: () => ipcRenderer.invoke('autorun:status'),
  },

  // Planner utilities
  planner: {
    parseAndCreateTasks: (sessionId, output) => ipcRenderer.invoke('planner:parseAndCreateTasks', sessionId, output),
  },

  // Worktree management
  worktree: {
    merge: (branchName) => ipcRenderer.invoke('worktree:merge', branchName),
    remove: (branchName) => ipcRenderer.invoke('worktree:remove', branchName),
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  },

  // Email notifications
  email: {
    send: (sessionId) => ipcRenderer.invoke('email:send', sessionId),
    startInterval: (sessionId) => ipcRenderer.invoke('email:startInterval', sessionId),
    stopInterval: () => ipcRenderer.invoke('email:stopInterval'),
  },

  // Logs
  logs: {
    get: (sessionId, limit) => ipcRenderer.invoke('logs:get', sessionId, limit),
    onNew: (callback) => {
      const handler = (_, data) => callback(data);
      ipcRenderer.on('log:new', handler);
      return () => ipcRenderer.removeListener('log:new', handler);
    },
  },

  // Project utilities
  project: {
    getRoot: () => ipcRenderer.invoke('project:getRoot'),
    getContext: () => ipcRenderer.invoke('project:getContext'),
    openInVscode: () => ipcRenderer.invoke('project:openInVscode'),
    openTerminal: () => ipcRenderer.invoke('project:openTerminal'),
  },
});

console.log('[Preload] Orchestrator API v2.0 exposed to renderer');
