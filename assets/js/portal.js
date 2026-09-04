// Carve Creation Portal — lightweight UI interactions (static prototype, no backend).
document.addEventListener('DOMContentLoaded', function () {
  // Password show/hide toggles
  document.querySelectorAll('[data-toggle-password]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.getAttribute('data-toggle-password'));
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  // Mobile sidebar toggle
  var sidebarToggle = document.querySelector('[data-sidebar-toggle]');
  var sidebar = document.querySelector('.p-sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function () {
      sidebar.classList.toggle('is-open');
    });
  }

  // Simple dropdown menus (avatar, filter, sort)
  document.querySelectorAll('[data-dropdown-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var menu = document.getElementById(btn.getAttribute('data-dropdown-toggle'));
      if (!menu) return;
      var isOpen = menu.classList.contains('is-open');
      document.querySelectorAll('.p-dropdown-menu.is-open').forEach(function (m) { m.classList.remove('is-open'); });
      if (!isOpen) menu.classList.add('is-open');
    });
  });
  document.addEventListener('click', function () {
    document.querySelectorAll('.p-dropdown-menu.is-open').forEach(function (m) { m.classList.remove('is-open'); });
  });

  // Checkbox toggle visuals (static demo only)
  document.querySelectorAll('.p-checkbox[data-toggle]').forEach(function (box) {
    box.addEventListener('click', function () {
      box.classList.toggle('is-checked');
    });
  });
});
