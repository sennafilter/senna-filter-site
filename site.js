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

// contact form (no backend — friendly confirmation + mailto fallback)
(function () {
  var form = document.getElementById('inquiry');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var done = document.getElementById('form-done');
    var name = (form.querySelector('[name=name]') || {}).value || 'there';
    if (done) {
      done.textContent = "Got it, " + name.split(' ')[0] + ". I'll be in touch soon. — Senna";
      done.hidden = false;
    }
    form.reset();
  });
})();
