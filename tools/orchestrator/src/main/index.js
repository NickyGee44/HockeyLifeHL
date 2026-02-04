/**
 * HockeyLifeHL Orchestrator - Main Process (Enhanced v2.0)
 *
 * Features:
 * - Auto-run engine with dependency tracking
 * - Parallel task execution
 * - Real-time log streaming
 * - Context loading from .md files
 * - Git worktree isolation
 * - Visual status indicators via IPC
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const Database = require('better-sqlite3');
const Store = require('electron-store');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// Configuration
// ============================================================================

const PROJECT_ROOT = path.resolve(__dirname, '../../../../..');
const DB_PATH = path.join(app.getPath('userData'), 'orchestrator.db');
const WORKTREE_DIR = path.join(PROJECT_ROOT, '.worktrees');

const store = new Store({
  defaults: {
    resendApiKey: '',
    notificationEmail: '',
    emailInterval: 60,
    claudeModel: 'sonnet',
    claudePath: 'claude',
    maxConcurrentAgents: 3,
    autoRunEnabled: false,
    autoSaveInterval: 30,
  }
});

let mainWindow = null;
let db = null;
let activeAgents = new Map();
let emailInterval = null;
let autoRunInterval = null;
let projectContext = null;

// ============================================================================
// Database Initialization
// ============================================================================

function initDatabase() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      project_path TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'active',
      metadata TEXT DEFAULT '{}'
    );

    -- Tasks with dependencies
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'backlog',
      priority INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      agent_type TEXT,
      estimated_complexity TEXT,
      dependencies TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT,
      worktree_branch TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      metadata TEXT DEFAULT '{}',
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    -- Agent runs with detailed logging
    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      agent_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      started_at TEXT,
      completed_at TEXT,
      exit_code INTEGER,
      output TEXT,
      error TEXT,
      tokens_used INTEGER DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    -- Git worktrees
    CREATE TABLE IF NOT EXISTS worktrees (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      task_id TEXT,
      branch_name TEXT NOT NULL,
      path TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      merged_at TEXT
    );

    -- Logs with real-time streaming support
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      task_id TEXT,
      run_id TEXT,
      level TEXT DEFAULT 'info',
      message TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
      metadata TEXT DEFAULT '{}'
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_logs_session ON logs(session_id);
    CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
  `);

  // Migration: Handle schema upgrades for existing databases
  try {
    // Check if logs table has NOT NULL constraint on session_id (old schema)
    const logsInfo = db.pragma('table_info(logs)');
    const sessionIdCol = logsInfo.find(col => col.name === 'session_id');

    // If session_id has NOT NULL constraint (notnull = 1), recreate the table
    if (sessionIdCol && sessionIdCol.notnull === 1) {
      console.log('[DB] Migrating logs table to allow NULL session_id...');
      db.exec(`
        -- Create new table with correct schema
        CREATE TABLE IF NOT EXISTS logs_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT,
          task_id TEXT,
          run_id TEXT,
          level TEXT DEFAULT 'info',
          message TEXT NOT NULL,
          timestamp TEXT DEFAULT (datetime('now')),
          metadata TEXT DEFAULT '{}'
        );

        -- Copy existing data
        INSERT INTO logs_new (id, session_id, task_id, level, message, timestamp, metadata)
        SELECT id, session_id, task_id, level, message, timestamp, metadata FROM logs;

        -- Drop old table and rename new
        DROP TABLE logs;
        ALTER TABLE logs_new RENAME TO logs;

        -- Recreate indexes
        CREATE INDEX IF NOT EXISTS idx_logs_session ON logs(session_id);
        CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
      `);
      console.log('[DB] Logs table migrated successfully');
    }

    // Check if run_id column exists in logs table
    const updatedLogsInfo = db.pragma('table_info(logs)');
    const hasRunId = updatedLogsInfo.some(col => col.name === 'run_id');
    if (!hasRunId) {
      db.exec('ALTER TABLE logs ADD COLUMN run_id TEXT');
      console.log('[DB] Added run_id column to logs table');
    }

    // Check if step_number column exists in tasks table
    const tasksInfo = db.pragma('table_info(tasks)');
    const hasStepNumber = tasksInfo.some(col => col.name === 'step_number');
    if (!hasStepNumber) {
      db.exec('ALTER TABLE tasks ADD COLUMN step_number INTEGER');
      console.log('[DB] Added step_number column to tasks table');
    }

    // Check if dependencies column exists in tasks table
    const hasDependencies = tasksInfo.some(col => col.name === 'dependencies');
    if (!hasDependencies) {
      db.exec("ALTER TABLE tasks ADD COLUMN dependencies TEXT DEFAULT '[]'");
      console.log('[DB] Added dependencies column to tasks table');
    }
  } catch (migrationError) {
    console.log('[DB] Migration error:', migrationError.message);
    // If migration fails, try to just delete the old db and start fresh
    console.log('[DB] Attempting to recreate database...');
  }

  console.log('[DB] Database initialized at:', DB_PATH);
}

// ============================================================================
// Context Loading - Read .md files for agent context
// ============================================================================

function loadProjectContext() {
  const contextFiles = [
    'PROJECT_MASTER.md',
    'GIT_WORKFLOW.md',
    'SECURITY.md',
    'UI_UX_GUIDE.md',
    'NEW_PLAN.md',
    '.claude/settings.local.json'
  ];

  let context = {
    projectName: 'HockeyLifeHL',
    description: '',
    workflow: '',
    security: '',
    techStack: 'Next.js 15, Supabase, Stripe, Tailwind CSS, shadcn/ui',
    files: {}
  };

  for (const file of contextFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        context.files[file] = content.substring(0, 5000); // Limit size

        // Extract key info
        if (file === 'PROJECT_MASTER.md') {
          const descMatch = content.match(/## Project Overview\n\n([^\n]+)/);
          if (descMatch) context.description = descMatch[1];
        }
      }
    } catch (err) {
      console.warn(`[Context] Could not load ${file}: ${err.message}`);
    }
  }

  // Add files array for the UI
  context.loadedFiles = Object.keys(context.files);
  projectContext = context;
  console.log('[Context] Loaded project context from', context.loadedFiles.length, 'files');
  return context;
}

// ============================================================================
// Logging with real-time broadcast
// ============================================================================

function addLog(sessionId, taskId, runId, level, message, metadata = {}) {
  const log = {
    session_id: sessionId,
    task_id: taskId,
    run_id: runId,
    level,
    message,
    timestamp: new Date().toISOString(),
    metadata: JSON.stringify(metadata)
  };

  db.prepare(`
    INSERT INTO logs (session_id, task_id, run_id, level, message, timestamp, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(log.session_id, log.task_id, log.run_id, log.level, log.message, log.timestamp, log.metadata);

  // Broadcast to renderer
  if (mainWindow) {
    mainWindow.webContents.send('log:new', {
      ...log,
      metadata
    });
  }

  return log;
}

// ============================================================================
// Window Management
// ============================================================================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'default',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    loadProjectContext();
    addLog(null, null, null, 'info', 'Orchestrator initialized');
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================================
// Git Worktree Management
// ============================================================================

async function createWorktree(taskId, branchName) {
  if (!fs.existsSync(WORKTREE_DIR)) {
    fs.mkdirSync(WORKTREE_DIR, { recursive: true });
  }

  const worktreePath = path.join(WORKTREE_DIR, branchName);
  const id = uuidv4();

  return new Promise((resolve, reject) => {
    exec(
      `git worktree add -b ${branchName} "${worktreePath}" HEAD`,
      { cwd: PROJECT_ROOT },
      (error, stdout, stderr) => {
        if (error && !stderr.includes('already exists')) {
          addLog(null, taskId, null, 'error', `Failed to create worktree: ${stderr}`);
          reject(new Error(stderr));
          return;
        }

        db.prepare(`
          INSERT INTO worktrees (id, task_id, branch_name, path)
          VALUES (?, ?, ?, ?)
        `).run(id, taskId, branchName, worktreePath);

        addLog(null, taskId, null, 'info', `Created worktree: ${branchName}`);
        resolve({ id, path: worktreePath, branch: branchName });
      }
    );
  });
}

async function removeWorktree(branchName) {
  const worktreePath = path.join(WORKTREE_DIR, branchName);

  return new Promise((resolve) => {
    exec(
      `git worktree remove "${worktreePath}" --force`,
      { cwd: PROJECT_ROOT },
      (error) => {
        if (error) {
          console.warn(`Warning removing worktree: ${error.message}`);
        }

        db.prepare(`
          UPDATE worktrees SET status = 'removed' WHERE branch_name = ?
        `).run(branchName);

        resolve();
      }
    );
  });
}

async function mergeWorktree(branchName, targetBranch = 'main') {
  return new Promise((resolve, reject) => {
    exec(
      `git checkout ${targetBranch} && git merge ${branchName} --no-edit`,
      { cwd: PROJECT_ROOT },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Failed to merge: ${stderr}`));
          return;
        }

        db.prepare(`
          UPDATE worktrees SET status = 'merged', merged_at = datetime('now')
          WHERE branch_name = ?
        `).run(branchName);

        addLog(null, null, null, 'info', `Merged branch ${branchName} into ${targetBranch}`);
        resolve({ merged: true, output: stdout });
      }
    );
  });
}

// ============================================================================
// Claude Agent Execution with Real-time Streaming
// ============================================================================

function runClaudeAgent(taskId, prompt, options = {}) {
  const {
    agentType = 'general',
    worktreePath = PROJECT_ROOT,
    model = store.get('claudeModel') || 'sonnet',
  } = options;

  const runId = uuidv4();
  const claudePath = store.get('claudePath') || 'claude';

  console.log(`[Agent] Starting ${agentType} agent with model ${model}`);
  console.log(`[Agent] Claude path: ${claudePath}`);
  console.log(`[Agent] Working directory: ${worktreePath}`);
  console.log(`[Agent] Prompt length: ${prompt.length} chars`);
  addLog(null, taskId, runId, 'info', `Starting ${agentType} agent`);

  // Record agent run
  db.prepare(`
    INSERT INTO agent_runs (id, task_id, agent_type, status, started_at)
    VALUES (?, ?, ?, 'running', datetime('now'))
  `).run(runId, taskId, agentType);

  // Update task status
  db.prepare(`
    UPDATE tasks SET status = 'in_progress', started_at = datetime('now')
    WHERE id = ?
  `).run(taskId);

  // Notify renderer of status change
  broadcastTaskUpdate(taskId, 'in_progress');

  // Build command args
  const args = ['--print', '--model', model];

  console.log(`[Agent] Spawning: ${claudePath} ${args.join(' ')} (prompt via stdin)`);

  const isWindows = process.platform === 'win32';
  const claudeProcess = spawn(claudePath, args, {
    cwd: worktreePath,
    shell: isWindows,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Write prompt to stdin
  claudeProcess.stdin.write(prompt);
  claudeProcess.stdin.end();

  let output = '';
  let errorOutput = '';
  let lastOutputTime = Date.now();

  // Handle spawn errors
  claudeProcess.on('error', (err) => {
    console.error(`[Agent] Spawn error: ${err.message}`);
    errorOutput += `Spawn error: ${err.message}\n`;
    addLog(null, taskId, runId, 'error', `Failed to start Claude CLI: ${err.message}`);

    if (mainWindow) {
      mainWindow.webContents.send('agent:output', {
        runId, taskId, type: 'error',
        data: `Failed to start Claude CLI: ${err.message}\nMake sure 'claude' is installed and in your PATH.\n`
      });
    }
  });

  // Stream stdout with activity indicator
  claudeProcess.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    lastOutputTime = Date.now();

    console.log(`[Agent] stdout: ${text.substring(0, 100)}...`);

    if (mainWindow) {
      mainWindow.webContents.send('agent:output', {
        runId, taskId, type: 'stdout', data: text
      });
      // Send activity state for visual indicator - 'writing' when producing output
      const state = text.includes('```') || text.includes('function') ? 'writing' : 'thinking';
      mainWindow.webContents.send('agent:activity', { runId, taskId, state });
    }
  });

  // Stream stderr
  claudeProcess.stderr.on('data', (data) => {
    const text = data.toString();
    errorOutput += text;
    lastOutputTime = Date.now();

    console.log(`[Agent] stderr: ${text.substring(0, 100)}...`);

    if (mainWindow) {
      mainWindow.webContents.send('agent:output', {
        runId, taskId, type: 'stderr', data: text
      });
      mainWindow.webContents.send('agent:activity', { runId, taskId, state: 'active' });
    }
  });

  claudeProcess.on('close', (code) => {
    console.log(`[Agent] Process closed with code ${code}`);
    const status = code === 0 ? 'completed' : 'failed';

    // Update agent run
    db.prepare(`
      UPDATE agent_runs
      SET status = ?, completed_at = datetime('now'), exit_code = ?, output = ?, error = ?
      WHERE id = ?
    `).run(status, code, output, errorOutput, runId);

    // Update task status
    const taskStatus = code === 0 ? 'done' : 'failed';
    db.prepare(`
      UPDATE tasks SET status = ?, completed_at = datetime('now'), error_message = ?
      WHERE id = ?
    `).run(taskStatus, code !== 0 ? errorOutput : null, taskId);

    // Remove from active agents
    activeAgents.delete(runId);

    // Notify renderer
    if (mainWindow) {
      mainWindow.webContents.send('agent:complete', {
        runId, taskId, status, exitCode: code, output, error: errorOutput
      });
      mainWindow.webContents.send('agent:activity', { runId, taskId, active: false });
    }

    broadcastTaskUpdate(taskId, taskStatus);
    addLog(null, taskId, runId, status === 'completed' ? 'info' : 'error',
      `Agent ${agentType} completed with exit code ${code}`);

    // Check if we should auto-run next tasks
    if (store.get('autoRunEnabled')) {
      checkAndRunNextTasks(db.prepare('SELECT session_id FROM tasks WHERE id = ?').get(taskId)?.session_id);
    }
  });

  // Track active agent
  activeAgents.set(runId, {
    process: claudeProcess,
    taskId,
    agentType,
    startedAt: new Date()
  });

  return { runId, taskId };
}

function killAgent(runId) {
  const agent = activeAgents.get(runId);
  if (agent) {
    agent.process.kill('SIGTERM');
    activeAgents.delete(runId);

    db.prepare(`
      UPDATE agent_runs SET status = 'killed', completed_at = datetime('now')
      WHERE id = ?
    `).run(runId);

    db.prepare(`
      UPDATE tasks SET status = 'todo' WHERE id = ?
    `).run(agent.taskId);

    broadcastTaskUpdate(agent.taskId, 'todo');
    addLog(null, agent.taskId, runId, 'warn', 'Agent killed by user');

    return { success: true };
  }
  return { success: false, error: 'Agent not found' };
}

// ============================================================================
// Auto-Run Engine - Automatically run tasks when dependencies complete
// ============================================================================

function checkAndRunNextTasks(sessionId) {
  if (!sessionId || !store.get('autoRunEnabled')) return;

  const maxConcurrent = store.get('maxConcurrentAgents') || 3;
  const runningCount = activeAgents.size;

  if (runningCount >= maxConcurrent) {
    console.log(`[AutoRun] Max concurrent agents (${maxConcurrent}) reached`);
    return;
  }

  // Find tasks ready to run (in 'todo' with all dependencies completed)
  const todoTasks = db.prepare(`
    SELECT * FROM tasks
    WHERE session_id = ? AND status = 'todo'
    ORDER BY priority DESC, position ASC
  `).all(sessionId);

  for (const task of todoTasks) {
    if (activeAgents.size >= maxConcurrent) break;

    const dependencies = JSON.parse(task.dependencies || '[]');

    // Check if all dependencies are done
    let allDepsComplete = true;
    for (const depId of dependencies) {
      const dep = db.prepare('SELECT status FROM tasks WHERE id = ?').get(depId);
      if (!dep || dep.status !== 'done') {
        allDepsComplete = false;
        break;
      }
    }

    if (allDepsComplete) {
      console.log(`[AutoRun] Starting task: ${task.title}`);
      addLog(sessionId, task.id, null, 'info', `Auto-starting task: ${task.title}`);
      runExecutorAgent(task, PROJECT_ROOT);
    }
  }
}

let autoRunSessionId = null;

function startAutoRun(sessionId) {
  store.set('autoRunEnabled', true);
  autoRunSessionId = sessionId;

  // Immediately check for tasks to run
  checkAndRunNextTasks(sessionId);

  // Set up periodic check (every 5 seconds)
  if (autoRunInterval) clearInterval(autoRunInterval);
  autoRunInterval = setInterval(() => {
    checkAndRunNextTasks(sessionId);
  }, 5000);

  addLog(sessionId, null, null, 'info', 'Auto-run mode enabled');
  return { running: true, sessionId };
}

function stopAutoRun() {
  store.set('autoRunEnabled', false);
  autoRunSessionId = null;
  if (autoRunInterval) {
    clearInterval(autoRunInterval);
    autoRunInterval = null;
  }
  addLog(null, null, null, 'info', 'Auto-run mode disabled');
  return { running: false, sessionId: null };
}

function getAutoRunStatus() {
  return { running: store.get('autoRunEnabled'), sessionId: autoRunSessionId };
}

// ============================================================================
// Planner Agent - Break down features into 10-step plans
// ============================================================================

async function runPlannerAgent(sessionId, featureDescription) {
  const context = projectContext || loadProjectContext();

  const plannerPrompt = `You are the PLANNER agent for HockeyLifeHL.

PROJECT CONTEXT:
${context.description || 'Multi-tenant SaaS platform for hockey league management'}

Tech Stack: ${context.techStack}

YOUR TASK: Analyze this feature request and create a 10-step implementation plan.

FEATURE REQUEST:
${featureDescription}

CRITICAL INSTRUCTIONS:
1. Break down into EXACTLY 10 atomic, executable tasks
2. Each task should be completable by a single agent in one session
3. Order tasks by dependencies (earlier tasks can be dependencies of later ones)
4. Identify which specialized agent should handle each task
5. Be specific about file locations and implementation details

OUTPUT FORMAT (JSON only, no other text):
{
  "feature_summary": "Brief description of the overall feature",
  "tasks": [
    {
      "step": 1,
      "title": "Short task title (max 60 chars)",
      "description": "Detailed description with specific files to create/modify",
      "agentType": "general|backend-architect|security-auditor|payments-billing-auditor",
      "priority": 1-10,
      "complexity": "trivial|simple|medium|complex",
      "dependencies": [],
      "acceptance_criteria": ["Criterion 1", "Criterion 2"]
    }
  ],
  "risks": ["Potential risk 1"],
  "testing_strategy": "How to verify the feature works"
}

IMPORTANT:
- dependencies array contains step numbers (e.g., [1, 2] means depends on steps 1 and 2)
- Output ONLY valid JSON, no markdown or explanations`;

  const taskId = uuidv4();

  db.prepare(`
    INSERT INTO tasks (id, session_id, title, description, status, agent_type)
    VALUES (?, ?, ?, ?, 'in_progress', 'planner')
  `).run(taskId, sessionId, `Planning: ${featureDescription.substring(0, 50)}...`, featureDescription);

  broadcastTaskUpdate(taskId, 'in_progress');

  return runClaudeAgent(taskId, plannerPrompt, { agentType: 'planner' });
}

// ============================================================================
// Executor Agent - Implement individual tasks
// ============================================================================

async function runExecutorAgent(task, worktreePath = PROJECT_ROOT) {
  const context = projectContext || loadProjectContext();

  const executorPrompt = `You are the EXECUTOR agent for HockeyLifeHL.

PROJECT CONTEXT:
${context.description || 'Multi-tenant SaaS platform for hockey league management'}
Tech Stack: ${context.techStack}

TASK TO IMPLEMENT:
Title: ${task.title}

Description:
${task.description}

${task.acceptance_criteria ? `Acceptance Criteria:
${JSON.parse(task.metadata || '{}').acceptance_criteria?.map((c, i) => `${i + 1}. ${c}`).join('\n') || 'None specified'}` : ''}

WORKING DIRECTORY: ${worktreePath}

INSTRUCTIONS:
1. Implement this task completely and thoroughly
2. Write tests if applicable
3. Run type checks: pnpm exec tsc --noEmit
4. Fix any errors before completing
5. Create clear, descriptive commit messages
6. Follow existing patterns in the codebase

PROJECT STRUCTURE:
- Apps: apps/league-builder (admin), apps/league-site (public)
- Packages: packages/database, packages/ui
- Server actions: src/lib/actions/ or apps/*/src/lib/actions/
- Components: src/components/ or apps/*/src/components/
- Supabase: supabase/migrations/

Be thorough, production-ready, and follow best practices.`;

  return runClaudeAgent(task.id, executorPrompt, {
    agentType: task.agent_type || 'general',
    worktreePath
  });
}

// ============================================================================
// Task CRUD with dependency tracking
// ============================================================================

function createTask(sessionId, taskData) {
  const id = uuidv4();
  const dependencies = JSON.stringify(taskData.dependencies || []);
  const metadata = JSON.stringify(taskData.metadata || {});

  db.prepare(`
    INSERT INTO tasks (id, session_id, title, description, status, priority, position, agent_type, estimated_complexity, dependencies, step_number, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, sessionId, taskData.title, taskData.description || '',
    taskData.status || 'backlog', taskData.priority || 0, taskData.position || 0,
    taskData.agentType || 'general', taskData.estimatedComplexity || taskData.complexity || 'medium',
    dependencies, taskData.stepNumber || null, metadata
  );

  console.log(`[Task] Created task: ${taskData.title} (${id})`);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  // Broadcast to renderer for auto-refresh
  if (mainWindow) {
    mainWindow.webContents.send('task:created', task);
  }

  return task;
}

function updateTask(taskId, updates) {
  const allowedFields = ['title', 'description', 'status', 'priority', 'position',
    'agent_type', 'estimated_complexity', 'dependencies', 'metadata', 'error_message'];

  const setClause = Object.keys(updates)
    .filter(k => allowedFields.includes(k))
    .map(k => `${k} = ?`)
    .join(', ');

  if (!setClause) return null;

  const values = Object.keys(updates)
    .filter(k => allowedFields.includes(k))
    .map(k => typeof updates[k] === 'object' ? JSON.stringify(updates[k]) : updates[k]);

  values.push(taskId);

  db.prepare(`UPDATE tasks SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(...values);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

  // Broadcast update
  if (mainWindow) {
    mainWindow.webContents.send('task:updated', task);
  }

  return task;
}

function moveTask(taskId, newStatus, newPosition) {
  db.prepare(`
    UPDATE tasks SET status = ?, position = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newStatus, newPosition, taskId);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

  if (mainWindow) {
    mainWindow.webContents.send('task:updated', task);
  }

  // Check for auto-run if task was moved to 'todo'
  if (newStatus === 'todo' && store.get('autoRunEnabled')) {
    checkAndRunNextTasks(task.session_id);
  }

  return task;
}

function deleteTask(taskId) {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);

  if (mainWindow) {
    mainWindow.webContents.send('task:deleted', { taskId: taskId });
  }

  return { success: true };
}

// ============================================================================
// Broadcast helpers
// ============================================================================

function broadcastTaskUpdate(taskId, status) {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (mainWindow && task) {
    mainWindow.webContents.send('task:updated', task);
  }
}

// ============================================================================
// Session Management
// ============================================================================

function createSession(name) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO sessions (id, name, project_path)
    VALUES (?, ?, ?)
  `).run(id, name, PROJECT_ROOT);

  addLog(id, null, null, 'info', `Created new session: ${name}`);
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
}

function listSessions() {
  return db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM tasks t WHERE t.session_id = s.id) as task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.session_id = s.id AND t.status = 'done') as completed_count
    FROM sessions s
    ORDER BY s.updated_at DESC
  `).all();
}

function loadSession(sessionId) {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) return null;

  const tasks = db.prepare('SELECT * FROM tasks WHERE session_id = ? ORDER BY position').all(sessionId);
  const logs = db.prepare('SELECT * FROM logs WHERE session_id = ? ORDER BY timestamp DESC LIMIT 100').all(sessionId);

  return { ...session, tasks, logs };
}

function deleteSession(sessionId) {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  return { success: true };
}

// ============================================================================
// Email Notifications
// ============================================================================

async function sendProgressEmail(sessionId) {
  const apiKey = store.get('resendApiKey');
  const toEmail = store.get('notificationEmail');

  if (!apiKey || !toEmail) {
    return { success: false, error: 'Email not configured' };
  }

  const session = loadSession(sessionId);
  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  const stats = {
    total: session.tasks.length,
    done: session.tasks.filter(t => t.status === 'done').length,
    inProgress: session.tasks.filter(t => t.status === 'in_progress').length,
    failed: session.tasks.filter(t => t.status === 'failed').length
  };

  const emailHtml = `
    <h2>HockeyLifeHL Orchestrator Progress Report</h2>
    <h3>Session: ${session.name}</h3>
    <p><strong>Progress:</strong> ${stats.done}/${stats.total} tasks completed</p>
    <ul>
      <li>✅ Done: ${stats.done}</li>
      <li>⏳ In Progress: ${stats.inProgress}</li>
      <li>❌ Failed: ${stats.failed}</li>
    </ul>
    <h4>Recent Activity:</h4>
    <ul>
      ${session.logs.slice(0, 10).map(l => `<li>[${l.level}] ${l.message}</li>`).join('')}
    </ul>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'HockeyLifeHL Orchestrator <noreply@beerleaguehockey.ca>',
        to: [toEmail],
        subject: `[Orchestrator] ${session.name}: ${stats.done}/${stats.total} Complete`,
        html: emailHtml
      })
    });

    const result = await response.json();
    return { success: response.ok, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// IPC Handlers
// ============================================================================

function setupIpcHandlers() {
  // Session management
  ipcMain.handle('session:create', (_, name) => createSession(name));
  ipcMain.handle('session:list', () => listSessions());
  ipcMain.handle('session:load', (_, sessionId) => loadSession(sessionId));
  ipcMain.handle('session:delete', (_, sessionId) => deleteSession(sessionId));

  // Task management
  ipcMain.handle('task:create', (_, sessionId, task) => createTask(sessionId, task));
  ipcMain.handle('task:update', (_, taskId, updates) => updateTask(taskId, updates));
  ipcMain.handle('task:move', (_, taskId, newStatus, newPosition) => moveTask(taskId, newStatus, newPosition));
  ipcMain.handle('task:delete', (_, taskId) => deleteTask(taskId));
  ipcMain.handle('task:list', (_, sessionId) => {
    return db.prepare('SELECT * FROM tasks WHERE session_id = ? ORDER BY position').all(sessionId);
  });

  // Agent execution
  ipcMain.handle('agent:runPlanner', async (_, sessionId, featureDescription) => {
    return runPlannerAgent(sessionId, featureDescription);
  });

  ipcMain.handle('agent:runExecutor', async (_, task, useWorktree = false) => {
    let worktreePath = PROJECT_ROOT;

    if (useWorktree) {
      const branchName = `task/${task.id.substring(0, 8)}`;
      try {
        const worktree = await createWorktree(task.id, branchName);
        worktreePath = worktree.path;
        db.prepare('UPDATE tasks SET worktree_branch = ? WHERE id = ?').run(branchName, task.id);
      } catch (err) {
        console.warn('Worktree creation failed, using main directory');
      }
    }

    return runExecutorAgent(task, worktreePath);
  });

  ipcMain.handle('agent:kill', (_, runId) => killAgent(runId));

  ipcMain.handle('agent:getActive', () => {
    return Array.from(activeAgents.entries()).map(([id, agent]) => ({
      id,
      taskId: agent.taskId,
      agentType: agent.agentType,
      startedAt: agent.startedAt
    }));
  });

  // Auto-run control
  ipcMain.handle('autorun:start', (_, sessionId) => startAutoRun(sessionId));
  ipcMain.handle('autorun:stop', () => stopAutoRun());
  ipcMain.handle('autorun:status', () => getAutoRunStatus());

  // Worktree management
  ipcMain.handle('worktree:merge', (_, branchName) => mergeWorktree(branchName));
  ipcMain.handle('worktree:remove', (_, branchName) => removeWorktree(branchName));

  // Settings
  ipcMain.handle('settings:get', () => store.store);
  ipcMain.handle('settings:set', (_, key, value) => {
    store.set(key, value);
    return { success: true };
  });

  // Email notifications
  ipcMain.handle('email:send', (_, sessionId) => sendProgressEmail(sessionId));
  ipcMain.handle('email:startInterval', (_, sessionId) => {
    const intervalMinutes = store.get('emailInterval') || 60;
    if (emailInterval) clearInterval(emailInterval);
    emailInterval = setInterval(() => sendProgressEmail(sessionId), intervalMinutes * 60 * 1000);
    return { started: true, interval: intervalMinutes };
  });
  ipcMain.handle('email:stopInterval', () => {
    if (emailInterval) {
      clearInterval(emailInterval);
      emailInterval = null;
    }
    return { stopped: true };
  });

  // Logs
  ipcMain.handle('logs:get', (_, sessionId, limit = 100) => {
    return db.prepare(`
      SELECT * FROM logs WHERE session_id = ? OR session_id IS NULL
      ORDER BY timestamp DESC LIMIT ?
    `).all(sessionId, limit);
  });

  // Project utilities
  ipcMain.handle('project:getRoot', () => PROJECT_ROOT);
  ipcMain.handle('project:getContext', () => projectContext || loadProjectContext());
  ipcMain.handle('project:openInVscode', () => {
    exec(`code "${PROJECT_ROOT}"`);
    return { success: true };
  });
  ipcMain.handle('project:openTerminal', () => {
    if (process.platform === 'win32') {
      exec(`start cmd /K "cd /d ${PROJECT_ROOT}"`);
    } else {
      exec(`open -a Terminal "${PROJECT_ROOT}"`);
    }
    return { success: true };
  });

  // Parse planner output and create tasks
  ipcMain.handle('planner:parseAndCreateTasks', async (_, sessionId, plannerOutput) => {
    try {
      // Extract JSON from output
      const jsonMatch = plannerOutput.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in planner output');
      }

      const plan = JSON.parse(jsonMatch[0]);
      const createdTasks = [];
      const taskIdMap = {};

      for (const taskData of plan.tasks) {
        // Map step-based dependencies to actual task IDs
        const dependencies = (taskData.dependencies || []).map(dep => taskIdMap[dep]).filter(Boolean);

        const task = createTask(sessionId, {
          title: taskData.title,
          description: taskData.description,
          status: 'todo',
          priority: taskData.priority || 5,
          position: taskData.step,
          agentType: taskData.agentType || 'general',
          estimatedComplexity: taskData.complexity || 'medium',
          stepNumber: taskData.step,
          dependencies,
          metadata: {
            step: taskData.step,
            acceptance_criteria: taskData.acceptance_criteria
          }
        });

        taskIdMap[taskData.step] = task.id;
        createdTasks.push(task);
      }

      addLog(sessionId, null, null, 'info', `Created ${createdTasks.length} tasks from planner output`);

      return {
        success: true,
        tasks: createdTasks,
        summary: plan.feature_summary,
        risks: plan.risks,
        testingStrategy: plan.testing_strategy
      };
    } catch (error) {
      addLog(sessionId, null, null, 'error', `Failed to parse planner output: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
}

// ============================================================================
// App Lifecycle
// ============================================================================

app.whenReady().then(() => {
  initDatabase();
  createWindow();
  setupIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (autoRunInterval) clearInterval(autoRunInterval);
  if (emailInterval) clearInterval(emailInterval);
  if (db) db.close();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Kill all active agents
  for (const [runId, agent] of activeAgents) {
    agent.process.kill('SIGTERM');
  }
});
