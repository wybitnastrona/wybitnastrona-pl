/**
 * Skrypt wstrzykiwany do iframe (Sandpack/WC) ktory umozliwia wybor elementu
 * z DOM strony — generuje unikalny CSS selector i zwraca outerHTML.
 *
 * Jest dolaczany do `index.html` startera (zaszywany przez wspolny snippet,
 * lub injectowany przez `iframe.contentWindow.eval` przy zaladowaniu).
 *
 * Komunikuje sie z parentem przez `window.parent.postMessage`.
 */

export const ELEMENT_PICKER_SCRIPT = `
(function() {
  if (window.__wybitnaPickerInstalled) return;
  window.__wybitnaPickerInstalled = true;

  // mode: 'off' | 'pick' (chat hint) | 'edit-text' (inline editor)
  let mode = 'off';
  let highlighted = null;
  /** Po kliknięciu w trybie pick — obrys zostaje do wyłączenia trybu z parenta. */
  let pickedEl = null;
  let editingEl = null;
  let editingOriginal = '';
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;pointer-events:none;z-index:2147483647;display:none;' +
    'border:2px dashed rgba(255,255,255,0.92);' +
    'box-shadow:0 0 0 1px rgba(0,0,0,0.88),inset 0 0 0 1px rgba(0,0,0,0.45);' +
    'background:transparent;transition:top 45ms ease-out,left 45ms ease-out,width 45ms ease-out,height 45ms ease-out';
  function mountOverlay() {
    if (!document.body) return;
    document.body.appendChild(overlay);
  }
  if (document.body) mountOverlay();
  else document.addEventListener('DOMContentLoaded', mountOverlay);

  function getSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '#' + CSS.escape(el.id);
    const path = [];
    let node = el;
    while (node && node.nodeType === 1 && path.length < 6) {
      let part = node.tagName.toLowerCase();
      if (node.className && typeof node.className === 'string') {
        const classes = node.className.trim().split(/\\s+/).slice(0, 2)
          .map(c => '.' + CSS.escape(c)).join('');
        part += classes;
      }
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(s => s.tagName === node.tagName);
        if (siblings.length > 1) {
          part += ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')';
        }
      }
      path.unshift(part);
      node = parent;
    }
    return path.join(' > ');
  }

  function isLeafText(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.children && el.children.length > 0) return false;
    var t = (el.textContent || '').trim();
    return t.length > 0 && t.length < 400;
  }

  function syncOverlayRect(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = r.top + 'px';
    overlay.style.left = r.left + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
  }

  function highlight(el) {
    if (!el) {
      if (mode === 'pick' && !pickedEl) overlay.style.display = 'none';
      highlighted = null;
      return;
    }
    syncOverlayRect(el);
    highlighted = el;
  }

  function onScrollOrResize() {
    if (mode === 'pick' && highlighted) syncOverlayRect(highlighted);
    else if (pickedEl) syncOverlayRect(pickedEl);
  }

  function onMove(e) {
    if (editingEl) return;
    if (mode === 'off') return;
    const el = e.target;
    if (el === overlay) return;
    if (mode === 'edit-text' && !isLeafText(el)) {
      overlay.style.display = 'none';
      highlighted = null;
      return;
    }
    highlight(el);
  }

  function startEditingText(el) {
    if (!el) return;
    editingEl = el;
    editingOriginal = (el.textContent || '').trim();
    overlay.style.display = 'none';
    el.setAttribute('data-wybitna-editing', '1');
    el.contentEditable = 'true';
    el.style.outline = '2px dashed rgba(255,255,255,0.85)';
    el.style.outlineOffset = '2px';
    el.focus();
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function commitEdit(save) {
    if (!editingEl) return;
    var el = editingEl;
    var newText = (el.textContent || '').trim();
    el.contentEditable = 'false';
    el.removeAttribute('data-wybitna-editing');
    el.style.outline = '';
    el.style.outlineOffset = '';
    editingEl = null;

    if (save && newText !== editingOriginal && editingOriginal && newText) {
      window.parent.postMessage({
        type: 'wybitna:edit-text',
        original: editingOriginal,
        next: newText,
        tagName: el.tagName.toLowerCase(),
        selector: getSelector(el),
      }, '*');
    } else {
      el.textContent = editingOriginal;
    }
    editingOriginal = '';
  }

  function onKey(e) {
    if (!editingEl) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      commitEdit(false);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitEdit(true);
    }
  }

  function onClick(e) {
    if (mode === 'off') return;
    if (editingEl) return;
    if (!highlighted) return;
    e.preventDefault();
    e.stopPropagation();

    if (mode === 'pick') {
      const selector = getSelector(highlighted);
      const html = (highlighted.outerHTML || '').slice(0, 800);
      window.parent.postMessage({
        type: 'wybitna:pick',
        selector: selector,
        html: html,
        tagName: highlighted.tagName.toLowerCase(),
      }, '*');
      pickedEl = highlighted;
      mode = 'off';
      document.body.style.cursor = '';
      highlighted = null;
      syncOverlayRect(pickedEl);
    } else if (mode === 'edit-text') {
      startEditingText(highlighted);
    }
  }

  function onBlur(e) {
    if (e.target === editingEl) commitEdit(true);
  }

  function setMode(next) {
    if (next === 'off') {
      mode = 'off';
      pickedEl = null;
      document.body.style.cursor = '';
      overlay.style.display = 'none';
      highlighted = null;
      if (editingEl) commitEdit(false);
    } else if (next === 'pick') {
      pickedEl = null;
      mode = 'pick';
      overlay.style.display = 'none';
      highlighted = null;
      document.body.style.cursor = 'crosshair';
    } else if (next === 'edit-text') {
      pickedEl = null;
      mode = 'edit-text';
      overlay.style.display = 'none';
      highlighted = null;
      document.body.style.cursor = 'crosshair';
    }
  }

  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('click', onClick, true);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('blur', onBlur, true);
  window.addEventListener('scroll', onScrollOrResize, true);
  window.addEventListener('resize', onScrollOrResize);

  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'wybitna:set-pick-mode') {
      if (e.data.active) {
        setMode('pick');
      } else {
        pickedEl = null;
        overlay.style.display = 'none';
        document.body.style.cursor = '';
        mode = 'off';
        highlighted = null;
        if (editingEl) commitEdit(false);
      }
    } else if (e.data.type === 'wybitna:set-edit-mode') {
      setMode(e.data.active ? 'edit-text' : 'off');
    }
  });
})();
`;
