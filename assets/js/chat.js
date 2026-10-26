/* Coolok : assistant du site (prototype du 26/10/2026). Aucune dépendance.
   Crée sa propre interface, envoie les questions à /api/chat et les demandes de rappel à /api/lead (même circuit que le
   formulaire de contact : table Softr, e-mail à Thierry, page /merci-contact). La conversation ne vit qu'en mémoire :
   rien n'est écrit sur l'appareil du visiteur, rien n'est conservé après la fermeture de la page. */
(function () {
  'use strict';
  var script = document.currentScript || document.querySelector('script[data-chat]');
  if (!script || !window.fetch || !document.body) return;
  var t0 = Date.now();
  var cfg = {
    titre: script.getAttribute('data-titre') || 'Assistant Coolok',
    accueil: script.getAttribute('data-accueil') || '',
    mention: script.getAttribute('data-mention') || '',
    whatsapp: script.getAttribute('data-whatsapp') || '',
    telephone: script.getAttribute('data-telephone') || '',
    telephoneRaw: script.getAttribute('data-telephone-raw') || '',
    prenom: script.getAttribute('data-prenom') || 'Thierry',
    suggestions: []
  };
  try { cfg.suggestions = JSON.parse(script.getAttribute('data-suggestions') || '[]'); } catch (e) { cfg.suggestions = []; }

  var MAX_QUESTION = 600;
  var historique = []; // { role: 'user' | 'assistant', content }
  var enCours = false;
  var reponses = 0;
  var rappelPropose = false;

  function el(tag, attrs, enfants) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k) || attrs[k] == null || attrs[k] === false) continue;
      if (k === 'texte') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    (enfants || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  var ICONES = {
    bulle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 6v2h2V9H7zm4 0v2h2V9h-2zm4 0v2h2V9h-2z"/></svg>',
    fermer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4-6.3-6.3-6.3 6.3-1.4-1.4L9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z"/></svg>',
    envoyer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z"/></svg>'
  };
  function signaler(nom) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: nom });
    if (typeof window.gtag === 'function') window.gtag('event', nom);
  }

  // ---------- Interface
  var lanceur = el('button', { type: 'button', 'class': 'chat-lanceur', 'aria-expanded': 'false', 'aria-controls': 'chat-panneau', html: ICONES.bulle }, [el('span', { 'class': 'chat-lanceur-texte', texte: 'Une question ?' })]);
  var titre = el('h2', { id: 'chat-titre', 'class': 'chat-titre' }, [cfg.titre + ' ', el('span', { 'class': 'chat-badge', texte: 'IA' })]);
  var fermer = el('button', { type: 'button', 'class': 'chat-fermer', 'aria-label': "Fermer l'assistant", html: ICONES.fermer });
  var entete = el('div', { 'class': 'chat-entete' }, [el('div', null, [titre, el('p', { 'class': 'chat-mention', texte: cfg.mention })]), fermer]);
  var fil = el('div', { 'class': 'chat-fil', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversation' });
  var suggestions = el('div', { 'class': 'chat-suggestions' });
  cfg.suggestions.forEach(function (s) {
    var b = el('button', { type: 'button', 'class': 'chat-suggestion', texte: s });
    b.addEventListener('click', function () { envoyer(s); });
    suggestions.appendChild(b);
  });
  var champ = el('textarea', { id: 'chat-question', 'class': 'chat-champ', rows: '1', maxlength: String(MAX_QUESTION), placeholder: 'Posez votre question', autocomplete: 'off' });
  var bouton = el('button', { type: 'submit', 'class': 'chat-envoyer', 'aria-label': 'Envoyer la question', html: ICONES.envoyer });
  var saisie = el('form', { 'class': 'chat-saisie' }, [el('label', { 'for': 'chat-question', 'class': 'sr-only', texte: 'Votre question' }), champ, bouton]);
  var boutonRappel = el('button', { type: 'button', 'class': 'chat-action', texte: 'Être rappelé par ' + cfg.prenom });
  var lienWa = el('a', { 'class': 'chat-action', href: cfg.whatsapp, target: '_blank', rel: 'noopener', texte: 'WhatsApp' });
  var actions = el('div', { 'class': 'chat-actions' }, [boutonRappel, cfg.whatsapp ? lienWa : null]);
  var panneau = el('section', { id: 'chat-panneau', 'class': 'chat-panneau', role: 'dialog', 'aria-labelledby': 'chat-titre', hidden: true }, [entete, fil, suggestions, saisie, actions]);
  document.body.appendChild(lanceur);
  document.body.appendChild(panneau);

  function defilerEnBas() { fil.scrollTop = fil.scrollHeight; }
  function message(role, enfants, classe) {
    var m = el('div', { 'class': 'chat-msg chat-msg-' + role + (classe ? ' ' + classe : '') }, enfants);
    fil.appendChild(m);
    defilerEnBas();
    return m;
  }
  if (cfg.accueil) message('assistant', [el('p', { texte: cfg.accueil })]);

  // ---------- Ouverture et fermeture
  function ouvrir() {
    panneau.hidden = false;
    lanceur.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('chat-ouvert');
    defilerEnBas();
    champ.focus({ preventScroll: true });
    signaler('chat_ouverture');
  }
  function fermerPanneau() {
    panneau.hidden = true;
    lanceur.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('chat-ouvert');
    lanceur.focus({ preventScroll: true });
  }
  lanceur.addEventListener('click', function () { if (panneau.hidden) ouvrir(); else fermerPanneau(); });
  fermer.addEventListener('click', fermerPanneau);
  panneau.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); fermerPanneau(); } });

  // ---------- Rendu d'une réponse : texte simple ; les adresses de pages citées (/tarifs) deviennent des liens quand le
  // Worker les a reconnues (liste des sources), comme les adresses complètes du site, réécrites en liens relatifs.
  var MOTIF = /\[(\d+)\]|https:\/\/(?:www\.)?coolok\.co(\/[a-z0-9\-\/#?=&]*)?|(\/[a-z][a-z0-9\-]*(?:\/[a-z0-9\-]+)*)/gi;
  function enLigne(texte, parNumero, parAdresse) {
    var noeuds = [];
    var dernier = 0;
    var m;
    MOTIF.lastIndex = 0;
    while ((m = MOTIF.exec(texte))) {
      var s = null;
      if (m[3]) {
        // Adresse relative : seulement si la page est une source reconnue et que l'adresse commence un mot.
        var avant = m.index ? texte.charAt(m.index - 1) : ' ';
        s = parAdresse[m[3]];
        if (!s || !/[\s(«"']/.test(avant)) continue;
      }
      if (m.index > dernier) noeuds.push(texte.slice(dernier, m.index));
      if (m[3]) noeuds.push(el('a', { href: s.url, title: s.titre, texte: m[3] }));
      else if (m[1]) {
        s = parNumero[m[1]];
        noeuds.push(s ? el('a', { href: s.url, 'class': 'chat-ref', title: s.titre, texte: '[' + m[1] + ']' }) : '');
      } else {
        var chemin = m[2] || '/';
        noeuds.push(el('a', { href: chemin, texte: chemin === '/' ? 'coolok.co' : chemin }));
      }
      dernier = m.index + m[0].length;
    }
    if (dernier < texte.length) noeuds.push(texte.slice(dernier));
    return noeuds;
  }
  function rendreReponse(texte, sources) {
    var parNumero = {};
    var parAdresse = {};
    (sources || []).forEach(function (s) { if (s.n) parNumero[s.n] = s; parAdresse[s.url] = s; });
    var blocs = [];
    var liste = null;
    texte.split('\n').forEach(function (ligne) {
      var l = ligne.trim();
      if (!l) { liste = null; return; }
      var puce = l.match(/^[-*]\s+(.*)$/);
      if (puce) {
        if (!liste) { liste = el('ul'); blocs.push(liste); }
        liste.appendChild(el('li', null, enLigne(puce[1], parNumero, parAdresse)));
      } else {
        liste = null;
        blocs.push(el('p', null, enLigne(l, parNumero, parAdresse)));
      }
    });
    if (sources && sources.length) {
      var ul = el('ul', { 'class': 'chat-sources-liste' });
      sources.forEach(function (s) { ul.appendChild(el('li', null, [el('a', { href: s.url, texte: (s.n ? '[' + s.n + '] ' : '') + s.titre })])); });
      blocs.push(el('div', { 'class': 'chat-sources' }, [el('p', { texte: 'Sources :' }), ul]));
    }
    return blocs;
  }
  function contactsDirects(texte) {
    var enfants = [texte + ' '];
    if (cfg.whatsapp) enfants.push(el('a', { href: cfg.whatsapp, target: '_blank', rel: 'noopener', texte: 'WhatsApp' }));
    if (cfg.whatsapp && cfg.telephone) enfants.push(' ou au ');
    else if (cfg.telephone) enfants.push('au ');
    if (cfg.telephone) enfants.push(el('a', { href: 'tel:' + cfg.telephoneRaw, texte: cfg.telephone }));
    enfants.push('.');
    return el('p', null, enfants);
  }

  // ---------- Questions
  function envoyer(question) {
    question = String(question || '').trim().slice(0, MAX_QUESTION);
    if (!question || enCours) return;
    message('visiteur', [el('p', { texte: question })]);
    historique.push({ role: 'user', content: question });
    suggestions.hidden = true;
    champ.value = '';
    ajusterChamp();
    enCours = true;
    bouton.disabled = true;
    var attente = message('assistant', [el('p', { texte: 'Je cherche dans les pages du site' }), el('span', { 'class': 'chat-points', 'aria-hidden': 'true' })], 'chat-attente');
    signaler('chat_question');
    // Le Worker refuse une question posée moins de 3 s après l'ouverture de la page (filtre anti-robots des formulaires) :
    // une suggestion cliquée très vite attend la fin de ce délai au lieu d'afficher « Rechargez la page » (vu le 26/10/2026).
    new Promise(function (ok) { setTimeout(ok, Math.max(0, 3200 - (Date.now() - t0))); })
      .then(function () {
        return fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ messages: historique.slice(-10), page: location.pathname, duree: String(Date.now() - t0) })
        });
      })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { statut: r.status, j: j }; }); })
      .then(function (res) {
        fil.removeChild(attente);
        if (res.statut === 200 && res.j && res.j.ok && res.j.reponse) {
          historique.push({ role: 'assistant', content: res.j.reponse });
          message('assistant', rendreReponse(res.j.reponse, res.j.sources));
          reponses++;
          if (reponses === 2) proposerRappel();
          return;
        }
        historique.pop();
        if (res.j && res.j.indisponible) message('assistant', [contactsDirects("L'assistant n'est pas disponible pour le moment. " + cfg.prenom + ' vous répond sur')], 'chat-erreur');
        else message('assistant', [contactsDirects((res.j && res.j.erreur ? res.j.erreur + '. ' : "La réponse n'a pas pu arriver. ") + 'Réessayez dans un instant, ou écrivez à ' + cfg.prenom + ' sur')], 'chat-erreur');
      })
      .catch(function () {
        if (attente.parentNode) fil.removeChild(attente);
        historique.pop();
        message('assistant', [contactsDirects("La réponse n'a pas pu arriver. Vérifiez votre connexion, ou écrivez à " + cfg.prenom + ' sur')], 'chat-erreur');
      })
      .then(function () {
        enCours = false;
        bouton.disabled = false;
        if (!panneau.hidden) champ.focus({ preventScroll: true });
      });
  }
  function ajusterChamp() {
    champ.style.height = 'auto';
    champ.style.height = Math.min(champ.scrollHeight, 128) + 'px';
  }
  champ.addEventListener('input', ajusterChamp);
  champ.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); envoyer(champ.value); }
  });
  saisie.addEventListener('submit', function (e) { e.preventDefault(); envoyer(champ.value); });

  // ---------- Demande de rappel : le formulaire de contact du site, avec le fil de la conversation en message
  function proposerRappel() {
    if (rappelPropose) return;
    rappelPropose = true;
    var b = el('button', { type: 'button', 'class': 'chat-suggestion', texte: 'Être rappelé par ' + cfg.prenom });
    b.addEventListener('click', ouvrirRappel);
    message('assistant', [el('p', { texte: 'Pour un avis sur votre logement, ' + cfg.prenom + ' peut vous rappeler avec le fil de cette conversation.' }), b]);
  }
  function transcription() {
    var t = historique.map(function (m) { return (m.role === 'user' ? 'Visiteur : ' : 'Assistant : ') + m.content.replace(/\s+/g, ' '); }).join(' | ');
    var entete = 'Demande envoyée depuis l’assistant du site. ';
    var place = 1950 - entete.length;
    return entete + (t.length > place ? '(début coupé) ' + t.slice(t.length - place + 14) : t);
  }
  var formRappel = null;
  function ouvrirRappel() {
    if (formRappel && formRappel.parentNode) { formRappel.querySelector('input').focus(); return; }
    var id = function (n) { return 'chat-rappel-' + n; };
    var erreur = el('p', { 'class': 'form-error', role: 'alert', hidden: true });
    var envoi = el('button', { type: 'submit', 'class': 'btn btn-primary chat-rappel-envoyer', texte: 'Envoyer ma demande' });
    var annuler = el('button', { type: 'button', 'class': 'chat-action', texte: 'Annuler' });
    formRappel = el('form', { 'class': 'chat-rappel', novalidate: true }, [
      el('p', { texte: 'Laissez vos coordonnées : ' + cfg.prenom + ' vous recontacte, avec le fil de cette conversation.' }),
      el('label', { 'for': id('prenom'), texte: 'Prénom' }),
      el('input', { id: id('prenom'), name: 'prenom', type: 'text', required: true, autocomplete: 'given-name', maxlength: '80' }),
      el('label', { 'for': id('email'), texte: 'E-mail' }),
      el('input', { id: id('email'), name: 'email', type: 'email', required: true, autocomplete: 'email', maxlength: '120' }),
      el('label', { 'for': id('telephone'), texte: 'Téléphone (facultatif)' }),
      el('input', { id: id('telephone'), name: 'telephone', type: 'tel', autocomplete: 'tel', maxlength: '40' }),
      el('label', { 'class': 'chat-consent' }, [el('input', { type: 'checkbox', name: 'consent', required: true }), ' J’accepte que Coolok me recontacte au sujet de ma demande (', el('a', { href: '/mentions-legales#donnees-personnelles', texte: 'données personnelles' }), ').']),
      el('div', { 'class': 'hp', 'aria-hidden': 'true' }, [el('label', null, ['Site web', el('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off' })])]),
      erreur,
      el('div', { 'class': 'chat-rappel-boutons' }, [envoi, annuler])
    ]);
    annuler.addEventListener('click', function () { fil.removeChild(formRappel); formRappel = null; champ.focus({ preventScroll: true }); });
    formRappel.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!formRappel.checkValidity()) { formRappel.reportValidity(); return; }
      var v = function (n) { var i = formRappel.querySelector('[name="' + n + '"]'); return i.type === 'checkbox' ? (i.checked ? 'oui' : '') : i.value; };
      envoi.disabled = true;
      envoi.textContent = 'Envoi en cours…';
      erreur.hidden = true;
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ kind: 'contact', prenom: v('prenom'), nom: '', email: v('email'), telephone: v('telephone'), consent: v('consent'), website: v('website'), message: transcription(), page: location.pathname + ' (assistant)', url: location.href, referrer: document.referrer || '', duree: String(Date.now() - t0) })
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && res.j && res.j.redirect) { signaler('chat_rappel'); location.href = res.j.redirect; return; }
          throw new Error((res.j && res.j.error) || 'envoi impossible');
        })
        .catch(function (err) {
          envoi.disabled = false;
          envoi.textContent = 'Envoyer ma demande';
          erreur.textContent = 'L’envoi a échoué (' + err.message + '). Vous pouvez écrire à ' + cfg.prenom + ' sur WhatsApp ou réessayer.';
          erreur.hidden = false;
        });
    });
    fil.appendChild(formRappel);
    defilerEnBas();
    formRappel.querySelector('input').focus({ preventScroll: true });
  }
  boutonRappel.addEventListener('click', ouvrirRappel);
})();
