/**
 * Templates Module for SankeyMATIC
 * Manages saving and restoring visual styling configurations
 */

(function templatesModule(glob) {
  'use strict';

  // localStorage key
  const STORAGE_KEY = 'skm_templates';

  // Saved templates
  const templates = new Map();

  // Settings to capture in templates (excludes flow data)
  const templateSettingKeys = [
    // Canvas settings
    'size_w', 'size_h', 'margin_l', 'margin_r', 'margin_t', 'margin_b',
    'bg_color', 'bg_transparent',
    // Node settings
    'node_w', 'node_h', 'node_spacing', 'node_border',
    'node_theme', 'node_color', 'node_opacity',
    // Flow settings
    'flow_curvature', 'flow_inheritfrom', 'flow_color', 'flow_opacity',
    // Layout settings
    'layout_order', 'layout_justifyorigins', 'layout_justifyends',
    'layout_reversegraph', 'layout_attachincompletesto',
    // Label settings
    'labels_color', 'labels_hide', 'labels_highlight', 'labels_fontface',
    'labels_googlefont', 'labels_decimalplaces', 'labels_valuemode', 'labels_comparisonline',
    'labels_linespacing', 'labels_relativesize', 'labels_magnify',
    'labelname_appears', 'labelname_size', 'labelname_weight',
    'labelvalue_appears', 'labelvalue_fullprecision', 'labelvalue_position',
    'labelvalue_weight', 'labelposition_autoalign', 'labelposition_scheme',
    'labelposition_first', 'labelposition_breakpoint',
    // Value format settings
    'value_format', 'value_prefix', 'value_suffix',
    // Theme offsets
    'themeoffset_a', 'themeoffset_b', 'themeoffset_c', 'themeoffset_d'
  ];

  /**
   * Load templates from localStorage.
   * Automatically called on module initialization.
   * Handles errors gracefully by logging warnings.
   * @returns {void}
   */
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const templateList = JSON.parse(stored);
        templateList.forEach(t => {
          templates.set(t.name, t);
        });
      }
    } catch (e) {
      console.warn('Failed to load templates from localStorage:', e);
    }
  }

  /**
   * Save templates to localStorage.
   * Called automatically after template modifications.
   * Handles errors gracefully by logging warnings.
   * @private
   * @returns {void}
   */
  function saveToStorage() {
    try {
      const templateList = Array.from(templates.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templateList));
    } catch (e) {
      console.warn('Failed to save templates to localStorage:', e);
    }
  }

  /**
   * Capture current settings from the UI.
   * Extracts all styling settings from form elements (excludes flow data).
   * @returns {Object} Settings object with key-value pairs for all template settings
   */
  function captureCurrentSettings() {
    const settings = {};
    
    templateSettingKeys.forEach(key => {
      const el = document.getElementById(key);
      if (el) {
        if (el.type === 'checkbox') {
          settings[key] = el.checked;
        } else if (el.type === 'radio') {
          const radioGroup = document.querySelector(`input[name="${key}"]:checked`);
          if (radioGroup) {
            settings[key] = radioGroup.value;
          }
        } else {
          settings[key] = el.value;
        }
      } else {
        // Try radio group by name
        const radioGroup = document.querySelector(`input[name="${key}"]:checked`);
        if (radioGroup) {
          settings[key] = radioGroup.value;
        }
      }
    });
    
    return settings;
  }

  /**
   * Apply settings to the UI.
   * Updates all form elements with values from the settings object.
   * @private
   * @param {Object} settings - Settings object with key-value pairs
   * @returns {void}
   */
  function applySettings(settings) {
    Object.entries(settings).forEach(([key, value]) => {
      const el = document.getElementById(key);
      if (el) {
        if (el.type === 'checkbox') {
          el.checked = Boolean(value);
        } else {
          el.value = value;
        }
      } else {
        // Try radio group by name
        const radio = document.querySelector(`input[name="${key}"][value="${value}"]`);
        if (radio) {
          radio.checked = true;
        }
      }
    });
  }

  /**
   * Save current settings as a template.
   * Captures all styling settings and persists to localStorage.
   * @param {string} name - Template name (user-friendly display name)
   * @returns {Object} The saved template object with {name, createdAt, settings}
   */
  function save(name) {
    const template = {
      name,
      createdAt: new Date().toISOString(),
      settings: captureCurrentSettings()
    };
    
    templates.set(name, template);
    saveToStorage();
    return template;
  }

  /**
   * Apply a template to the current settings.
   * Updates UI with template settings and triggers diagram re-render.
   * @param {string} name - Template name
   * @returns {boolean} True if applied successfully, false if template not found
   */
  function apply(name) {
    const template = templates.get(name);
    if (!template) {
      return false;
    }
    
    applySettings(template.settings);
    
    // Trigger diagram re-render if process_sankey is available
    if (typeof glob.process_sankey === 'function') {
      glob.process_sankey();
    }
    
    return true;
  }

  /**
   * Delete a template.
   * Removes template from memory and localStorage.
   * @param {string} name - Template name
   * @returns {boolean} True if deleted successfully, false if not found
   */
  function deleteTemplate(name) {
    if (templates.has(name)) {
      templates.delete(name);
      saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Get all templates.
   * @returns {Object[]} Array of template objects with {name, createdAt, settings}
   */
  function getAll() {
    return Array.from(templates.values());
  }

  /**
   * Get a template by name.
   * @param {string} name - Template name
   * @returns {Object|null} Template object with {name, createdAt, settings} or null if not found
   */
  function get(name) {
    return templates.get(name) || null;
  }

  /**
   * Update the template dropdown UI.
   * Refreshes the dropdown with current templates.
   * @returns {void}
   */
  function updateDropdown() {
    const dropdown = document.getElementById('template_select');
    if (!dropdown) return;
    
    // Clear existing options except the first one
    dropdown.innerHTML = '<option value="">-- Select a template --</option>';
    
    // Add all templates
    const allTemplates = Array.from(templates.values());
    allTemplates.forEach(template => {
      const option = document.createElement('option');
      option.value = template.name;
      option.textContent = template.name;
      dropdown.appendChild(option);
    });
  }

  /**
   * Show dialog to save a new template.
   * Prompts user for template name and saves current settings.
   * @returns {void}
   */
  function showSaveDialog() {
    const name = prompt('Enter a name for this template:');
    if (name && name.trim()) {
      save(name.trim());
      updateDropdown();
      alert(`Template "${name.trim()}" saved successfully!`);
    }
  }

  /**
   * Apply the selected template from the dropdown.
   * Reads dropdown value and applies the corresponding template.
   * @returns {void}
   */
  function applySelected() {
    const dropdown = document.getElementById('template_select');
    if (!dropdown) return;
    
    const selectedName = dropdown.value;
    if (!selectedName) {
      alert('Please select a template to apply.');
      return;
    }
    
    const success = apply(selectedName);
    if (success) {
      alert(`Template "${selectedName}" applied successfully!`);
    } else {
      alert(`Failed to apply template "${selectedName}".`);
    }
  }

  /**
   * Delete the selected template from the dropdown.
   * Prompts for confirmation before deleting.
   * @returns {void}
   */
  function deleteSelected() {
    const dropdown = document.getElementById('template_select');
    if (!dropdown) return;
    
    const selectedName = dropdown.value;
    if (!selectedName) {
      alert('Please select a template to delete.');
      return;
    }
    
    const confirmed = confirm(`Are you sure you want to delete the template "${selectedName}"?`);
    if (confirmed) {
      const success = deleteTemplate(selectedName);
      if (success) {
        updateDropdown();
        dropdown.value = '';
        alert(`Template "${selectedName}" deleted successfully!`);
      } else {
        alert(`Failed to delete template "${selectedName}".`);
      }
    }
  }

  /**
   * Initialize the UI.
   * Loads templates from storage and updates dropdown.
   * @returns {void}
   */
  function initializeUI() {
    loadFromStorage();
    updateDropdown();
  }

  // Export the module
  glob.Templates = {
    loadFromStorage,
    captureCurrentSettings,
    save,
    apply,
    delete: deleteTemplate,
    getAll,
    get,
    showSaveDialog,
    applySelected,
    deleteSelected,
    updateDropdown,
    initializeUI
  };

  // Initialize when the DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeUI);
    } else {
      initializeUI();
    }
  }

})(typeof window !== 'undefined' ? window : global);
