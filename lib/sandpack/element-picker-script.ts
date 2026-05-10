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

  let active = false;
  let highlighted = null;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #e8dcc4;background:rgba(232,220,196,0.1);z-index:2147483647;transition:all 0.05s';
  overlay.style.display = 'none';
  document.body.appendChild(overlay);

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

  function highlight(el) {
    if (!el) { overlay.style.display = 'none'; return; }
    const r = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = r.top + 'px';
    overlay.style.left = r.left + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
    highlighted = el;
  }

  function onMove(e) {
    if (!active) return;
    const el = e.target;
    if (el !== overlay) highlight(el);
  }

  function onClick(e) {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    if (!highlighted) return;
    const selector = getSelector(highlighted);
    const html = (highlighted.outerHTML || '').slice(0, 800);
    window.parent.postMessage({
      type: 'wybitna:pick',
      selector: selector,
      html: html,
      tagName: highlighted.tagName.toLowerCase(),
    }, '*');
    setActive(false);
  }

  function setActive(v) {
    active = v;
    overlay.style.display = v ? 'block' : 'none';
    document.body.style.cursor = v ? 'crosshair' : '';
  }

  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('click', onClick, true);

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'wybitna:set-pick-mode') {
      setActive(!!e.data.active);
    }
  });
})();
`;
