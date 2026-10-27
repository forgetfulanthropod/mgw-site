/* Moore's Groundworks — draft client-side behavior.
 * The estimate form validates locally, shows a success state, and opens a
 * prefilled mailto: to Charlie so the flow can be tested before a backend exists.
 */
(function () {
  'use strict';

  var TEST_EMAIL = 'cmiles@rcldesignbuild.com';

  // ---------------------------------------------------------------------------
  // INTEGRATION POINT (later): set this to the real endpoint once chosen, e.g.
  //   - Quo (OpenPhone) / Zapier / Make webhook URL
  //   - Twilio Function or Studio Flow REST trigger (https://<service>.twil.io/estimate)
  //   - A small serverless function (Cloudflare Worker / Netlify Function)
  // The endpoint should: store the lead, email Charlie with [Text them] /
  // [Call them back] links, and optionally auto-text the customer a confirmation.
  // Leave null in the draft to use mailto-only test mode.
  // ---------------------------------------------------------------------------
  var LEAD_WEBHOOK_URL = null;
  window.MGW = { buildMailto: function (d) { return buildMailto(d); } };

  var form = document.getElementById('estimate-form');
  var success = document.getElementById('form-success');
  var mailtoLink = document.getElementById('mailto-link');
  var resetBtn = document.getElementById('form-reset');
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  if (!form) return;

  var required = [
    { id: 'f-name', test: function (v) { return v.trim().length > 1; } },
    { id: 'f-phone', test: function (v) { return v.replace(/\D/g, '').length >= 10; } },
    { id: 'f-address', test: function (v) { return v.trim().length > 4; } }
  ];

  function setError(input, show) {
    var err = document.getElementById(input.id + '-err');
    input.setAttribute('aria-invalid', show ? 'true' : 'false');
    if (err) {
      err.hidden = !show;
      if (show) input.setAttribute('aria-describedby', err.id);
      else input.removeAttribute('aria-describedby');
    }
  }

  function validate() {
    var firstBad = null;
    required.forEach(function (r) {
      var el = document.getElementById(r.id);
      var ok = r.test(el.value);
      setError(el, !ok);
      if (!ok && !firstBad) firstBad = el;
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  required.forEach(function (r) {
    var el = document.getElementById(r.id);
    el.addEventListener('blur', function () {
      if (el.getAttribute('aria-invalid') === 'true') setError(el, !r.test(el.value));
    });
  });

  function collect() {
    var fd = new FormData(form);
    return {
      name: (fd.get('name') || '').trim(),
      phone: (fd.get('phone') || '').trim(),
      address: (fd.get('address') || '').trim(),
      services: fd.getAll('services[]').join(', ') || '(not picked)',
      timeline: fd.get('timeline') || '',
      notes: (fd.get('notes') || '').trim(),
      submittedAt: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET',
      source: 'mgw.builders estimate form (draft)'
    };
  }

  function buildMailto(d) {
    var digits = d.phone.replace(/\D/g, '');
    var subject = 'MGW estimate request: ' + d.services + ' - ' + d.address;
    var body = [
      'New estimate request from the MGW website (DRAFT TEST)',
      '',
      'Name: ' + d.name,
      'Phone: ' + d.phone,
      'Job address: ' + d.address,
      'Services: ' + d.services,
      'Timeline: ' + d.timeline,
      'Notes: ' + (d.notes || '(none)'),
      '',
      'Text them: sms:+1' + digits.slice(-10),
      'Call them: tel:+1' + digits.slice(-10),
      'Map: https://maps.google.com/?q=' + encodeURIComponent(d.address),
      '',
      'Submitted: ' + d.submittedAt
    ].join('\n');
    return 'mailto:' + TEST_EMAIL +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  function sendToWebhook(d) {
    // Plug-in point for the real backend (see LEAD_WEBHOOK_URL above).
    if (!LEAD_WEBHOOK_URL) return Promise.resolve();
    return fetch(LEAD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    }).catch(function () { /* fall back to mailto silently in draft */ });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;
    var d = collect();
    var href = buildMailto(d);

    sendToWebhook(d).then(function () {
      document.getElementById('success-phone').textContent = d.phone;
      document.getElementById('success-address').textContent = d.address;
      mailtoLink.href = href;
      form.hidden = true;
      success.hidden = false;
      success.focus();
      // Draft test mode: open the user's email client with the filled request.
      window.location.href = href;
    });
  });

  resetBtn.addEventListener('click', function () {
    form.reset();
    success.hidden = true;
    form.hidden = false;
    document.getElementById('f-name').focus();
  });

  // Placeholder phone guard: warn testers that tel:/sms: links are not live yet.
  var PHONE_IS_PLACEHOLDER = true; // set false once the real number is in index.html
  if (PHONE_IS_PLACEHOLDER) {
    document.querySelectorAll('[data-placeholder-phone]').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        alert('Draft: the MGW business phone number is not set up yet (placeholder (859) XXX-XXXX). Use the estimate form to test.');
      });
    });
  }
})();
