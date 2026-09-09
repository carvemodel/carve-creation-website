// Carve Creation Portal — UI interactions, plus real sign-in/sign-out
// against /api/auth/*. Page access itself is enforced server-side by
// /middleware.js; the code below only handles the login form and the
// "Log out" links that appear in the account menu on every portal page.
document.addEventListener('DOMContentLoaded', function () {
  // Login form
  var loginForm = document.getElementById('portal-login-form');
  if (loginForm) {
    var loginError = document.getElementById('portal-login-error');
    var loginSubmitBtn = loginForm.querySelector('button[type="submit"]');

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (loginError) { loginError.style.display = 'none'; loginError.textContent = ''; }
      if (loginSubmitBtn) { loginSubmitBtn.disabled = true; loginSubmitBtn.textContent = 'Signing In…'; }

      var email = document.getElementById('email').value.trim();
      var password = document.getElementById('password').value;

      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      })
        .then(function (res) {
          return res.json().then(function (data) { return { ok: res.ok, data: data }; });
        })
        .then(function (result) {
          if (!result.ok) {
            throw new Error(result.data && result.data.error ? result.data.error : 'Invalid email or password.');
          }
          var params = new URLSearchParams(window.location.search);
          var next = params.get('next');
          window.location.href = next && next.indexOf('/portal-') === 0 ? next : 'portal-overview.html';
        })
        .catch(function (err) {
          if (loginError) {
            loginError.textContent = err.message || 'Something went wrong. Please try again.';
            loginError.style.display = 'block';
          }
          if (loginSubmitBtn) { loginSubmitBtn.disabled = false; loginSubmitBtn.textContent = 'Log In'; }
        });
    });
  }

  // Logout links (the "Log out" item in each portal page's account menu)
  document.querySelectorAll('#portal-logout-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      fetch('/api/auth/logout', { method: 'POST' }).finally(function () {
        window.location.href = 'portal-login.html';
      });
    });
  });


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
