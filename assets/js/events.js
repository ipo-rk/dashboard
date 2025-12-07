// Convert remaining inline `onclick` attributes into event listeners.
// This file removes the inline `onclick` attribute at runtime and attaches
// an equivalent listener so the behavior comes from this external file.
(function () {
  function bindInlineOnclicks() {
    document.querySelectorAll('[onclick]').forEach(function (el) {
      var code = el.getAttribute('onclick');
      if (!code) return;
      // Remove the inline attribute so markup is clean.
      el.removeAttribute('onclick');

      try {
        // Simple parser: if the code is a single function call like foo(1,'a')
        // extract the function name and args and call the global function.
        var m = code.trim().match(/^([a-zA-Z_$][\w$]*)\s*\((.*)\)\s*;?$/);
        if (m) {
          var fnName = m[1];
          var args = m[2].trim();
          el.addEventListener('click', function (event) {
            try {
              var fn = window[fnName];
              if (typeof fn === 'function') {
                if (args === '') return fn.call(this, event);
                // Parse args using Function to evaluate argument expressions in global scope.
                var parsed = new Function('return [' + args + '];')();
                return fn.apply(this, parsed);
              }
            } catch (err) {
              // fallback to executing the code string in a Function
              try { new Function('event', code).call(this, event); } catch (e) { console.error(e); }
            }
          });
        } else {
          // Fallback: create a listener that executes the inline code.
          var listener = new Function('event', 'return (function(event){' + code + '}).call(this,event);');
          el.addEventListener('click', listener);
        }
      } catch (ex) {
        console.error('events.js: failed binding onclick for element', el, ex);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindInlineOnclicks);
  } else {
    bindInlineOnclicks();
  }
})();
