(function () {
	'use strict';

	var FIRST_OPEN_MS = 3000;
	var REPEAT_OPEN_MS = 1000;
	var SEEN_KEY = 'idxListingSeen';

	function getStorageKey() {
		var id = document.body && document.body.getAttribute('data-listing-id');
		return 'idxLeadPopup_' + (id && id.length ? id : 'default');
	}

	function getFocusable(root) {
		return root.querySelectorAll(
			'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
		);
	}

	document.addEventListener('DOMContentLoaded', function () {
		document.documentElement.classList.add('js');

		var modal = document.getElementById('lead-modal');
		if (!modal) return;

		var STORAGE_KEY = getStorageKey();
		var hintEl = document.getElementById('lead-popup-hint');
		var isSearchPage = document.body.classList.contains('search-page');

		var openBtn = document.getElementById('lead-open-btn');
		var closeBtn = document.getElementById('lead-close-btn');
		var backdrop = modal.querySelector('.lead-modal__backdrop');
		var form = document.getElementById('lead-form');
		var formError = document.getElementById('lead-form-error');
		var lastFocused = null;

		function setHint(text) {
			if (hintEl) hintEl.textContent = text || '';
		}

		function openModal() {
			lastFocused = document.activeElement;
			modal.hidden = false;
			modal.classList.add('is-open');
			document.body.classList.add('lead-modal-open');
			var first = getFocusable(modal)[0];
			if (first) first.focus();
		}

		function closeModal() {
			modal.classList.remove('is-open');
			modal.hidden = true;
			document.body.classList.remove('lead-modal-open');
			if (lastFocused && typeof lastFocused.focus === 'function') {
				lastFocused.focus();
			}
		}

		function showFormError(msg) {
			if (!formError) return;
			formError.textContent = msg;
			formError.hidden = false;
		}

		function clearFormError() {
			if (!formError) return;
			formError.textContent = '';
			formError.hidden = true;
		}

		function strip(s) {
			return window.formUtils ? window.formUtils.stripNonDigits(s) : String(s || '').replace(/\D/g, '');
		}

		function validatePhone(phoneVal) {
			return strip(phoneVal).length >= 10;
		}

		function onSubmit(e) {
			e.preventDefault();
			clearFormError();
			var nameEl = form.querySelector('#lead-name');
			var emailEl = form.querySelector('#lead-email');
			var phoneEl = form.querySelector('#lead-phone');
			if (!nameEl.value.trim()) {
				showFormError('Please enter your name.');
				nameEl.focus();
				return;
			}
			if (!emailEl.value.trim() || !emailEl.validity.valid) {
				showFormError('Please enter a valid email address.');
				emailEl.focus();
				return;
			}
			if (!validatePhone(phoneEl.value)) {
				showFormError('Please enter a valid phone number (at least 10 digits).');
				phoneEl.focus();
				return;
			}

			var submitBtn = form.querySelector('#lead-submit-btn');
			if (window.formUtils) {
				window.formUtils.setSubmitState(submitBtn, 'submitting');
			} else if (submitBtn) {
				submitBtn.disabled = true; submitBtn.textContent = 'Registering...';
			}

			var fd = new FormData();
			fd.append('name', nameEl.value.trim());
			fd.append('email', emailEl.value.trim().toLowerCase());
			fd.append('phone', strip(phoneEl.value));
			var listingId = form.querySelector('[name="listingId"]');
			var market = form.querySelector('[name="market"]');
			var listingAddr = form.querySelector('[name="listingAddress"]');
			if (listingId) fd.append('listingId', listingId.value);
			if (market) fd.append('market', market.value);
			if (listingAddr) fd.append('listingAddress', listingAddr.value);

			var xhr = new XMLHttpRequest();
			xhr.open('POST', 'register-ajax.cfm', true);
			xhr.onload = function () {
				try {
					var raw = JSON.parse(xhr.responseText);
					var res = {};
					for (var k in raw) { res[k.toLowerCase()] = raw[k]; }
					if (res.ok) {
						window.location.href = res.redirect || 'search.cfm';
					} else {
						showFormError(res.error || 'Registration failed. Please try again.');
						if (window.formUtils) window.formUtils.setSubmitState(submitBtn, 'default');
						else if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Unlock This Listing'; }
					}
				} catch (err) {
					showFormError('Something went wrong. Please try again.');
					if (window.formUtils) window.formUtils.setSubmitState(submitBtn, 'default');
					else if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Unlock This Listing'; }
				}
			};
			xhr.onerror = function () {
				showFormError('Network error. Please check your connection and try again.');
				if (window.formUtils) window.formUtils.setSubmitState(submitBtn, 'default');
				else if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Unlock This Listing'; }
			};
			xhr.send(fd);
		}

		function onBackdropDismiss() {
			if (!isSearchPage) {
				window.location.href = 'search.cfm';
				return;
			}
			closeModal();
		}

		/* Expose openModal globally so search.js can call it */
		window.idxOpenLeadModal = openModal;

		if (openBtn) {
			openBtn.addEventListener('click', function () {
				openModal();
			});
		}
		if (closeBtn) {
			closeBtn.addEventListener('click', onBackdropDismiss);
		}
		if (backdrop) {
			backdrop.addEventListener('click', onBackdropDismiss);
		}
		if (form) {
			form.addEventListener('submit', onSubmit);
		}

		document.addEventListener('keydown', function (e) {
			if (!modal.classList.contains('is-open')) return;
			if (e.key === 'Escape') {
				e.preventDefault();
				onBackdropDismiss();
				return;
			}
			if (e.key !== 'Tab') return;
			var nodes = getFocusable(modal);
			if (!nodes.length) return;
			var list = Array.prototype.slice.call(nodes);
			var first = list[0];
			var last = list[list.length - 1];
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		});

		if (window.formUtils) {
			window.formUtils.bindPhoneFields();
			window.formUtils.bindClearOnInput();
		}

		if (!isSearchPage) {
			checkAuthAndGate(false);

			window.addEventListener('pageshow', function (e) {
				if (e.persisted && !isSearchPage) checkAuthAndGate(true);
			});
		}

		function checkAuthAndGate(fromBfcache) {
			var xhr = new XMLHttpRequest();
			xhr.open('GET', 'auth-status.cfm?_=' + Date.now(), true);
			xhr.onload = function () {
				if (xhr.status === 200) {
					try {
						var raw = JSON.parse(xhr.responseText);
						var data = {};
						for (var k in raw) { data[k.toLowerCase()] = raw[k]; }
						var csrf = document.getElementById('lead-csrf');
						if (csrf && data.csrf) csrf.value = data.csrf;
						var slot = document.getElementById('ha-auth-slot');
						if (slot && data.loggedin && data.email) {
							slot.innerHTML = '<span class="ha-nav-user">'
								+ '<svg viewBox="0 0 24 24" width="20" height="20" fill="#1a73e8" style="vertical-align:middle;margin-right:4px;"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 3v1h16v-1s-2-3-8-3z"/></svg>'
								+ '<strong>' + data.email.replace(/</g, '&lt;') + '</strong>'
								+ '</span> <a href="logout.cfm" class="ha-nav-logout">Log out</a>';
						}
						if (data.loggedin) return;
					} catch (e) {}
				}
				triggerGate(fromBfcache);
			};
			xhr.onerror = function () {
				triggerGate(fromBfcache);
			};
			xhr.send();
		}

		function triggerGate(fromBfcache) {
			if (fromBfcache) {
				openModal();
				return;
			}
			var seen = false;
			try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch(e){}
			var delay = seen ? REPEAT_OPEN_MS : FIRST_OPEN_MS;
			try { sessionStorage.setItem(SEEN_KEY, '1'); } catch(e){}
			setTimeout(function () { openModal(); }, delay);
		}
	});
})();
