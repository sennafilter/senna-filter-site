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

// count-up stats — animate numbers when they scroll into view
(function () {
  var nums = document.querySelectorAll('.count[data-to]');
  if (!nums.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function run(el) {
    var to = parseFloat(el.getAttribute('data-to')) || 0;
    var pre = el.getAttribute('data-prefix') || '';
    var suf = el.getAttribute('data-suffix') || '';
    if (reduce) { el.textContent = pre + to + suf; return; }
    var dur = 1300, start = null;
    function tick(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(to * eased) + suf;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = pre + to + suf;
    }
    requestAnimationFrame(tick);
  }
  if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
  var io = new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
    });
  }, { threshold: 0.6 });
  nums.forEach(function (el) { io.observe(el); });
})();

// magnetic buttons — primary buttons drift slightly toward the cursor
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var strength = 0.28;
  document.querySelectorAll('.btn').forEach(function (btn) {
    btn.addEventListener('pointermove', function (e) {
      var r = btn.getBoundingClientRect();
      var mx = e.clientX - (r.left + r.width / 2);
      var my = e.clientY - (r.top + r.height / 2);
      btn.style.transform = 'translate(' + (mx * strength).toFixed(1) + 'px,' + (my * strength - 2).toFixed(1) + 'px)';
    });
    btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
  });
})();

// guide filter chips — filter the guides list by topic
(function () {
  var bar = document.querySelector('.guide-filter');
  var list = document.querySelector('.guides-list');
  if (!bar || !list) return;
  var items = Array.prototype.slice.call(list.querySelectorAll('li'));
  var chips = Array.prototype.slice.call(bar.querySelectorAll('.chip'));
  function apply(cat) {
    items.forEach(function (li) {
      var cats = (li.getAttribute('data-cat') || '').split(/\s+/);
      var show = cat === 'all' || cats.indexOf(cat) !== -1;
      li.classList.toggle('hide', !show);
      if (show) { li.classList.remove('show-anim'); void li.offsetWidth; li.classList.add('show-anim'); }
    });
  }
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      chip.setAttribute('aria-pressed', 'true');
      apply(chip.getAttribute('data-cat'));
    });
  });
})();
