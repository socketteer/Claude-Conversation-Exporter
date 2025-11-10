// Theme management
function initTheme() {
  // Check for saved theme preference or default to system preference
  const savedTheme = localStorage.getItem('theme');
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');

  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme, sunIcon, moonIcon);
  } else {
    // Use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    updateThemeIcon(prefersDark ? 'dark' : 'light', sunIcon, moonIcon);
  }
}

function updateThemeIcon(theme, sunIcon, moonIcon) {
  if (theme === 'dark') {
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  } else {
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');

  // If no theme is set, check system preference
  let newTheme;
  if (!currentTheme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    newTheme = prefersDark ? 'light' : 'dark';
  } else {
    newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  }

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme, sunIcon, moonIcon);
}

// State management
let allConversations = [];
let filteredConversations = [];
let orgId = null;
let currentSort = 'updated_desc';
let sortStack = []; // Track multi-level sorting: [{field: 'name', direction: 'asc'}, ...]
let selectedConversations = new Set(); // Track selected conversation IDs
let lastCheckedIndex = null; // Track last checked checkbox for shift+click range selection

// Model name mappings
const MODEL_DISPLAY_NAMES = {
  'claude-3-sonnet-20240229': 'Claude Sonnet 3',
  'claude-3-opus-20240229': 'Claude Opus 3',
  'claude-3-haiku-20240307': 'Claude Haiku 3',
  'claude-3-5-sonnet-20240620': 'Claude Sonnet 3.5',
  'claude-3-5-haiku-20241022': 'Claude Haiku 3.5',
  'claude-3-5-sonnet-20241022': 'Claude Sonnet 3.6',
  'claude-3-7-sonnet-20250219': 'Claude Sonnet 3.7',
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  'claude-opus-4-20250514': 'Claude Opus 4',
  'claude-opus-4-1-20250805': 'Claude Opus 4.1',
  'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5'
};

// Default model timeline for null models
// Each entry represents when that model became the default
const DEFAULT_MODEL_TIMELINE = [
  { date: new Date('2024-01-01'), model: 'claude-3-sonnet-20240229' }, // Before June 20, 2024
  { date: new Date('2024-06-20'), model: 'claude-3-5-sonnet-20240620' }, // Starting June 20, 2024
  { date: new Date('2024-10-22'), model: 'claude-3-5-sonnet-20241022' }, // Starting October 22, 2024
  { date: new Date('2025-02-24'), model: 'claude-3-7-sonnet-20250219' }, // Starting February 24, 2025
  { date: new Date('2025-05-22'), model: 'claude-sonnet-4-20250514' }, // Starting May 22, 2025
  { date: new Date('2025-09-29'), model: 'claude-sonnet-4-5-20250929' } // Starting September 29, 2025
];

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadOrgId();
  await loadConversations();
  setupEventListeners();
});

// Infer model for conversations with null model based on date
function inferModel(conversation) {
  if (conversation.model) {
    return conversation.model;
  }
  
  // Use created_at date to determine which default model was active
  const conversationDate = new Date(conversation.created_at);
  
  // Find the appropriate model based on the conversation date
  // Start from the end and work backwards to find the right period
  for (let i = DEFAULT_MODEL_TIMELINE.length - 1; i >= 0; i--) {
    if (conversationDate >= DEFAULT_MODEL_TIMELINE[i].date) {
      return DEFAULT_MODEL_TIMELINE[i].model;
    }
  }
  
  // If date is before all known dates, use the first model
  return DEFAULT_MODEL_TIMELINE[0].model;
}

// Load organization ID from storage
async function loadOrgId() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['organizationId'], (result) => {
      orgId = result.organizationId;
      if (!orgId) {
        showError('Organization ID not configured. Please configure it in the extension options.');
      }
      resolve();
    });
  });
}

// Load projects from API
async function loadProjects() {
  if (!orgId) return [];

  try {
    const response = await fetch(`https://claude.ai/api/organizations/${orgId}/projects`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.warn(`Failed to load projects: ${response.status}`);
      return [];
    }

    const projects = await response.json();
    console.log(`Loaded ${projects.length} projects:`, projects);
    return projects;
  } catch (error) {
    console.warn('Error loading projects:', error);
    return [];
  }
}

// Load all conversations
async function loadConversations() {
  if (!orgId) return;

  try {
    // Load projects first
    const projects = await loadProjects();
    populateProjectFilter(projects);

    const response = await fetch(`https://claude.ai/api/organizations/${orgId}/chat_conversations`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load conversations: ${response.status}`);
    }

    allConversations = await response.json();
    console.log(`Loaded ${allConversations.length} conversations`);

    // Log first conversation to see structure
    if (allConversations.length > 0) {
      console.log('Sample conversation structure:', allConversations[0]);
    }

    // Infer models for conversations with null model
    allConversations = allConversations.map(conv => ({
      ...conv,
      model: inferModel(conv)
    }));

    // Apply initial sort and display
    applyFiltersAndSort();
    
  } catch (error) {
    console.error('Error loading conversations:', error);
    showError(`Failed to load conversations: ${error.message}`);
  }
}

// Populate project filter dropdown
function populateProjectFilter(projects) {
  const projectFilter = document.getElementById('projectFilter');
  if (!projectFilter) return;

  projectFilter.innerHTML = '<option value="">All Projects</option>';

  if (!projects || projects.length === 0) {
    console.log('No projects available');
    return;
  }

  // Add each project to dropdown
  projects.forEach(project => {
    const option = document.createElement('option');
    // Use uuid as value (most likely field name)
    option.value = project.uuid || project.id;
    option.textContent = project.name || project.title || 'Untitled Project';
    projectFilter.appendChild(option);
  });

  console.log(`Populated ${projects.length} projects in dropdown`);
}

// Format model name for display
function formatModelName(model) {
  return MODEL_DISPLAY_NAMES[model] || model;
}

// Get model badge class
function getModelBadgeClass(model) {
  if (model.includes('sonnet')) return 'sonnet';
  if (model.includes('opus')) return 'opus';
  if (model.includes('haiku')) return 'haiku';
  return '';
}

// Apply filters and sorting
function applyFiltersAndSort() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const projectFilter = document.getElementById('projectFilter')?.value;

  // Filter conversations
  filteredConversations = allConversations.filter(conv => {
    const matchesSearch = !searchTerm ||
      conv.name.toLowerCase().includes(searchTerm) ||
      (conv.summary && conv.summary.toLowerCase().includes(searchTerm));

    // Project filtering - check various possible field names
    const matchesProject = !projectFilter ||
      conv.project_uuid === projectFilter ||
      conv.project_id === projectFilter ||
      conv.projectUuid === projectFilter;

    return matchesSearch && matchesProject;
  });

  // Sort conversations
  sortConversations();

  // Reset last checked index when list changes
  lastCheckedIndex = null;

  // Update display
  displayConversations();
  updateStats();
}

// Sort conversations based on current sort setting
function sortConversations() {
  // If sortStack is empty, use currentSort from dropdown
  if (sortStack.length === 0) {
    const [field, direction] = currentSort.split('_');
    sortStack = [{field, direction}];
  }

  filteredConversations.sort((a, b) => {
    // Try each sort criterion in order until we find a difference
    for (const {field, direction} of sortStack) {
      let aVal, bVal;

      switch (field) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'created':
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
          break;
        case 'updated':
          aVal = new Date(a.updated_at);
          bVal = new Date(b.updated_at);
          break;
        case 'model':
          aVal = formatModelName(a.model || '').toLowerCase();
          bVal = formatModelName(b.model || '').toLowerCase();
          break;
        default:
          continue;
      }

      let comparison = 0;
      if (aVal > bVal) comparison = 1;
      else if (aVal < bVal) comparison = -1;

      if (comparison !== 0) {
        return direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
}

// Handle column header click for sorting
function handleColumnSort(field) {
  const existingIndex = sortStack.findIndex(s => s.field === field);

  if (existingIndex === 0) {
    // Clicking primary sort: toggle direction
    sortStack[0].direction = sortStack[0].direction === 'asc' ? 'desc' : 'asc';
  } else if (existingIndex > 0) {
    // Clicking a secondary sort: move it to primary position
    const [sortCriterion] = sortStack.splice(existingIndex, 1);
    sortStack.unshift(sortCriterion);
  } else {
    // New sort: add to front with ascending direction
    sortStack.unshift({field, direction: 'asc'});
  }

  applyFiltersAndSort();
}

// Get sort indicator for a column
function getSortIndicator(field) {
  const sortIndex = sortStack.findIndex(s => s.field === field);

  // Only show indicator for the primary (most recent) sort
  if (sortIndex !== 0) return '';

  const {direction} = sortStack[sortIndex];
  const primaryArrow = direction === 'asc' ? '↑' : '↓';
  const secondaryArrow = direction === 'asc' ? '↓' : '↑';

  return ` <span class="sort-indicator">${primaryArrow}<sub>${secondaryArrow}</sub></span>`;
}

// Display conversations in table
function displayConversations() {
  const tableContent = document.getElementById('tableContent');

  if (filteredConversations.length === 0) {
    tableContent.innerHTML = '<div class="no-results">No conversations found</div>';
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th class="sortable" data-sort="name">Name${getSortIndicator('name')}</th>
          <th class="sortable" data-sort="updated">Last Updated${getSortIndicator('updated')}</th>
          <th class="sortable" data-sort="created">Created${getSortIndicator('created')}</th>
          <th class="sortable" data-sort="model">Model${getSortIndicator('model')}</th>
          <th>Actions</th>
          <th class="checkbox-col">
            <input type="checkbox" id="selectAll" class="select-all-checkbox" ${selectedConversations.size > 0 ? 'checked' : ''}>
          </th>
        </tr>
      </thead>
      <tbody>
  `;
  
  filteredConversations.forEach((conv, index) => {
    const updatedDate = new Date(conv.updated_at).toLocaleDateString();
    const createdDate = new Date(conv.created_at).toLocaleDateString();
    const modelBadgeClass = getModelBadgeClass(conv.model);

    html += `
      <tr data-id="${conv.uuid}">
        <td>
          <div class="conversation-name">
            <a href="https://claude.ai/chat/${conv.uuid}" target="_blank" title="${conv.name}">
              ${conv.name}
            </a>
          </div>
        </td>
        <td class="date">${updatedDate}</td>
        <td class="date">${createdDate}</td>
        <td>
          <span class="model-badge ${modelBadgeClass}">
            ${formatModelName(conv.model)}
          </span>
        </td>
        <td>
          <div class="actions">
            <button class="btn-small btn-export" data-id="${conv.uuid}" data-name="${conv.name}">
              Export
            </button>
            <button class="btn-small btn-view" data-id="${conv.uuid}">
              View
            </button>
          </div>
        </td>
        <td class="checkbox-col">
          <input type="checkbox" class="conversation-checkbox" data-id="${conv.uuid}" data-index="${index}" ${selectedConversations.has(conv.uuid) ? 'checked' : ''}>
        </td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  tableContent.innerHTML = html;
  
  // Add export button listeners
  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', (e) => {
      exportConversation(e.target.dataset.id, e.target.dataset.name);
    });
  });
  
  // Add view button listeners
  document.querySelectorAll('.btn-view').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const conversationId = e.target.dataset.id;
      window.open(`https://claude.ai/chat/${conversationId}`, '_blank');
    });
  });

  // Add checkbox listeners (use 'click' instead of 'change' to capture shift key)
  document.querySelectorAll('.conversation-checkbox').forEach(checkbox => {
    checkbox.addEventListener('click', handleCheckboxChange);
  });

  // Add select all checkbox listener
  const selectAllCheckbox = document.getElementById('selectAll');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('click', handleSelectAll);
  }

  // Add sortable header click listeners
  document.querySelectorAll('.sortable').forEach(header => {
    header.addEventListener('click', () => {
      handleColumnSort(header.dataset.sort);
    });
  });

  // Update export button text
  updateExportButtonText();

  // Enable export all button
  document.getElementById('exportAllBtn').disabled = false;
}

// Handle individual checkbox change
function handleCheckboxChange(e) {
  const checkbox = e.target;
  const conversationId = checkbox.dataset.id;
  const currentIndex = parseInt(checkbox.dataset.index);

  // Handle shift+click for range selection
  if (e.shiftKey && lastCheckedIndex !== null) {
    const start = Math.min(lastCheckedIndex, currentIndex);
    const end = Math.max(lastCheckedIndex, currentIndex);

    // Get all checkboxes and select/deselect the range
    const checkboxes = document.querySelectorAll('.conversation-checkbox');
    const isChecking = checkbox.checked;

    for (let i = start; i <= end; i++) {
      const cb = checkboxes[i];
      if (cb) {
        cb.checked = isChecking;
        const id = cb.dataset.id;
        if (isChecking) {
          selectedConversations.add(id);
        } else {
          selectedConversations.delete(id);
        }
      }
    }
  } else {
    // Normal single checkbox toggle
    if (checkbox.checked) {
      selectedConversations.add(conversationId);
    } else {
      selectedConversations.delete(conversationId);
    }
  }

  // Update last checked index
  lastCheckedIndex = currentIndex;

  updateExportButtonText();
  updateSelectAllCheckbox();
}

// Handle select all checkbox
function handleSelectAll(e) {
  const checkboxes = document.querySelectorAll('.conversation-checkbox');

  if (e.target.checked) {
    // Select all visible conversations
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
      selectedConversations.add(checkbox.dataset.id);
    });
  } else {
    // Deselect all
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    selectedConversations.clear();
  }

  // Reset last checked index when using select all
  lastCheckedIndex = null;

  updateExportButtonText();
}

// Update select all checkbox state
function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById('selectAll');
  if (!selectAllCheckbox) return;

  // Show header checkbox as checked when any conversations are selected
  selectAllCheckbox.checked = selectedConversations.size > 0;
}

// Update export button text based on selection
function updateExportButtonText() {
  const exportBtn = document.getElementById('exportAllBtn');
  if (!exportBtn) return;

  if (selectedConversations.size > 0) {
    exportBtn.textContent = `Export Selected (${selectedConversations.size})`;
  } else {
    exportBtn.textContent = 'Export All';
  }
}

// Update statistics
function updateStats() {
  const stats = document.getElementById('stats');
  stats.textContent = `Showing ${filteredConversations.length} of ${allConversations.length} conversations`;
}

// Export single conversation
async function exportConversation(conversationId, conversationName) {
  const format = document.getElementById('exportFormat').value;
  const includeChats = document.getElementById('includeChats').checked;
  const includeMetadata = document.getElementById('includeMetadata').checked;
  const includeArtifacts = document.getElementById('includeArtifacts').checked;
  const extractArtifacts = document.getElementById('extractArtifacts').checked;
  const artifactFormat = document.getElementById('artifactFormat').value;
  const flattenArtifacts = document.getElementById('flattenArtifacts').checked;

  try {
    showToast(`Exporting ${conversationName}...`);

    const response = await fetch(
      `https://claude.ai/api/organizations/${orgId}/chat_conversations/${conversationId}?tree=True&rendering_mode=messages&render_all_tools=true`,
      {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch conversation: ${response.status}`);
    }

    const data = await response.json();

    // Infer model if null
    data.model = inferModel(data);

    // Check if we need to extract artifacts to separate files
    if (extractArtifacts || flattenArtifacts) {
      const artifactFiles = extractArtifactFiles(data, artifactFormat);

      if (artifactFiles.length > 0) {
        // Create a ZIP with artifacts (and optionally conversation)
        const zip = new JSZip();

        // Add conversation file only if includeChats is true
        if (includeChats !== false) {
          let conversationContent, conversationFilename;
          switch (format) {
            case 'markdown':
              conversationContent = convertToMarkdown(data, includeMetadata, conversationId, includeArtifacts);
              conversationFilename = `${conversationName || conversationId}.md`;
              break;
            case 'text':
              conversationContent = convertToText(data, includeMetadata, includeArtifacts);
              conversationFilename = `${conversationName || conversationId}.txt`;
              break;
            default:
              conversationContent = JSON.stringify(data, null, 2);
              conversationFilename = `${conversationName || conversationId}.json`;
          }

          zip.file(conversationFilename, conversationContent);
        }

        // Add artifact files - nested and/or flat
        // Nested: create artifacts subfolder
        if (extractArtifacts) {
          const artifactsFolder = includeChats !== false ? zip.folder('artifacts') : zip;
          for (const artifact of artifactFiles) {
            artifactsFolder.file(artifact.filename, artifact.content);
          }
        }

        // Flat: add artifacts with conversation name prefix in same folder
        if (flattenArtifacts) {
          for (const artifact of artifactFiles) {
            const filename = `${conversationName}_${artifact.filename}`;
            zip.file(filename, artifact.content);
          }
        }

        // Generate and download ZIP
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${conversationName || conversationId}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Exported: ${conversationName} with ${artifactFiles.length} artifact(s)`);
      } else {
        // No artifacts found, export normally
        let content, filename, type;
        switch (format) {
          case 'markdown':
            content = convertToMarkdown(data, includeMetadata, conversationId, includeArtifacts);
            filename = `${conversationName || conversationId}.md`;
            type = 'text/markdown';
            break;
          case 'text':
            content = convertToText(data, includeMetadata, includeArtifacts);
            filename = `${conversationName || conversationId}.txt`;
            type = 'text/plain';
            break;
          default:
            content = JSON.stringify(data, null, 2);
            filename = `${conversationName || conversationId}.json`;
            type = 'application/json';
        }
        downloadFile(content, filename, type);
        showToast(`Exported: ${conversationName} (no artifacts found)`);
      }
    } else {
      // Normal export without artifact extraction
      if (includeChats === false) {
        // If chats are disabled and we're not extracting artifacts, there's nothing to export
        showToast('Nothing to export. Enable "Chats" or "Artifacts nested".', true);
      } else {
        let content, filename, type;
        switch (format) {
          case 'markdown':
            content = convertToMarkdown(data, includeMetadata, conversationId, includeArtifacts);
            filename = `${conversationName || conversationId}.md`;
            type = 'text/markdown';
            break;
          case 'text':
            content = convertToText(data, includeMetadata, includeArtifacts);
            filename = `${conversationName || conversationId}.txt`;
            type = 'text/plain';
            break;
          default:
            content = JSON.stringify(data, null, 2);
            filename = `${conversationName || conversationId}.json`;
            type = 'application/json';
        }
        downloadFile(content, filename, type);
        showToast(`Exported: ${conversationName}`);
      }
    }
    
  } catch (error) {
    console.error('Export error:', error);
    showToast(`Failed to export: ${error.message}`, true);
  }
}

// Export all filtered conversations
async function exportAllFiltered() {
  const format = document.getElementById('exportFormat').value;
  const includeChats = document.getElementById('includeChats').checked;
  const includeMetadata = document.getElementById('includeMetadata').checked;
  const includeArtifacts = document.getElementById('includeArtifacts').checked;
  const extractArtifacts = document.getElementById('extractArtifacts').checked;
  const artifactFormat = document.getElementById('artifactFormat').value;
  const flattenArtifacts = document.getElementById('flattenArtifacts').checked;

  const button = document.getElementById('exportAllBtn');
  button.disabled = true;
  const originalButtonText = button.textContent;
  button.textContent = 'Preparing...';

  // Determine which conversations to export
  let conversationsToExport;
  if (selectedConversations.size > 0) {
    // Export only selected conversations
    conversationsToExport = filteredConversations.filter(conv => selectedConversations.has(conv.uuid));
  } else {
    // Export all filtered conversations
    conversationsToExport = filteredConversations;
  }

  // Show progress modal
  const progressModal = document.getElementById('progressModal');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressStats = document.getElementById('progressStats');
  progressModal.style.display = 'block';

  let cancelExport = false;
  const cancelButton = document.getElementById('cancelExport');
  cancelButton.onclick = () => {
    cancelExport = true;
    progressText.textContent = 'Cancelling...';
  };

  try {
    // Create a new ZIP file
    const zip = new JSZip();
    const total = conversationsToExport.length;
    let completed = 0;
    let failed = 0;
    const failedConversations = [];

    progressText.textContent = `Exporting ${total} conversations...`;

    // Process conversations in batches to avoid overwhelming the API
    const batchSize = 3; // Process 3 at a time
    for (let i = 0; i < total; i += batchSize) {
      if (cancelExport) break;

      const batch = conversationsToExport.slice(i, Math.min(i + batchSize, total));
      const promises = batch.map(async (conv) => {
        try {
          const response = await fetch(
            `https://claude.ai/api/organizations/${orgId}/chat_conversations/${conv.uuid}?tree=True&rendering_mode=messages&render_all_tools=true`,
            {
              credentials: 'include',
              headers: {
                'Accept': 'application/json',
              }
            }
          );
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();

          // Infer model if null
          data.model = inferModel(data);

          // Extract artifacts first to check if this conversation should be included
          const artifactFiles = extractArtifactFiles(data, artifactFormat);

          // If chats are disabled and no artifacts, skip this conversation
          if (includeChats === false && artifactFiles.length === 0) {
            console.log(`Skipping ${conv.name} - no artifacts found (chats disabled)`);
            completed++; // Count as completed even though skipped
            return; // Skip this conversation in the promise
          }

          // Generate filename and content based on format
          let content, filename;
          const safeName = conv.name.replace(/[<>:"/\\|?*]/g, '_'); // Remove invalid filename characters

          switch (format) {
            case 'markdown':
              content = convertToMarkdown(data, includeMetadata, conv.uuid, includeArtifacts);
              filename = `${safeName}.md`;
              break;
            case 'text':
              content = convertToText(data, includeMetadata, includeArtifacts);
              filename = `${safeName}.txt`;
              break;
            default: // json
              content = JSON.stringify(data, null, 2);
              filename = `${safeName}.json`;
          }

          // If extracting artifacts (nested or flat), create folder structure
          if (extractArtifacts || flattenArtifacts) {
            const convFolder = zip.folder(safeName);

            // Add conversation file only if includeChats is true
            if (includeChats !== false) {
              convFolder.file(filename, content);
            }

            // Add artifact files - nested and/or flat
            if (artifactFiles.length > 0) {
              // Nested: create artifacts subfolder
              if (extractArtifacts) {
                const artifactsFolder = includeChats !== false ? convFolder.folder('artifacts') : convFolder;
                for (const artifact of artifactFiles) {
                  artifactsFolder.file(artifact.filename, artifact.content);
                }
              }

              // Flat: add artifacts with conversation name prefix in same folder
              if (flattenArtifacts) {
                for (const artifact of artifactFiles) {
                  const artifactFilename = `${safeName}_${artifact.filename}`;
                  convFolder.file(artifactFilename, artifact.content);
                }
              }
            }
          } else {
            // Add file to ZIP root only if chats are enabled
            if (includeChats !== false) {
              zip.file(filename, content);
            }
          }

          completed++;
          
        } catch (error) {
          console.error(`Failed to export ${conv.name}:`, error);
          failed++;
          failedConversations.push(conv.name);
        }
      });
      
      // Wait for batch to complete
      await Promise.all(promises);
      
      // Update progress
      const progress = Math.round((completed + failed) / total * 100);
      progressBar.style.width = `${progress}%`;
      progressStats.textContent = `${completed} succeeded, ${failed} failed out of ${total}`;
      
      // Small delay between batches
      if (i + batchSize < total && !cancelExport) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    if (cancelExport) {
      progressModal.style.display = 'none';
      showToast('Export cancelled', true);
      return;
    }

    // Generate and download the ZIP file
    progressText.textContent = 'Creating ZIP file...';
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6 // Medium compression
      }
    }, (metadata) => {
      // Update progress during ZIP creation
      const zipProgress = Math.round(metadata.percent);
      progressBar.style.width = `${zipProgress}%`;
    });
    
    // Download the ZIP file
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Format: claude-exports-2025-10-31_14-30-45.zip
    const now = new Date();
    const datetime = now.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
    a.download = `claude-exports-${datetime}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    progressModal.style.display = 'none';
    
    if (failed > 0) {
      showToast(`Exported ${completed} of ${total} conversations (${failed} failed). Check export_summary.json in the ZIP for details.`);
    } else {
      showToast(`Successfully exported all ${completed} conversations!`);
    }
    
  } catch (error) {
    console.error('Export error:', error);
    progressModal.style.display = 'none';
    showToast(`Export failed: ${error.message}`, true);
  } finally {
    button.disabled = false;
    button.textContent = originalButtonText;
  }
}

// Conversion functions are now imported from utils.js
// Functions available: getCurrentBranch, convertToMarkdown, convertToText, downloadFile

// Show error message
function showError(message) {
  const tableContent = document.getElementById('tableContent');
  tableContent.innerHTML = `<div class="error">${message}</div>`;
}

// Show toast notification
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.background = isError ? '#d32f2f' : '#333';
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Setup event listeners
function setupEventListeners() {
  // Handle checkbox dependencies
  const includeChatsCheckbox = document.getElementById('includeChats');
  const includeMetadataCheckbox = document.getElementById('includeMetadata');
  const includeArtifactsCheckbox = document.getElementById('includeArtifacts');

  function updateCheckboxStates() {
    const chatsEnabled = includeChatsCheckbox.checked;

    // Disable metadata and inline artifacts when chats is unchecked
    includeMetadataCheckbox.disabled = !chatsEnabled;
    includeArtifactsCheckbox.disabled = !chatsEnabled;

    // Optionally uncheck them when disabled
    if (!chatsEnabled) {
      includeMetadataCheckbox.checked = false;
      includeArtifactsCheckbox.checked = false;
    }
  }

  includeChatsCheckbox.addEventListener('change', updateCheckboxStates);
  updateCheckboxStates(); // Initialize on load

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // Search input
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    const searchBox = document.getElementById('searchBox');
    if (e.target.value) {
      searchBox.classList.add('has-text');
    } else {
      searchBox.classList.remove('has-text');
    }
    applyFiltersAndSort();
  });
  
  // Clear search
  document.getElementById('clearSearch').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchBox').classList.remove('has-text');
    applyFiltersAndSort();
  });
  
  // Project filter (not yet implemented - just placeholder)
  const projectFilter = document.getElementById('projectFilter');
  if (projectFilter) {
    projectFilter.addEventListener('change', applyFiltersAndSort);
  }

  // Export all button
  document.getElementById('exportAllBtn').addEventListener('click', exportAllFiltered);
}
