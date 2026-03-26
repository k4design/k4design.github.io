/* form-utils.js — Shared form utilities for search, registration, and login forms */
(function () {
  'use strict';

  /* ── Phone formatter ─────────────────────────────────────────────── */

  function formatPhone(input) {
    var digits = input.value.replace(/\D/g, '');
    if (digits.length > 10 && digits.charAt(0) === '1') {
      digits = digits.substring(1);
    }
    digits = digits.substring(0, 10);

    var formatted = '';
    if (digits.length > 0) formatted = '(' + digits.substring(0, 3);
    if (digits.length >= 3) formatted += ') ' + digits.substring(3, 6);
    if (digits.length >= 6) formatted += '-' + digits.substring(6, 10);

    input.value = formatted;
  }

  /* ── Price formatter (comma grouping) ────────────────────────────── */

  function formatPrice(input) {
    var digits = input.value.replace(/\D/g, '');
    if (digits.length > 0) {
      input.value = parseInt(digits, 10).toLocaleString('en-US');
    } else {
      input.value = '';
    }
  }

  /* ── Number formatter (comma grouping for sqft etc.) ─────────────── */

  function formatNumber(input) {
    var digits = input.value.replace(/\D/g, '');
    if (digits.length > 0) {
      input.value = parseInt(digits, 10).toLocaleString('en-US');
    } else {
      input.value = '';
    }
  }

  /* ── Strip non-digits (for form submission) ──────────────────────── */

  function stripNonDigits(value) {
    return (value || '').replace(/\D/g, '');
  }

  /* ── Field error display ─────────────────────────────────────────── */

  function showFieldError(field, message) {
    var hint = field.parentNode.querySelector('.field-hint');
    if (!hint) return;
    hint.textContent = message;
    hint.classList.add('field-error');
  }

  function clearFieldError(field) {
    var hint = field.parentNode.querySelector('.field-hint');
    if (!hint) return;
    hint.classList.remove('field-error');
    var original = hint.getAttribute('data-hint');
    hint.textContent = original || '';
  }

  /* ── Submit button state management ──────────────────────────────── */

  function setSubmitState(button, state) {
    if (!button) return;
    if (state === 'submitting') {
      button._origText = button._origText || button.textContent;
      button.textContent = button.getAttribute('data-loading-text') || 'Loading…';
      button.disabled = true;
      button.classList.add('btn--submitting');
    } else {
      button.textContent = button._origText || button.textContent;
      button.disabled = false;
      button.classList.remove('btn--submitting');
    }
  }

  /* ── Auto-bind helpers ───────────────────────────────────────────── */

  function bindFormatter(selector, formatter) {
    var inputs = document.querySelectorAll(selector);
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener('input', function () { formatter(this); });
      inputs[i].addEventListener('change', function () { formatter(this); });
    }
  }

  function bindPhoneFields() {
    bindFormatter('input[data-format="phone"]', formatPhone);
  }

  function bindPriceFields() {
    bindFormatter('input[data-format="price"]', formatPrice);
  }

  function bindNumberFields() {
    bindFormatter('input[data-format="number"]', formatNumber);
  }

  function formatProperCase(el) {
    var v = el.value;
    if (!v) return;
    el.value = v.replace(/\w\S*/g, function(w) {
      return w.charAt(0).toUpperCase() + w.substr(1).toLowerCase();
    });
  }

  function bindProperCaseFields() {
    var inputs = document.querySelectorAll('input[data-format="propercase"]');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener('blur', function () { formatProperCase(this); });
      inputs[i].addEventListener('change', function () { formatProperCase(this); });
    }
  }

  function bindClearOnInput() {
    var fields = document.querySelectorAll('.form-field input, .lead-field input');
    for (var i = 0; i < fields.length; i++) {
      fields[i].addEventListener('input', function () { clearFieldError(this); });
    }
  }

  /* ── Expose globally ─────────────────────────────────────────────── */

  window.formUtils = {
    formatPhone: formatPhone,
    formatPrice: formatPrice,
    formatNumber: formatNumber,
    stripNonDigits: stripNonDigits,
    showFieldError: showFieldError,
    clearFieldError: clearFieldError,
    setSubmitState: setSubmitState,
    bindPhoneFields: bindPhoneFields,
    bindPriceFields: bindPriceFields,
    bindNumberFields: bindNumberFields,
    bindClearOnInput: bindClearOnInput,
    bindFormatter: bindFormatter,
    formatProperCase: formatProperCase,
    bindProperCaseFields: bindProperCaseFields
  };
})();
