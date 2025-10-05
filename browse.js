// State management
let allConversations = [];
let filteredConversations = [];
let orgId = null;
let currentSort = 'updated_desc';

// Model name mappings
const MODEL_DISPLAY_NAMES = {
  'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
  'claude-3-opus-20240229': 'Claude 3 Opus',
  'claude-3-haiku-20240307': 'Claude 3 Haiku',
  'claude-3-5-sonnet-20240620': 'Claude 3.5 Sonnet',
  'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
  'claude-3-5-sonnet-20241022': 'Claude 3.6 Sonnet',
  'claude-3-7-sonnet-20250219': 'Claude 3.7 Sonnet',
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  'claude-opus-4-20250514': 'Claude Opus 4',
  'claude-opus-4-1-20250805': 'Claude Opus 4.1',
  'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5'
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

// Load all conversations
async function loadConversations() {
  if (!orgId) return;
  
  try {
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
    
    // Infer models for conversations with null model
    allConversations = allConversations.map(conv => ({
      ...conv,
      model: inferModel(conv)
    }));
    
    // Extract unique models for filter
    const models = [...new Set(allConversations.map(c => c.model))].filter(m => m).sort();
    populateModelFilter(models);
    
    // Apply initial sort and display
    applyFiltersAndSort();
    
  } catch (error) {
    console.error('Error loading conversations:', error);
    showError(`Failed to load conversations: ${error.message}`);
  }
}

// Populate model filter dropdown
function populateModelFilter(models) {
  const modelFilter = document.getElementById('modelFilter');
  modelFilter.innerHTML = '<option value="">All Models</option>';
  
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = formatModelName(model);
    modelFilter.appendChild(option);
  });
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
  const modelFilter = document.getElementById('modelFilter').value;
  
  // Filter conversations
  filteredConversations = allConversations.filter(conv => {
    const matchesSearch = !searchTerm || 
      conv.name.toLowerCase().includes(searchTerm) ||
      (conv.summary && conv.summary.toLowerCase().includes(searchTerm));
    
    const matchesModel = !modelFilter || conv.model === modelFilter;
    
    return matchesSearch && matchesModel;
  });
  
  // Sort conversations
  sortConversations();
  
  // Update display
  displayConversations();
  updateStats();
}

// Sort conversations based on current sort setting
function sortConversations() {
  const [field, direction] = currentSort.split('_');
  
  filteredConversations.sort((a, b) => {
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
      default:
        return 0;
    }
    
    if (direction === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
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
          <th class="sortable" data-sort="name">Name</th>
          <th class="sortable" data-sort="updated">Last Updated</th>
          <th class="sortable" data-sort="created">Created</th>
          <th>Model</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  filteredConversations.forEach(conv => {
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
  
  // Enable export all button
  document.getElementById('exportAllBtn').disabled = false;
}

// Update statistics
function updateStats() {
  const stats = document.getElementById('stats');
  stats.textContent = `Showing ${filteredConversations.length} of ${allConversations.length} conversations`;
}

// Export single conversation
async function exportConversation(conversationId, conversationName) {
  const format = document.getElementById('exportFormat').value;
  const includeMetadata = document.getElementById('includeMetadata').checked;
  
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
    
    let content, filename, type;
    switch (format) {
      case 'markdown':
        content = convertToMarkdown(data, includeMetadata);
        filename = `claude-${conversationName || conversationId}.md`;
        type = 'text/markdown';
        break;
      case 'text':
        content = convertToText(data, includeMetadata);
        filename = `claude-${conversationName || conversationId}.txt`;
        type = 'text/plain';
        break;
      default:
        content = JSON.stringify(data, null, 2);
        filename = `claude-${conversationName || conversationId}.json`;
        type = 'application/json';
    }
    
    downloadFile(content, filename, type);
    showToast(`Exported: ${conversationName}`);
    
  } catch (error) {
    console.error('Export error:', error);
    showToast(`Failed to export: ${error.message}`, true);
  }
}

// Export all filtered conversations
async function exportAllFiltered() {
  const format = document.getElementById('exportFormat').value;
  const includeMetadata = document.getElementById('includeMetadata').checked;
  
  const button = document.getElementById('exportAllBtn');
  button.disabled = true;
  button.textContent = 'Preparing...';
  
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
    const total = filteredConversations.length;
    let completed = 0;
    let failed = 0;
    const failedConversations = [];
    
    progressText.textContent = `Exporting ${total} conversations...`;
    
    // Process conversations in batches to avoid overwhelming the API
    const batchSize = 3; // Process 3 at a time
    for (let i = 0; i < total; i += batchSize) {
      if (cancelExport) break;
      
      const batch = filteredConversations.slice(i, Math.min(i + batchSize, total));
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
          
          // Generate filename and content based on format
          let content, filename;
          const safeName = conv.name.replace(/[<>:"/\\|?*]/g, '_'); // Remove invalid filename characters
          
          switch (format) {
            case 'markdown':
              content = convertToMarkdown(data, includeMetadata);
              filename = `${safeName}.md`;
              break;
            case 'text':
              content = convertToText(data, includeMetadata);
              filename = `${safeName}.txt`;
              break;
            default: // json
              content = JSON.stringify(data, null, 2);
              filename = `${safeName}.json`;
          }
          
          // Add file to ZIP
          zip.file(filename, content);
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
    
    // Add a summary file
    const summary = {
      export_date: new Date().toISOString(),
      total_conversations: total,
      successful_exports: completed,
      failed_exports: failed,
      failed_conversations: failedConversations,
      format: format,
      include_metadata: includeMetadata
    };
    zip.file('export_summary.json', JSON.stringify(summary, null, 2));
    
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
    a.download = `claude-conversations-${new Date().toISOString().split('T')[0]}.zip`;
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
    button.textContent = 'Export All';
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
  
  // Model filter
  document.getElementById('modelFilter').addEventListener('change', applyFiltersAndSort);
  
  // Sort dropdown
  document.getElementById('sortBy').addEventListener('change', (e) => {
    currentSort = e.target.value;
    applyFiltersAndSort();
  });
  
  // Export all button
  document.getElementById('exportAllBtn').addEventListener('click', exportAllFiltered);
}
