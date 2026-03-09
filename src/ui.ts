// ── Token Ferry – UI Script ─────────────────────────────────────────────────
// Runs inside the plugin iframe. Has access to fetch, DOM, etc.

import type { GitHubSettings, CollectionInfo, PullPreview, SandboxToUIMessage, UIToSandboxMessage } from './types';
import {
  generateBranchName,
  generatePRBody,
  getBaseSha,
  createBranch,
  getFileContent,
  commitFile,
  createPullRequest,
} from './github-api';

// ── DOM References ─────────────────────────────────────────────────────────

const inputRepo = document.getElementById('input-repo') as HTMLInputElement;
const inputFilepath = document.getElementById('input-filepath') as HTMLInputElement;
const inputBranch = document.getElementById('input-branch') as HTMLInputElement;
const inputPat = document.getElementById('input-pat') as HTMLInputElement;

const btnSaveSettings = document.getElementById('btn-save-settings') as HTMLButtonElement;
const btnPush = document.getElementById('btn-push') as HTMLButtonElement;
const btnPull = document.getElementById('btn-pull') as HTMLButtonElement;
const btnVisualize = document.getElementById('btn-visualize') as HTMLButtonElement;
const btnSelectToggle = document.getElementById('btn-select-toggle') as HTMLButtonElement;

const collectionList = document.getElementById('collection-list') as HTMLDivElement;
const collectionCount = document.getElementById('collection-count') as HTMLSpanElement;
const statusLog = document.getElementById('status-log') as HTMLDivElement;

const settingsToggle = document.getElementById('settings-toggle') as HTMLDivElement;
const settingsBody = document.getElementById('settings-body') as HTMLDivElement;
const collectionsToggle = document.getElementById('collections-toggle') as HTMLDivElement;
const collectionsBody = document.getElementById('collections-body') as HTMLDivElement;

const pullPreviewOverlay = document.getElementById('pull-preview-overlay') as HTMLDivElement;
const pullPreviewBody = document.getElementById('pull-preview-body') as HTMLDivElement;
const btnModalClose = document.getElementById('btn-modal-close') as HTMLButtonElement;
const btnPreviewCancel = document.getElementById('btn-preview-cancel') as HTMLButtonElement;
const btnPreviewApply = document.getElementById('btn-preview-apply') as HTMLButtonElement;

// ── State ──────────────────────────────────────────────────────────────────

let allSelected = true;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Send a typed message to the plugin sandbox. */
function postToSandbox(msg: UIToSandboxMessage): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

/** Build a GitHubSettings object from the current form fields. */
function getSettingsFromForm(): GitHubSettings {
  const repoValue = inputRepo.value.trim();
  const parts = repoValue.split('/');
  const owner = parts[0] ?? '';
  const repo = parts.slice(1).join('/');

  return {
    owner,
    repo,
    pat: inputPat.value.trim(),
    baseBranch: inputBranch.value.trim() || 'main',
    filePath: inputFilepath.value.trim() || 'tokens/design-tokens.json',
  };
}

/** Return the list of currently-checked collection IDs. */
function getSelectedCollectionIds(): string[] {
  const checkboxes = collectionList.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  const ids: string[] = [];
  checkboxes.forEach((cb) => {
    if (cb.checked) ids.push(cb.dataset.id!);
  });
  return ids;
}

/** Format current time as HH:MM:SS. */
function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ── Status Log ─────────────────────────────────────────────────────────────

const MAX_STATUS_ENTRIES = 200;

function addStatus(message: string, level: 'info' | 'error' | 'success' = 'info', html = false): void {
  const el = document.createElement('div');
  el.className = `status-msg ${level}`;

  const ts = document.createElement('span');
  ts.style.opacity = '0.5';
  ts.textContent = `[${timestamp()}] `;
  el.appendChild(ts);

  if (html) {
    const content = document.createElement('span');
    content.innerHTML = message;
    el.appendChild(content);
  } else {
    el.appendChild(document.createTextNode(message));
  }

  statusLog.appendChild(el);
  while (statusLog.childElementCount > MAX_STATUS_ENTRIES) {
    statusLog.removeChild(statusLog.firstChild!);
  }
  statusLog.scrollTop = statusLog.scrollHeight;
}

// ── Collapsible Sections ───────────────────────────────────────────────────

function setupCollapsible(toggle: HTMLElement, body: HTMLElement): void {
  toggle.addEventListener('click', () => {
    const isCollapsed = toggle.classList.toggle('collapsed');
    body.classList.toggle('hidden', isCollapsed);
  });
}

setupCollapsible(settingsToggle, settingsBody);
setupCollapsible(collectionsToggle, collectionsBody);

// ── Settings ───────────────────────────────────────────────────────────────

function populateSettings(data: GitHubSettings): void {
  inputRepo.value = data.owner && data.repo ? `${data.owner}/${data.repo}` : '';
  inputFilepath.value = data.filePath || 'tokens/design-tokens.json';
  inputBranch.value = data.baseBranch || 'main';
  inputPat.value = data.pat || '';
}

btnSaveSettings.addEventListener('click', () => {
  const settings = getSettingsFromForm();

  if (!settings.owner || !settings.repo) {
    addStatus('Repository must be in "owner/repo" format.', 'error');
    return;
  }
  if (!settings.pat) {
    addStatus('Personal Access Token is required.', 'error');
    return;
  }

  postToSandbox({ type: 'save-settings', data: settings });
  addStatus('Settings saved.', 'success');
});

// ── Collections Rendering ──────────────────────────────────────────────────

function renderCollections(data: CollectionInfo[]): void {
  collectionList.innerHTML = '';

  if (data.length === 0) {
    collectionList.innerHTML = '<div class="empty-state">No variable collections found.</div>';
    collectionCount.textContent = '0 collections';
    return;
  }

  collectionCount.textContent = `${data.length} collection${data.length !== 1 ? 's' : ''}`;

  data.forEach((col) => {
    const item = document.createElement('label');
    item.className = 'collection-item';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.dataset.id = col.id;

    const name = document.createElement('span');
    name.textContent = col.name;

    const meta = document.createElement('span');
    meta.className = 'collection-meta';
    meta.textContent = `${col.variableCount} vars · ${col.modes.length} mode${col.modes.length !== 1 ? 's' : ''}`;

    item.appendChild(cb);
    item.appendChild(name);
    item.appendChild(meta);
    collectionList.appendChild(item);
  });

  allSelected = true;
  btnSelectToggle.textContent = 'Select None';
}

// ── Select All / None Toggle ───────────────────────────────────────────────

btnSelectToggle.addEventListener('click', () => {
  allSelected = !allSelected;
  const checkboxes = collectionList.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  checkboxes.forEach((cb) => (cb.checked = allSelected));
  btnSelectToggle.textContent = allSelected ? 'Select None' : 'Select All';
});

// ── Push Flow ──────────────────────────────────────────────────────────────

btnPush.addEventListener('click', () => {
  const ids = getSelectedCollectionIds();
  if (ids.length === 0) {
    addStatus('No collections selected.', 'error');
    return;
  }
  addStatus('Preparing push data...', 'info');
  postToSandbox({ type: 'prepare-push', collectionIds: ids });
});

async function handlePushData(data: { json: string; collections: string[] }): Promise<void> {
  const config = getSettingsFromForm();

  if (!config.owner || !config.repo || !config.pat) {
    addStatus('Please configure repository settings first.', 'error');
    return;
  }

  btnPush.disabled = true;

  try {
    addStatus('Generating branch name...', 'info');
    const branchName = generateBranchName();
    addStatus(`Branch: ${branchName}`, 'info');

    addStatus('Fetching base SHA...', 'info');
    const baseSha = await getBaseSha(config);

    addStatus('Creating branch...', 'info');
    await createBranch(config, branchName, baseSha);

    addStatus('Checking for existing file...', 'info');
    const existingFile = await getFileContent(config, config.filePath, branchName);

    const commitMsg = `Update design tokens via Token Ferry\n\nCollections: ${data.collections.join(', ')}`;
    addStatus('Committing file...', 'info');
    await commitFile(
      config,
      branchName,
      config.filePath,
      data.json,
      commitMsg,
      existingFile?.sha,
    );

    addStatus('Creating pull request...', 'info');
    const prTitle = `Update design tokens – ${data.collections.join(', ')}`;
    const prBody = generatePRBody(data.collections);
    const pr = await createPullRequest(config, branchName, prTitle, prBody);

    const safeUrl = pr.url.startsWith('https://github.com/') ? pr.url : '#';
    addStatus(`PR created: <a href="${safeUrl}" target="_blank">#${pr.number}</a>`, 'success', true);
    postToSandbox({ type: 'push-complete', prUrl: pr.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    addStatus(`Push failed: ${message}`, 'error');
  } finally {
    btnPush.disabled = false;
  }
}

// ── Pull Flow ──────────────────────────────────────────────────────────────

btnPull.addEventListener('click', async () => {
  const config = getSettingsFromForm();

  if (!config.owner || !config.repo || !config.pat) {
    addStatus('Please configure repository settings first.', 'error');
    return;
  }

  btnPull.disabled = true;

  try {
    addStatus('Fetching tokens from GitHub...', 'info');
    const file = await getFileContent(config, config.filePath);

    if (!file) {
      addStatus(`File not found: ${config.filePath}`, 'error');
      return;
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(escape(atob(file.content.replace(/\n/g, ''))));
    } catch {
      addStatus('Failed to decode file content — file may be corrupted.', 'error');
      return;
    }
    addStatus('File retrieved. Generating preview...', 'info');
    postToSandbox({ type: 'pull-data', json: decoded });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    addStatus(`Pull failed: ${message}`, 'error');
  } finally {
    btnPull.disabled = false;
  }
});

// ── Pull Preview Modal ─────────────────────────────────────────────────────

function showPullPreview(preview: PullPreview): void {
  pullPreviewBody.innerHTML = '';

  // Summary badges
  const summary = document.createElement('div');
  summary.className = 'preview-summary';
  summary.innerHTML = `
    <span class="badge badge-create">+${preview.summary.create} create</span>
    <span class="badge badge-update">~${preview.summary.update} update</span>
    <span class="badge badge-unchanged">${preview.summary.unchanged} unchanged</span>
  `;
  pullPreviewBody.appendChild(summary);

  // Items list
  const list = document.createElement('div');
  list.className = 'preview-list';

  for (const item of preview.items) {
    const row = document.createElement('div');
    row.className = 'preview-item';

    const badge = document.createElement('span');
    badge.className = `badge badge-${item.action}`;
    badge.textContent = item.action;

    const path = document.createElement('span');
    path.textContent = item.path;
    path.style.flex = '1';

    const type = document.createElement('span');
    type.style.color = '#a1a1aa';
    type.style.fontSize = '10px';
    type.textContent = item.type;

    row.appendChild(badge);
    row.appendChild(path);
    row.appendChild(type);
    list.appendChild(row);
  }

  pullPreviewBody.appendChild(list);
  pullPreviewOverlay.classList.remove('hidden');
}

function closePreviewModal(): void {
  pullPreviewOverlay.classList.add('hidden');
}

btnModalClose.addEventListener('click', closePreviewModal);
btnPreviewCancel.addEventListener('click', closePreviewModal);

btnPreviewApply.addEventListener('click', () => {
  closePreviewModal();
  addStatus('Applying changes...', 'info');
  postToSandbox({ type: 'apply-pull' });
});

// ── Visualize ──────────────────────────────────────────────────────────────

btnVisualize.addEventListener('click', () => {
  const ids = getSelectedCollectionIds();
  if (ids.length === 0) {
    addStatus('No collections selected.', 'error');
    return;
  }
  addStatus('Generating visualization...', 'info');
  postToSandbox({ type: 'visualize', collectionIds: ids });
});

// ── Message Handler (Sandbox → UI) ────────────────────────────────────────

window.onmessage = (event: MessageEvent) => {
  const msg = event.data?.pluginMessage as SandboxToUIMessage | undefined;
  if (!msg) return;

  switch (msg.type) {
    case 'settings':
      populateSettings(msg.data);
      addStatus('Settings loaded.', 'info');
      // After settings are loaded, request collections
      postToSandbox({ type: 'get-collections' });
      break;

    case 'collections':
      renderCollections(msg.data);
      addStatus(`Loaded ${msg.data.length} collection(s).`, 'info');
      break;

    case 'push-data':
      handlePushData(msg.data);
      break;

    case 'pull-preview':
      showPullPreview(msg.data);
      break;

    case 'status':
      addStatus(msg.message, msg.level);
      break;

    case 'visualize-complete':
      addStatus('Visualization created on canvas.', 'success');
      break;
  }
};

// ── Init ───────────────────────────────────────────────────────────────────

postToSandbox({ type: 'load-settings' });
