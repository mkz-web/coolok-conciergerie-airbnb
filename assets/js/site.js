/* Coolok : script du site. Aucune dépendance. Progressive enhancement : tout fonctionne sans lui sauf le simulateur interactif. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Menu mobile
  var toggle = $('.nav-toggle');
  var panel = $('#menu-principal');
  if (toggle && panel) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      panel.classList.toggle('is-open', !open);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) { toggle.click(); toggle.focus(); } });
  }

  // Formulaires : envoi en JSON avec repli sur l'envoi natif
  function serialize(form) {
    var data = {};
    $$('input,select,textarea', form).forEach(function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') data[el.name] = el.checked ? 'oui' : '';
      else data[el.name] = el.value;
    });
    data.url = location.href;
    data.referrer = document.referrer || '';
    return data;
  }
  function showError(form, msg) {
    var p = $('.form-error', form);
    if (!p) { p = document.createElement('p'); p.className = 'form-error'; p.setAttribute('role', 'alert'); form.appendChild(p); }
    p.textContent = msg;
  }
  $$('form.lead-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!form.checkValidity()) { form.reportValidity(); e.preventDefault(); return; }
      if (!window.fetch) return; // envoi natif
      e.preventDefault();
      var btn = $('button[type="submit"]', form);
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Envoi en cours…'; }
      fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(serialize(form)) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && res.j && res.j.redirect) { location.href = res.j.redirect; return; }
          throw new Error((res.j && res.j.error) || 'Envoi impossible');
        })
        .catch(function (err) {
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
          showError(form, 'Désolé, l\'envoi a échoué (' + err.message + '). Vous pouvez nous écrire sur WhatsApp ou réessayer.');
        });
    });
  });

  // Simulateur
  var sim = $('#simulateur');
  if (sim) {
    var communes = [];
    try { communes = JSON.parse(sim.getAttribute('data-communes') || '[]'); } catch (e) { communes = []; }
    var form = $('form', sim);
    var steps = $$('.sim-step', sim);
    var progress = $$('.sim-progress li', sim);
    var select = $('select[name="commune"]', form);
    var autre = $('.sim-autre', form);
    function go(n) {
      steps.forEach(function (s) { s.hidden = s.getAttribute('data-step') !== String(n); });
      progress.forEach(function (p) {
        var k = Number(p.getAttribute('data-step'));
        p.classList.toggle('is-active', k === n);
        p.classList.toggle('is-done', k < n);
      });
      var top = sim.getBoundingClientRect().top + window.pageYOffset - 90;
      if (window.pageYOffset > top) window.scrollTo({ top: top, behavior: 'smooth' });
      var first = $('input:not([type=hidden]),select,textarea', steps[n - 1]);
      if (first && n !== 2) first.focus({ preventScroll: true });
    }
    function range(s) {
      var m = String(s || '').replace(/\s/g, '').match(/(\d+)[^\d]+(\d+)/);
      return m ? [Number(m[1]), Number(m[2])] : null;
    }
    function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
    function estimate() {
      var slug = select.value;
      var c = null;
      for (var i = 0; i < communes.length; i++) if (communes[i].s === slug) c = communes[i];
      var out = function (k, v) { var el = $('[data-out="' + k + '"]', sim); if (el) el.textContent = v; };
      var chambres = Number($('select[name="chambres"]', form).value);
      var type = $('select[name="type_bien"]', form).value;
      var hint = '';
      if (!c) {
        out('commune', autre && !autre.hidden ? ($('input[name="commune_autre"]', form).value || 'votre commune') : 'votre commune');
        out('revenu', 'Estimation sur audit');
        out('prix', 'à établir');
        out('occ', 'à établir');
        hint = 'Nous n\'avons pas encore publié de fourchette pour cette commune : Thierry vous fait l\'estimation lui-même sous 48 h.';
        out('hint', hint);
        out('source', '');
        $('input[name="estimation"]', form).value = 'hors base';
        return;
      }
      var r = range(c.r);
      out('commune', c.n);
      out('revenu', r ? 'de ' + fmt(r[0]) + ' à ' + fmt(r[1]) + ' € par mois' : c.r);
      out('prix', c.p || 'n.c.');
      out('occ', c.o || 'n.c.');
      if (chambres >= 3 || type === 'maison') hint = 'Un logement de cette taille se situe le plus souvent dans le haut de la fourchette, parfois au-delà lorsque la demande familiale est forte.';
      else if (chambres === 0) hint = 'Un studio se situe le plus souvent dans le bas de la fourchette, avec un taux d\'occupation élevé.';
      else hint = 'Un logement d\'une ou deux chambres se situe le plus souvent au milieu de la fourchette.';
      out('hint', hint);
      out('source', 'Fourchettes observées par Coolok sur les logements entiers de ' + c.n + ' (données de marché AirDNA croisées avec les plateformes, mise à jour 2026). Estimation indicative, hors charges et commission.');
      $('input[name="estimation"]', form).value = c.n + ' : ' + (c.r || '') + ' (' + type + ', ' + chambres + ' ch.)';
    }
    if (select && autre) select.addEventListener('change', function () { autre.hidden = select.value !== 'autre'; });
    $$('[data-next]', form).forEach(function (b) {
      b.addEventListener('click', function () {
        var n = Number(b.getAttribute('data-next'));
        var cur = steps[n - 2];
        var ok = true;
        $$('input,select,textarea', cur).forEach(function (el) { if (!el.checkValidity()) { ok = false; el.reportValidity(); } });
        if (!ok) return;
        if (n === 2) estimate();
        go(n);
      });
    });
    $$('[data-prev]', form).forEach(function (b) { b.addEventListener('click', function () { go(Number(b.getAttribute('data-prev'))); }); });
    form.addEventListener('submit', function (e) {
      var s3 = steps[2];
      var ok = true;
      $$('input,select,textarea', s3).forEach(function (el) { if (!el.checkValidity()) { ok = false; el.reportValidity(); } });
      if (!ok) e.preventDefault();
    }, true);
  }

  // Liens sortants : rel noopener
  $$('a[target="_blank"]').forEach(function (a) { if (!/noopener/.test(a.rel)) a.rel = (a.rel + ' noopener').trim(); });
})();
