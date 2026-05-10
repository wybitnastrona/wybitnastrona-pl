/**
 * Skrypt wstrzykiwany do iframe Sandpack/WC ktory przechwytuje:
 *  - window.onerror
 *  - unhandledrejection
 *  - console.error
 * i przesyla je do parenta przez postMessage.
 *
 * Parent renderuje banner "Napraw przez AI" gdy wystapi blad.
 */

export const ERROR_LISTENER_SCRIPT = `
(function() {
  if (window.__wybitnaErrorListener) return;
  window.__wybitnaErrorListener = true;

  function send(payload) {
    try {
      window.parent.postMessage({ type: 'wybitna:error', ...payload }, '*');
    } catch (e) { /* ignore */ }
  }

  window.addEventListener('error', function(e) {
    send({
      kind: 'error',
      message: e.message,
      stack: e.error && e.error.stack ? e.error.stack.slice(0, 1500) : null,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
    });
  });

  window.addEventListener('unhandledrejection', function(e) {
    var reason = e.reason;
    send({
      kind: 'rejection',
      message: reason && reason.message ? reason.message : String(reason),
      stack: reason && reason.stack ? reason.stack.slice(0, 1500) : null,
    });
  });

  var origConsoleError = console.error;
  console.error = function() {
    try {
      var msg = Array.from(arguments).map(function(a) {
        if (a instanceof Error) return a.stack || a.message;
        if (typeof a === 'object') { try { return JSON.stringify(a); } catch (e) { return String(a); } }
        return String(a);
      }).join(' ');
      send({ kind: 'console', message: msg.slice(0, 1500) });
    } catch (e) { /* ignore */ }
    origConsoleError.apply(console, arguments);
  };
})();
`;
