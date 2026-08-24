(function () {
  'use strict';

  var button = document.querySelector('.dropdown-button');
  var menu = document.getElementById('language-selector');

  if (!button || !menu) return;

  function setOpen(open) {
    menu.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
  }

  function isOpen() {
    return button.getAttribute('aria-expanded') === 'true';
  }

  button.addEventListener('click', function (event) {
    event.stopPropagation();
    setOpen(!isOpen());
  });

  document.addEventListener('click', function (event) {
    if (isOpen() && !menu.contains(event.target) && event.target !== button) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      button.focus();
    }
  });

  // --- Theme toggle -------------------------------------------------------
  // No stored value means "follow the system", which is the default state.
  // Clicking always sets an explicit choice, computed from what is actually
  // showing rather than from a variable that could drift out of step.
  var toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;

  function currentTheme() {
    var set = document.documentElement.dataset.theme;
    if (set === 'dark' || set === 'light') return set;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  toggle.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch (e) {}
  });

  // If the reader has not chosen, keep following the system as it changes.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener(
    'change',
    function () {
      try {
        if (!localStorage.getItem('theme')) {
          delete document.documentElement.dataset.theme;
        }
      } catch (e) {}
    }
  );
})();
