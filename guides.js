// Guides page: search box + count, and copy buttons on guide pages.
(function () {
  var list = document.querySelector('.guides-list');
  var q = document.getElementById('guide-q');
  var count = document.getElementById('guide-count');
  var empty = document.getElementById('guide-empty');
  if (list && q) {
    var items = Array.prototype.slice.call(list.querySelectorAll('li'));
    var update = function () {
      var n = items.filter(function (li) {
        return !li.classList.contains('hide') && !li.classList.contains('hide-search');
      }).length;
      if (count) count.textContent = n + (n === 1 ? ' guide' : ' guides');
      if (empty) empty.hidden = n > 0;
    };
    q.addEventListener('input', function () {
      var t = q.value.trim().toLowerCase();
      items.forEach(function (li) {
        var hay = (li.getAttribute('data-search') || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        li.classList.toggle('hide-search', !!t && hay.indexOf(t) === -1);
      });
      update();
    });
    var bar = document.querySelector('.guide-filter');
    if (bar) bar.addEventListener('click', function () { setTimeout(update, 0); });
    update();
  }

  Array.prototype.forEach.call(document.querySelectorAll('.tpl .copy'), function (btn) {
    btn.addEventListener('click', function () {
      var pre = btn.parentNode.querySelector('pre');
      var text = pre ? pre.textContent : '';
      var done = function () {
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
      else done();
    });
  });
})();
