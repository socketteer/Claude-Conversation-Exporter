/**
 * Browse page script for Claude Conversation Exporter
 * Displays all conversations in a searchable/filterable table
 */

import JSZip from 'jszip';
import type { Conversation, ConversationListItem, ExportFormat } from './types';
import {
  convertToMarkdown,
  convertToText,
  downloadFile,
  generateFilename,
  inferModel,
} from './utils';

/**
 * Model display name mappings
 */
const MODEL_DISPLAY_NAMES: Record<string, string> = {
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
  'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
};

/**
 * State management
 */
interface BrowseState {
  allConversations: ConversationListItem[];
  filteredConversations: ConversationListItem[];
  orgId: string | null;
  currentSort: string;
  cancelExport: boolean;
}

const state: BrowseState = {
  allConversations: [],
  filteredConversations: [],
  orgId: null,
  currentSort: 'updated_desc',
  cancelExport: false,
};

/**
 * Get HTML element by ID with type checking
 */
function getElement<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Load organization ID from storage
 */
async function loadOrgId(): Promise<void> {
  try {
    const result = await browser.storage.sync.get(['organizationId']);
    state.orgId = (result['organizationId'] as string) || null;

    if (!state.orgId) {
      showError(
        'Organization ID not configured. Please configure it in the extension options.'
      );
    }
  } catch (error) {
    console.error('Error loading org ID:', error);
  }
}

/**
 * Load all conversations from Claude API
 */
async function loadConversations(): Promise<void> {
  if (!state.orgId) return;

  try {
    const response = await fetch(
      `https://claude.ai/api/organizations/${state.orgId}/chat_conversations`,
      {
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to load conversations: ${response.status}`);
    }

    const conversations = (await response.json()) as ConversationListItem[];
    console.log(`Loaded ${conversations.length} conversations`);

    // Infer models for conversations with null model
    state.allConversations = conversations.map((conv) => ({
      ...conv,
      model: inferModel(conv),
    }));

    // Extract unique models for filter
    const models = [
      ...new Set(
        state.allConversations.map((c) => c.model).filter((m): m is string => Boolean(m))
      ),
    ].sort();
    populateModelFilter(models);

    // Apply initial sort and display
    applyFiltersAndSort();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error loading conversations:', error);
    showError(`Failed to load conversations: ${errorMsg}`);
  }
}

/**
 * Populate model filter dropdown
 */
function populateModelFilter(models: string[]): void {
  const modelFilter = getElement<HTMLSelectElement>('modelFilter');
  if (!modelFilter) return;

  modelFilter.innerHTML = '<option value="">All Models</option>';

  for (const model of models) {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = formatModelName(model);
    modelFilter.appendChild(option);
  }
}

/**
 * Format model name for display
 */
function formatModelName(model: string): string {
  return MODEL_DISPLAY_NAMES[model] ?? model;
}

/**
 * Get model badge CSS class
 */
function getModelBadgeClass(model: string): string {
  if (model.includes('sonnet')) return 'sonnet';
  if (model.includes('opus')) return 'opus';
  if (model.includes('haiku')) return 'haiku';
  return '';
}

/**
 * Apply filters and sorting
 */
function applyFiltersAndSort(): void {
  const searchInput = getElement<HTMLInputElement>('searchInput');
  const modelFilter = getElement<HTMLSelectElement>('modelFilter');

  const searchTerm = searchInput?.value.toLowerCase() ?? '';
  const modelFilterValue = modelFilter?.value ?? '';

  // Filter conversations
  state.filteredConversations = state.allConversations.filter((conv) => {
    const matchesSearch =
      !searchTerm ||
      conv.name.toLowerCase().includes(searchTerm) ||
      ('summary' in conv &&
        typeof conv['summary'] === 'string' &&
        conv['summary'].toLowerCase().includes(searchTerm));

    const matchesModel = !modelFilterValue || conv.model === modelFilterValue;

    return matchesSearch && matchesModel;
  });

  // Sort conversations
  sortConversations();

  // Update display
  displayConversations();
  updateStats();
}

/**
 * Sort conversations based on current sort setting
 */
function sortConversations(): void {
  const [field, direction] = state.currentSort.split('_');

  state.filteredConversations.sort((a, b) => {
    let aVal: string | Date;
    let bVal: string | Date;

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

/**
 * Display conversations in table
 */
function displayConversations(): void {
  const tableContent = getElement('tableContent');
  if (!tableContent) return;

  if (state.filteredConversations.length === 0) {
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

  for (const conv of state.filteredConversations) {
    const updatedDate = new Date(conv.updated_at).toLocaleDateString();
    const createdDate = new Date(conv.created_at).toLocaleDateString();
    const modelBadgeClass = getModelBadgeClass(conv.model ?? '');

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
            ${formatModelName(conv.model ?? '')}
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
  }

  html += `
      </tbody>
    </table>
  `;

  tableContent.innerHTML = html;

  // Add export button listeners
  const exportButtons = document.querySelectorAll<HTMLButtonElement>('.btn-export');
  exportButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset['id'];
      const name = btn.dataset['name'];
      if (id && name) {
        void exportConversation(id, name);
      }
    });
  });

  // Add view button listeners
  const viewButtons = document.querySelectorAll<HTMLButtonElement>('.btn-view');
  viewButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const conversationId = btn.dataset['id'];
      if (conversationId) {
        window.open(`https://claude.ai/chat/${conversationId}`, '_blank');
      }
    });
  });

  // Enable export all button
  const exportAllBtn = getElement<HTMLButtonElement>('exportAllBtn');
  if (exportAllBtn) {
    exportAllBtn.disabled = false;
  }
}

/**
 * Update statistics display
 */
function updateStats(): void {
  const stats = getElement('stats');
  if (!stats) return;

  stats.textContent = `Showing ${state.filteredConversations.length} of ${state.allConversations.length} conversations`;
}

/**
 * Export single conversation
 */
async function exportConversation(
  conversationId: string,
  conversationName: string
): Promise<void> {
  const formatSelect = getElement<HTMLSelectElement>('exportFormat');
  const metadataCheck = getElement<HTMLInputElement>('includeMetadata');

  const format = (formatSelect?.value as ExportFormat) || 'json';
  const includeMetadata = metadataCheck?.checked ?? true;

  try {
    showToast(`Exporting ${conversationName}...`);

    const response = await fetch(
      `https://claude.ai/api/organizations/${state.orgId}/chat_conversations/${conversationId}?tree=True&rendering_mode=messages&render_all_tools=true`,
      {
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch conversation: ${response.status}`);
    }

    const data = (await response.json()) as Conversation;

    // Infer model if null
    data.model = inferModel(data);

    let content: string;
    let filename: string;
    let type: string;

    switch (format) {
      case 'markdown':
        content = convertToMarkdown(data, includeMetadata);
        filename = generateFilename(conversationName, 'markdown', data.uuid);
        type = 'text/markdown';
        break;
      case 'text':
        content = convertToText(data, includeMetadata);
        filename = generateFilename(conversationName, 'text', data.uuid);
        type = 'text/plain';
        break;
      default:
        content = JSON.stringify(data, null, 2);
        filename = generateFilename(conversationName, 'json', data.uuid);
        type = 'application/json';
    }

    downloadFile(content, filename, type);
    showToast(`Exported: ${conversationName}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Export error:', error);
    showToast(`Failed to export: ${errorMsg}`, true);
  }
}

/**
 * Export all filtered conversations as ZIP
 */
async function exportAllFiltered(): Promise<void> {
  const formatSelect = getElement<HTMLSelectElement>('exportFormat');
  const metadataCheck = getElement<HTMLInputElement>('includeMetadata');
  const button = getElement<HTMLButtonElement>('exportAllBtn');

  const format = (formatSelect?.value as ExportFormat) || 'json';
  const includeMetadata = metadataCheck?.checked ?? true;

  if (!button) return;

  button.disabled = true;
  button.textContent = 'Preparing...';

  // Show progress modal
  const progressModal = getElement('progressModal');
  const progressBar = getElement<HTMLDivElement>('progressBar');
  const progressText = getElement('progressText');
  const progressStats = getElement('progressStats');

  if (!progressModal || !progressBar || !progressText || !progressStats) {
    showToast('Error: Progress UI elements not found', true);
    return;
  }

  progressModal.style.display = 'block';
  state.cancelExport = false;

  const cancelButton = getElement<HTMLButtonElement>('cancelExport');
  if (cancelButton) {
    cancelButton.onclick = () => {
      state.cancelExport = true;
      progressText.textContent = 'Cancelling...';
    };
  }

  try {
    const zip = new JSZip();
    const total = state.filteredConversations.length;
    let completed = 0;
    let failed = 0;
    const failedConversations: string[] = [];

    progressText.textContent = `Exporting ${total} conversations...`;

    // Process conversations in batches
    const batchSize = 3;
    for (let i = 0; i < total; i += batchSize) {
      if (state.cancelExport) break;

      const batch = state.filteredConversations.slice(i, Math.min(i + batchSize, total));
      const promises = batch.map(async (conv) => {
        try {
          const response = await fetch(
            `https://claude.ai/api/organizations/${state.orgId}/chat_conversations/${conv.uuid}?tree=True&rendering_mode=messages&render_all_tools=true`,
            {
              credentials: 'include',
              headers: {
                Accept: 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = (await response.json()) as Conversation;
          data.model = inferModel(data);

          let content: string;
          let filename: string;
          const safeName = conv.name.replace(/[<>:"/\\|?*]/g, '_');

          switch (format) {
            case 'markdown':
              content = convertToMarkdown(data, includeMetadata);
              filename = `${safeName}.md`;
              break;
            case 'text':
              content = convertToText(data, includeMetadata);
              filename = `${safeName}.txt`;
              break;
            default:
              content = JSON.stringify(data, null, 2);
              filename = `${safeName}.json`;
          }

          zip.file(filename, content);
          completed++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Failed to export ${conv.name}:`, errorMsg);
          failed++;
          failedConversations.push(conv.name);
        }
      });

      await Promise.all(promises);

      // Update progress
      const progress = Math.round(((completed + failed) / total) * 100);
      progressBar.style.width = `${progress}%`;
      progressStats.textContent = `${completed} succeeded, ${failed} failed out of ${total}`;

      // Small delay between batches
      if (i + batchSize < total && !state.cancelExport) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (state.cancelExport) {
      progressModal.style.display = 'none';
      showToast('Export cancelled', true);
      return;
    }

    // Add summary file
    const summary = {
      export_date: new Date().toISOString(),
      total_conversations: total,
      successful_exports: completed,
      failed_exports: failed,
      failed_conversations: failedConversations,
      format: format,
      include_metadata: includeMetadata,
    };
    zip.file('export_summary.json', JSON.stringify(summary, null, 2));

    // Generate and download ZIP
    progressText.textContent = 'Creating ZIP file...';
    const blob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6,
        },
      },
      (metadata) => {
        const zipProgress = Math.round(metadata.percent);
        progressBar.style.width = `${zipProgress}%`;
      }
    );

    // Download the ZIP file
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claude-conversations-${
      new Date().toISOString().split('T')[0] ?? 'export'
    }.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    progressModal.style.display = 'none';

    if (failed > 0) {
      showToast(
        `Exported ${completed} of ${total} conversations (${failed} failed). Check export_summary.json in the ZIP for details.`
      );
    } else {
      showToast(`Successfully exported all ${completed} conversations!`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Export error:', error);
    progressModal.style.display = 'none';
    showToast(`Export failed: ${errorMsg}`, true);
  } finally {
    button.disabled = false;
    button.textContent = 'Export All';
  }
}

/**
 * Show error message
 */
function showError(message: string): void {
  const tableContent = getElement('tableContent');
  if (!tableContent) return;

  tableContent.innerHTML = `<div class="error">${message}</div>`;
}

/**
 * Show toast notification
 */
function showToast(message: string, isError = false): void {
  const toast = getElement('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.style.background = isError ? '#d32f2f' : '#333';
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/**
 * Setup event listeners
 */
function setupEventListeners(): void {
  // Search input
  const searchInput = getElement<HTMLInputElement>('searchInput');
  const searchBox = getElement('searchBox');
  searchInput?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    if (searchBox) {
      if (target.value) {
        searchBox.classList.add('has-text');
      } else {
        searchBox.classList.remove('has-text');
      }
    }
    applyFiltersAndSort();
  });

  // Clear search
  const clearSearch = getElement('clearSearch');
  clearSearch?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    searchBox?.classList.remove('has-text');
    applyFiltersAndSort();
  });

  // Model filter
  const modelFilter = getElement('modelFilter');
  modelFilter?.addEventListener('change', applyFiltersAndSort);

  // Sort dropdown
  const sortBy = getElement<HTMLSelectElement>('sortBy');
  sortBy?.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    state.currentSort = target.value;
    applyFiltersAndSort();
  });

  // Export all button
  const exportAllBtn = getElement('exportAllBtn');
  exportAllBtn?.addEventListener('click', () => {
    void exportAllFiltered;
  });
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
  void (async () => {
    await loadOrgId();
    await loadConversations();
    setupEventListeners();
  })();
});
