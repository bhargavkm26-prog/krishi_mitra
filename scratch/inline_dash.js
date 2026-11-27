
    (function () {
      'use strict';

      if (localStorage.getItem('krishi_theme') === 'light') {
        document.getElementById('htmlRoot').classList.add('lm');
      }

      document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.demo-id-chip').forEach(function (chip) {
          chip.addEventListener('click', function () {
            var id = chip.getAttribute('data-id');
            var idInput = document.getElementById('login-phone');
            var passInput = document.getElementById('login-password');
            if (idInput) idInput.value = id;
            if (passInput) passInput.value = id;
            if (idInput) idInput.focus();
          });
        });

        var eyeBtn = document.getElementById('btn-toggle-password');
        var passInput = document.getElementById('login-password');
        if (eyeBtn && passInput) {
          eyeBtn.addEventListener('click', function () {
            var icon = eyeBtn.querySelector('i');
            if (passInput.type === 'password') {
              passInput.type = 'text';
              if (icon) icon.className = 'fa-solid fa-eye-slash';
            } else {
              passInput.type = 'password';
              if (icon) icon.className = 'fa-solid fa-eye';
            }
          });
        }

        document.addEventListener('mousemove', function (e) {
          var card = e.target.closest('.gc, .scheme-card, .doc-guide-card, .tip-full-card, .help-card');
          if (!card) return;
          var rect = card.getBoundingClientRect();
          card.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
          card.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
        });
      });
    })();
  