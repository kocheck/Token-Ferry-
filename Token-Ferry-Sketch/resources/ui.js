// ── Token Ferry – WebView UI Script ──────────────────────────────────────────
// Runs inside the Sketch WebView panel. Has access to fetch, DOM, etc.
// Communicates with the plugin via window.postMessage / nativeLog.
//
// Key difference from Figma: Instead of parent.postMessage({ pluginMessage }),
// Sketch WebView uses window.webkit.messageHandlers.nativeLog.postMessage()
// to send to plugin, and window.onPluginMessage() to receive from plugin.

// ── DOM References ──────────────────────────────────────────────────────────

var inputRepo = document.getElementById('input-repo');
var inputFilepath = document.getElementById('input-filepath');
var inputBranch = document.getElementById('input-branch');
var inputPat = document.getElementById('input-pat');

var btnSaveSettings = document.getElementById('btn-save-settings');
var btnPush = document.getElementById('btn-push');
var btnPull = document.getElementById('btn-pull');
var btnVisualize = document.getElementById('btn-visualize');
var btnSelectToggle = document.getElementById('btn-select-toggle');

var collectionList = document.getElementById('collection-list');
var collectionCount = document.getElementById('collection-count');
var statusLog = document.getElementById('status-log');

var settingsToggle = document.getElementById('settings-toggle');
var settingsBody = document.getElementById('settings-body');
var collectionsToggle = document.getElementById('collections-toggle');
var collectionsBody = document.getElementById('collections-body');

var pullPreviewOverlay = document.getElementById('pull-preview-overlay');
var pullPreviewBody = document.getElementById('pull-preview-body');
var btnModalClose = document.getElementById('btn-modal-close');
var btnPreviewCancel = document.getElementById('btn-preview-cancel');
var btnPreviewApply = document.getElementById('btn-preview-apply');

// ── State ───────────────────────────────────────────────────────────────────

var swatchGroups = [];
var allSelected = true;

// ── Plugin Communication ────────────────────────────────────────────────────

/**
 * Send a message to the Sketch plugin sandbox.
 * Uses Sketch's WebView native message handler.
 */
function postToPlugin(msg) {
  var msgString = JSON.stringify(msg);
  // Sketch WebView uses this bridge to communicate with the plugin
  if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeLog) {
    window.webkit.messageHandlers.nativeLog.postMessage(msgString);
  } else {
    console.warn('Token Ferry: WebKit message bridge unavailable.');
  }
}

/**
 * Called by the plugin via evaluateJavaScript to send messages to the WebView.
 */
window.onPluginMessage = function(msg) {
  switch (msg.type) {
    case 'settings':
      populateSettings(msg.data);
      addStatus('Settings loaded.', 'info');
      postToPlugin({ type: 'get-swatch-groups' });
      break;

    case 'swatch-groups':
      renderSwatchGroups(msg.data);
      addStatus('Loaded ' + msg.data.length + ' swatch group(s).', 'info');
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

// ── Helpers ─────────────────────────────────────────────────────────────────

function getSettingsFromForm() {
  var repoValue = inputRepo.value.trim();
  var parts = repoValue.split('/');
  var owner = parts[0] || '';
  var repo = parts.slice(1).join('/');

  return {
    owner: owner,
    repo: repo,
    pat: inputPat.value.trim(),
    baseBranch: inputBranch.value.trim() || 'main',
    filePath: inputFilepath.value.trim() || 'tokens/design-tokens.json',
  };
}

function getSelectedGroupNames() {
  var checkboxes = collectionList.querySelectorAll('input[type="checkbox"]');
  var names = [];
  checkboxes.forEach(function(cb) {
    if (cb.checked) names.push(cb.dataset.name);
  });
  return names;
}

function timestamp() {
  var d = new Date();
  var pad = function(n) { return String(n).padStart(2, '0'); };
  return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

// ── Status Log ──────────────────────────────────────────────────────────────

var MAX_STATUS_ENTRIES = 200;

function addStatus(message, level, useHtml) {
  level = level || 'info';
  var el = document.createElement('div');
  el.className = 'status-msg ' + level;

  var ts = document.createElement('span');
  ts.style.opacity = '0.5';
  ts.textContent = '[' + timestamp() + '] ';
  el.appendChild(ts);

  if (useHtml) {
    var content = document.createElement('span');
    content.innerHTML = message;
    el.appendChild(content);
  } else {
    el.appendChild(document.createTextNode(message));
  }

  statusLog.appendChild(el);
  while (statusLog.childElementCount > MAX_STATUS_ENTRIES) {
    statusLog.removeChild(statusLog.firstChild);
  }
  statusLog.scrollTop = statusLog.scrollHeight;
}

// ── Collapsible Sections ────────────────────────────────────────────────────

function setupCollapsible(toggle, body) {
  toggle.addEventListener('click', function() {
    var isCollapsed = toggle.classList.toggle('collapsed');
    body.classList.toggle('hidden', isCollapsed);
  });
}

setupCollapsible(settingsToggle, settingsBody);
setupCollapsible(collectionsToggle, collectionsBody);

// ── Settings ────────────────────────────────────────────────────────────────

function populateSettings(data) {
  inputRepo.value = data.owner && data.repo ? data.owner + '/' + data.repo : '';
  inputFilepath.value = data.filePath || 'tokens/design-tokens.json';
  inputBranch.value = data.baseBranch || 'main';
  inputPat.value = data.pat || '';
}

btnSaveSettings.addEventListener('click', function() {
  var settings = getSettingsFromForm();

  if (!settings.owner || !settings.repo) {
    addStatus('Repository must be in "owner/repo" format.', 'error');
    return;
  }
  if (!settings.pat) {
    addStatus('Personal Access Token is required.', 'error');
    return;
  }

  postToPlugin({ type: 'save-settings', data: settings });
  addStatus('Settings saved.', 'success');
});

// ── Swatch Groups Rendering ─────────────────────────────────────────────────

function renderSwatchGroups(data) {
  swatchGroups = data;
  collectionList.innerHTML = '';

  if (data.length === 0) {
    collectionList.innerHTML = '<div class="empty-state">No swatch groups found.</div>';
    collectionCount.textContent = '0 groups';
    return;
  }

  collectionCount.textContent = data.length + ' group' + (data.length !== 1 ? 's' : '');

  data.forEach(function(group) {
    var item = document.createElement('label');
    item.className = 'collection-item';

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.dataset.name = group.name;

    var name = document.createElement('span');
    name.textContent = group.name;

    var meta = document.createElement('span');
    meta.className = 'collection-meta';
    meta.textContent = group.swatchCount + ' swatch' + (group.swatchCount !== 1 ? 'es' : '');

    item.appendChild(cb);
    item.appendChild(name);
    item.appendChild(meta);
    collectionList.appendChild(item);
  });

  allSelected = true;
  btnSelectToggle.textContent = 'Select None';
}

// ── Select All / None Toggle ────────────────────────────────────────────────

btnSelectToggle.addEventListener('click', function() {
  allSelected = !allSelected;
  var checkboxes = collectionList.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(function(cb) { cb.checked = allSelected; });
  btnSelectToggle.textContent = allSelected ? 'Select None' : 'Select All';
});

// ── Push Flow ───────────────────────────────────────────────────────────────

btnPush.addEventListener('click', function() {
  var names = getSelectedGroupNames();
  if (names.length === 0) {
    addStatus('No swatch groups selected.', 'error');
    return;
  }
  addStatus('Preparing push data...', 'info');
  postToPlugin({ type: 'prepare-push', groupNames: names });
});

// ── GitHub API Functions (run in WebView context) ────────────────────────────

var API_BASE = 'https://api.github.com';

function githubFetch(config, endpoint, method, body) {
  method = method || 'GET';
  var url = API_BASE + '/repos/' + config.owner + '/' + config.repo + endpoint;

  return fetch(url, {
    method: method,
    headers: {
      'Authorization': 'token ' + config.pat,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(function(response) {
    if (response.status === 401) throw new Error('Invalid PAT: GitHub returned 401.');
    if (response.status === 404) throw new Error('Repository not found.');
    if (response.status === 422) throw new Error('Branch already exists or validation error.');
    return response;
  });
}

function generateBranchName() {
  var now = new Date();
  var pad = function(n) { return String(n).padStart(2, '0'); };
  return 'tokens/update-' + now.getFullYear() + pad(now.getMonth()+1) + pad(now.getDate()) + '-' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
}

function handlePushData(data) {
  var config = getSettingsFromForm();
  if (!config.owner || !config.repo || !config.pat) {
    addStatus('Please configure repository settings first.', 'error');
    return;
  }

  btnPush.disabled = true;
  var branchName = generateBranchName();

  addStatus('Branch: ' + branchName, 'info');
  addStatus('Fetching base SHA...', 'info');

  githubFetch(config, '/git/ref/heads/' + config.baseBranch)
    .then(function(r) { return r.json(); })
    .then(function(refData) {
      var baseSha = refData.object.sha;
      addStatus('Creating branch...', 'info');
      return githubFetch(config, '/git/refs', 'POST', {
        ref: 'refs/heads/' + branchName,
        sha: baseSha,
      });
    })
    .then(function() {
      addStatus('Checking for existing file...', 'info');
      return githubFetch(config, '/contents/' + config.filePath + '?ref=' + encodeURIComponent(branchName))
        .then(function(r) { return r.ok ? r.json() : null; })
        .catch(function(err) { console.warn('Existing file check failed:', err); return null; });
    })
    .then(function(existing) {
      var commitMsg = 'Update design tokens via Token Ferry\n\nGroups: ' + data.groups.join(', ');
      addStatus('Committing file...', 'info');
      var body = {
        message: commitMsg,
        content: btoa(unescape(encodeURIComponent(data.json))),
        branch: branchName,
      };
      if (existing && existing.sha) body.sha = existing.sha;
      return githubFetch(config, '/contents/' + config.filePath, 'PUT', body);
    })
    .then(function() {
      addStatus('Creating pull request...', 'info');
      var prTitle = 'Update design tokens \u2013 ' + data.groups.join(', ');
      var prBody = '## Token Ferry Sync\n\nThis PR was automatically created by the **Token Ferry** Sketch plugin.\n\n### Swatch groups synced\n' + data.groups.map(function(n) { return '- **' + n + '**'; }).join('\n') + '\n\n---\n_Review the token JSON and merge when ready._';
      return githubFetch(config, '/pulls', 'POST', {
        title: prTitle,
        body: prBody,
        head: branchName,
        base: config.baseBranch,
      });
    })
    .then(function(r) { return r.json(); })
    .then(function(pr) {
      var safeUrl = (pr.html_url && pr.html_url.indexOf('https://github.com/') === 0) ? pr.html_url : '#';
      addStatus('PR created: <a href="' + safeUrl + '" target="_blank">#' + pr.number + '</a>', 'success', true);
      postToPlugin({ type: 'push-complete', prUrl: pr.html_url });
    })
    .catch(function(err) {
      addStatus('Push failed: ' + (err.message || String(err)), 'error');
    })
    .finally(function() {
      btnPush.disabled = false;
    });
}

// ── Pull Flow ───────────────────────────────────────────────────────────────

btnPull.addEventListener('click', function() {
  var config = getSettingsFromForm();
  if (!config.owner || !config.repo || !config.pat) {
    addStatus('Please configure repository settings first.', 'error');
    return;
  }

  btnPull.disabled = true;
  addStatus('Fetching tokens from GitHub...', 'info');

  githubFetch(config, '/contents/' + config.filePath)
    .then(function(r) {
      if (!r.ok) throw new Error('File not found: ' + config.filePath);
      return r.json();
    })
    .then(function(fileData) {
      var decoded;
      try {
        decoded = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))));
      } catch (e) {
        throw new Error('Failed to decode file content: ' + (e.message || String(e)));
      }
      addStatus('File retrieved. Generating preview...', 'info');
      postToPlugin({ type: 'pull-data', json: decoded });
    })
    .catch(function(err) {
      addStatus('Pull failed: ' + (err.message || String(err)), 'error');
    })
    .finally(function() {
      btnPull.disabled = false;
    });
});

// ── Pull Preview Modal ──────────────────────────────────────────────────────

function showPullPreview(preview) {
  pullPreviewBody.innerHTML = '';

  var summary = document.createElement('div');
  summary.className = 'preview-summary';
  summary.innerHTML =
    '<span class="badge badge-create">+' + preview.summary.create + ' create</span>' +
    '<span class="badge badge-update">~' + preview.summary.update + ' update</span>' +
    '<span class="badge badge-unchanged">' + preview.summary.unchanged + ' unchanged</span>';
  pullPreviewBody.appendChild(summary);

  var list = document.createElement('div');
  list.className = 'preview-list';

  preview.items.forEach(function(item) {
    var row = document.createElement('div');
    row.className = 'preview-item';

    var badge = document.createElement('span');
    badge.className = 'badge badge-' + item.action;
    badge.textContent = item.action;

    var path = document.createElement('span');
    path.textContent = item.path;
    path.style.flex = '1';

    var type = document.createElement('span');
    type.style.color = '#a1a1aa';
    type.style.fontSize = '10px';
    type.textContent = item.type;

    row.appendChild(badge);
    row.appendChild(path);
    row.appendChild(type);
    list.appendChild(row);
  });

  pullPreviewBody.appendChild(list);
  pullPreviewOverlay.classList.remove('hidden');
}

function closePreviewModal() {
  pullPreviewOverlay.classList.add('hidden');
}

btnModalClose.addEventListener('click', closePreviewModal);
btnPreviewCancel.addEventListener('click', closePreviewModal);

btnPreviewApply.addEventListener('click', function() {
  closePreviewModal();
  addStatus('Applying changes...', 'info');
  postToPlugin({ type: 'apply-pull' });
});

// ── Visualize ───────────────────────────────────────────────────────────────

btnVisualize.addEventListener('click', function() {
  var names = getSelectedGroupNames();
  if (names.length === 0) {
    addStatus('No swatch groups selected.', 'error');
    return;
  }
  addStatus('Generating visualization...', 'info');
  postToPlugin({ type: 'visualize', groupNames: names });
});

// ── Init ────────────────────────────────────────────────────────────────────

postToPlugin({ type: 'load-settings' });
