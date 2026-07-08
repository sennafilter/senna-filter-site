// senna filter — shared interactions
document.documentElement.classList.add('js');

// mobile nav
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') links.classList.remove('open');
    });
  }
})();

// scroll reveal
(function () {
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  function show(el) { el.classList.add('in'); }

  // reveal anything already on/near screen right away (robust above-the-fold)
  function revealVisible() {
    var vh = window.innerHeight || document.documentElement.clientHeight || 800;
    els.forEach(function (el) {
      if (el.classList.contains('in')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.95 && r.bottom > 0) show(el);
    });
  }
  revealVisible();

  if (!('IntersectionObserver' in window)) {
    els.forEach(show);
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { show(en.target); io.unobserve(en.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
  els.forEach(function (el) { if (!el.classList.contains('in')) io.observe(el); });

  // belt-and-suspenders: never leave content hidden
  window.addEventListener('load', revealVisible);
  setTimeout(function () { els.forEach(show); }, 2500);
})();

// contact form — submits to Formspree (see form's action= attribute)
(function () {
  var form = document.getElementById('inquiry');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var done = document.getElementById('form-done');
    var name = (form.querySelector('[name=name]') || {}).value || 'there';
    var submitBtn = form.querySelector('button[type=submit]');

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      if (res.ok) {
        if (done) {
          done.textContent = "Got it, " + name.split(' ')[0] + ". I'll be in touch soon. — Senna";
          done.hidden = false;
        }
        form.reset();
      } else if (done) {
        done.textContent = "Something went wrong sending that — email me directly at contact@senna-filter.com instead.";
        done.hidden = false;
      }
    }).catch(function () {
      if (done) {
        done.textContent = "Something went wrong sending that — email me directly at contact@senna-filter.com instead.";
        done.hidden = false;
      }
    });
  });
})();

// newsletter signup — submits to Formspree (see form's action= attribute)
(function () {
  var form = document.getElementById('newsletter-signup');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var done = document.getElementById('newsletter-done');

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      if (done) {
        done.textContent = res.ok
          ? "You're in. First issue lands soon. — Senna"
          : "Something went wrong — email me at contact@senna-filter.com and I'll add you myself.";
        done.hidden = false;
      }
      if (res.ok) form.reset();
    }).catch(function () {
      if (done) {
        done.textContent = "Something went wrong — email me at contact@senna-filter.com and I'll add you myself.";
        done.hidden = false;
      }
    });
  });
})();
