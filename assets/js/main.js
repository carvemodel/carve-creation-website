// Carve Creation — shared site behavior

document.addEventListener('DOMContentLoaded', function () {
  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? '✕' : '☰';
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.textContent = '☰';
      });
    });
  }

  // Accordion (FAQ-style)
  document.querySelectorAll('.accordion-item .q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.accordion-item');
      var wasOpen = item.classList.contains('open');
      // close siblings within the same group
      var group = item.closest('.accordion-group');
      if (group) {
        group.querySelectorAll('.accordion-item.open').forEach(function (openItem) {
          if (openItem !== item) {
            openItem.classList.remove('open');
            var openPlus = openItem.querySelector('.q .plus');
            if (openPlus) openPlus.textContent = '+';
          }
        });
      }
      item.classList.toggle('open', !wasOpen);
      var plus = btn.querySelector('.plus');
      if (plus) plus.textContent = !wasOpen ? '−' : '+';
    });
  });

  // Deep-link into a specific delivery stage (e.g. how-we-work.html#stage-3):
  // open its accordion panel and scroll it into view.
  function openStageFromHash() {
    if (!location.hash) return;
    var target = document.querySelector(location.hash);
    if (!target || !target.classList.contains('accordion-item')) return;
    var group = target.closest('.accordion-group');
    if (group) {
      group.querySelectorAll('.accordion-item.open').forEach(function (openItem) {
        if (openItem !== target) {
          openItem.classList.remove('open');
          var openPlus = openItem.querySelector('.q .plus');
          if (openPlus) openPlus.textContent = '+';
        }
      });
    }
    target.classList.add('open');
    var plus = target.querySelector('.q .plus');
    if (plus) plus.textContent = '−';
    setTimeout(function () {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }
  openStageFromHash();
  window.addEventListener('hashchange', openStageFromHash);

  // Demo form handling: prevent real submission, show confirmation message
  document.querySelectorAll('form[data-demo-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var confirmation = document.querySelector(form.dataset.demoForm);
      if (confirmation) {
        confirmation.classList.add('show');
        confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  // Footer year
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Sticky header shadow on scroll
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.style.boxShadow = window.scrollY > 8 ? '0 6px 24px rgba(0,0,0,.25)' : 'none';
    };
    document.addEventListener('scroll', onScroll);
    onScroll();
  }
});
