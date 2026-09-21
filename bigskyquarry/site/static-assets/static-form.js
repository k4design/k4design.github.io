/*
 * Big Sky Quarry - static form handler
 * -----------------------------------------------------------------------------
 * The original site submitted this form through Gravity Forms (WordPress).
 * A static site has no WordPress, and the Gravity Forms security tokens baked
 * into this page are single-use, so the original submission path cannot work.
 *
 * TO GO LIVE: set FORM_ENDPOINT below to a form backend that accepts a POST of
 * multipart/form-data and returns 2xx. Examples:
 *     Formspree : https://formspree.io/f/xxxxxxxx
 *     Basin     : https://usebasin.com/f/xxxxxxxx
 *     Netlify   : leave "" and add netlify/data-netlify attrs instead
 *
 * Until it is set, the form refuses to submit and tells the visitor to email
 * instead. That is deliberate: silently accepting a lead and dropping it is
 * worse than not accepting it.
 */
var FORM_ENDPOINT = "";                     // <-- set me
var FALLBACK_EMAIL = "info@bigskyquarry.com";

(function () {
  "use strict";

  function notice(form, msg, ok) {
    var el = form.parentNode.querySelector(".bsq-static-notice");
    if (!el) {
      el = document.createElement("div");
      el.className = "bsq-static-notice";
      el.setAttribute("role", "status");
      el.style.cssText =
        "margin:1rem 0;padding:1rem 1.25rem;border-radius:4px;font-size:.95rem;line-height:1.5;" +
        "border:1px solid " + (ok ? "#3c6e47" : "#8a4b3a") + ";" +
        "background:" + (ok ? "rgba(60,110,71,.10)" : "rgba(138,75,58,.10)") + ";" +
        "color:inherit;";
      form.parentNode.insertBefore(el, form);
    }
    el.innerHTML = msg;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function init(form) {
    if (form.dataset.bsqStatic) return;
    form.dataset.bsqStatic = "1";

    // Detach Gravity Forms' AJAX-to-iframe plumbing, which cannot work here.
    form.removeAttribute("target");
    var frame = document.getElementById("gform_ajax_frame_1");
    if (frame && frame.parentNode) frame.parentNode.removeChild(frame);

    // Gravity Forms' button calls form.submit() natively, which never fires a
    // "submit" event -- so intercept the click too, and neuter form.submit().
    form.submit = function () { send(); };

    var buttons = form.querySelectorAll(
      "[data-submission-type='submit'], input[type='submit'], button[type='submit']"
    );
    for (var b = 0; b < buttons.length; b++) {
      buttons[b].removeAttribute("onclick");
      buttons[b].addEventListener("click", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        send();
      }, true);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      send();
    }, true);

    function send() {
      if (form.dataset.bsqSending) return;

      if (!FORM_ENDPOINT) {
        notice(
          form,
          "<strong>This form isn’t connected yet.</strong><br>Please email " +
            '<a href="mailto:' + FALLBACK_EMAIL + '">' + FALLBACK_EMAIL + "</a> " +
            "and we’ll be in touch.",
          false
        );
        return;
      }

      if (!form.reportValidity || form.reportValidity()) { /* keep native validation */ } else { return; }

      form.dataset.bsqSending = "1";
      var data = new FormData(form);
      // Drop Gravity Forms' internal state; it means nothing to a new backend.
      ["gform_ajax","gform_currency","gform_field_values","gform_target_page_number_1",
       "gform_source_page_number_1","state_1","is_submit_1","gform_submit",
       "gform_unique_id","gform_uploaded_files","gform_theme_config"
      ].forEach(function (k) { data.delete(k); });

      var btn = form.querySelector('input[type="submit"], button[type="submit"]');
      var label = btn && (btn.value || btn.textContent);
      if (btn) { btn.disabled = true; if ("value" in btn) btn.value = "Sending…"; }

      fetch(FORM_ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" } })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          form.style.display = "none";
          notice(form, "<strong>Thank you.</strong><br>Your information has been received.", true);
        })
        .catch(function () {
          delete form.dataset.bsqSending;
          if (btn) { btn.disabled = false; if ("value" in btn) btn.value = label; }
          notice(
            form,
            "<strong>Sorry — that didn’t send.</strong><br>Please email " +
              '<a href="mailto:' + FALLBACK_EMAIL + '">' + FALLBACK_EMAIL + "</a>.",
            false
          );
        });
    }
  }

  function boot() {
    var forms = document.querySelectorAll("form[id^='gform_']");
    for (var i = 0; i < forms.length; i++) init(forms[i]);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
