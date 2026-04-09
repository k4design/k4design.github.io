(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		var modal = document.getElementById('login-modal');
		if (!modal) return;

		var openBtn = document.getElementById('login-open-btn');
		var closeBtn = document.getElementById('login-close-btn');
		var backdrop = document.getElementById('login-backdrop');
		var form = document.getElementById('login-form');
		var formError = document.getElementById('login-form-error');

		function openModal() {
			modal.hidden = false;
			document.body.classList.add('lead-modal-open');
			var first = modal.querySelector('input:not([type="hidden"])');
			if (first) first.focus();
		}

		function closeModal() {
			modal.hidden = true;
			document.body.classList.remove('lead-modal-open');
		}

		function showError(msg) {
			if (!formError) return;
			formError.textContent = msg;
			formError.hidden = false;
		}

		function clearError() {
			if (!formError) return;
			formError.textContent = '';
			formError.hidden = true;
		}

		window.idxOpenLoginModal = openModal;

		if (openBtn) openBtn.addEventListener('click', openModal);
		if (closeBtn) closeBtn.addEventListener('click', closeModal);
		if (backdrop) backdrop.addEventListener('click', closeModal);

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && !modal.hidden) closeModal();
		});

		if (form) {
			form.addEventListener('submit', function (e) {
				clearError();
				var email = form.querySelector('#login-email');
				var phone = form.querySelector('#login-phone');
				if (!email.value.trim() || !email.validity.valid) {
					e.preventDefault();
					showError('Please enter a valid email address.');
					email.focus();
					return;
				}
				var digits = phone.value.replace(/\D/g, '');
				if (digits.length < 10) {
					e.preventDefault();
					showError('Please enter a valid phone number (at least 10 digits).');
					phone.focus();
					return;
				}
			});
		}
	});
})();
