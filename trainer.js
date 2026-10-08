// Random test across all lessons. Questions come from bank.js (window.QUIZ_BANK).
// A question does not come back until most of the selected pool has been seen;
// questions answered wrongly come back sooner.
(function () {
  var root = document.getElementById('trainer');
  if (!root || !window.QUIZ_BANK) return;
  var BANK = window.QUIZ_BANK;
  var KEY = 'swift-course-trainer-v1';

  function loadState() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && s.seen) return s;
    } catch (e) {}
    return { tick: 0, seen: {}, lessons: null, size: 20 };
  }
  function saveState() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  var state = loadState();

  var setup = root.querySelector('.tr-setup');
  var run = root.querySelector('.tr-run');
  var done = root.querySelector('.tr-done');
  var lessonBoxes = root.querySelectorAll('.tr-lesson input');
  var sizeInputs = root.querySelectorAll('input[name="tr-size"]');
  var poolInfo = root.querySelector('.tr-pool');

  if (state.lessons) {
    lessonBoxes.forEach(function (b) { b.checked = state.lessons.indexOf(b.value) !== -1; });
  }
  sizeInputs.forEach(function (r) { r.checked = String(state.size) === r.value; });

  function selectedLessons() {
    return Array.prototype.filter.call(lessonBoxes, function (b) { return b.checked; })
      .map(function (b) { return b.value; });
  }
  function pool() {
    var sel = selectedLessons();
    return BANK.filter(function (q) { return sel.indexOf(q.lesson) !== -1; });
  }
  function updatePoolInfo() {
    var p = pool();
    var seen = p.filter(function (q) { return state.seen[q.id]; }).length;
    poolInfo.textContent = p.length
      ? 'Питань у вибраних уроках: ' + p.length + '. Уже траплялись: ' + seen + '.'
      : 'Обери хоча б один урок.';
    root.querySelector('.tr-start').disabled = !p.length;
  }
  lessonBoxes.forEach(function (b) { b.addEventListener('change', updatePoolInfo); });
  root.querySelectorAll('.tr-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var part = btn.dataset.part;
      var boxes = root.querySelectorAll('.tr-lesson input' + (part ? '[data-part="' + part + '"]' : ''));
      var allOn = Array.prototype.every.call(boxes, function (b) { return b.checked; });
      boxes.forEach(function (b) { b.checked = !allOn; });
      updatePoolInfo();
    });
  });
  updatePoolInfo();

  // ---- picking ----
  function isDue(q, n) {
    var s = state.seen[q.id];
    if (!s) return true;
    var gap = s.wrong ? Math.min(15, Math.max(3, Math.floor(n / 4))) : Math.max(1, Math.floor(n * 0.7));
    return state.tick - s.at >= gap;
  }
  function pick(p, used) {
    var fresh = p.filter(function (q) { return !used[q.id]; });
    if (!fresh.length) return null;
    var due = fresh.filter(function (q) { return isDue(q, p.length); });
    var unseen = due.filter(function (q) { return !state.seen[q.id]; });
    var wrong = due.filter(function (q) { return state.seen[q.id] && state.seen[q.id].wrong; });
    var cands;
    if (wrong.length && Math.random() < 0.3) cands = wrong;
    else if (unseen.length) cands = unseen;
    else if (due.length) cands = due;
    else {
      // everything was seen recently: take the ones seen longest ago
      cands = fresh.slice().sort(function (a, b) { return state.seen[a.id].at - state.seen[b.id].at; })
        .slice(0, Math.max(1, Math.ceil(fresh.length / 10)));
    }
    return cands[Math.floor(Math.random() * cands.length)];
  }

  // ---- session ----
  var session;
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  root.querySelector('.tr-start').addEventListener('click', function () {
    var size = 20;
    sizeInputs.forEach(function (r) { if (r.checked) size = r.value === 'inf' ? 'inf' : +r.value; });
    state.lessons = selectedLessons();
    state.size = size;
    saveState();
    session = { pool: pool(), used: {}, n: 0, right: 0, size: size, mistakes: [] };
    setup.hidden = true; done.hidden = true; run.hidden = false;
    next();
  });

  var card = run.querySelector('.tr-card');
  var progress = run.querySelector('.tr-progress');
  var nextBtn = run.querySelector('.tr-next');
  var finishBtn = run.querySelector('.tr-finish');

  function next() {
    var limit = session.size === 'inf' ? Infinity : session.size;
    var q = session.n < limit ? pick(session.pool, session.used) : null;
    if (!q) { finish(); return; }
    session.used[q.id] = true;
    session.n += 1;
    session.current = q;
    progress.textContent = 'Питання ' + session.n + (limit === Infinity ? '' : ' з ' + limit) +
      ' · правильно ' + session.right;
    var opts = shuffle(q.options.map(function (html, i) { return { html: html, ok: i === q.answer }; }));
    card.innerHTML =
      '<p class="tr-meta"><a href="' + q.lesson + '.html">Урок ' + q.num + ' · ' + q.title + '</a>' +
      (q.topic ? ' · ' + q.topic : '') + '</p>' +
      '<p class="quiz-q">' + q.q + '</p>' + (q.code || '') +
      '<ol class="quiz-opts" type="A">' + opts.map(function (o) {
        return '<li><button type="button" class="quiz-opt" data-correct="' + (o.ok ? 1 : 0) + '">' + o.html + '</button></li>';
      }).join('') + '</ol>' +
      '<div class="quiz-why" hidden>' + q.why + '</div>';
    nextBtn.hidden = true;
    card.querySelectorAll('.quiz-opt').forEach(function (btn) {
      btn.addEventListener('click', function () { answer(btn); });
    });
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function answer(btn) {
    if (card.dataset.done === String(session.n)) return;
    card.dataset.done = String(session.n);
    var ok = btn.dataset.correct === '1';
    var opts = card.querySelectorAll('.quiz-opt');
    btn.classList.add(ok ? 'is-right' : 'is-wrong');
    opts.forEach(function (b) {
      b.disabled = true;
      if (b.dataset.correct === '1') b.classList.add('is-right');
    });
    var why = card.querySelector('.quiz-why');
    why.hidden = false;
    why.insertAdjacentHTML('afterbegin', '<strong class="quiz-verdict">' + (ok ? 'Правильно.' : 'Не зовсім.') + '</strong> ');
    var q = session.current;
    state.tick += 1;
    state.seen[q.id] = { at: state.tick, wrong: !ok };
    saveState();
    if (ok) session.right += 1; else session.mistakes.push(q);
    progress.textContent = progress.textContent.replace(/правильно \d+/, 'правильно ' + session.right);
    nextBtn.hidden = false;
    nextBtn.focus({ preventScroll: true });
  }

  nextBtn.addEventListener('click', next);
  finishBtn.addEventListener('click', finish);

  function finish() {
    var answered = Object.keys(session.used).length - (card.dataset.done === String(session.n) ? 0 : 1);
    run.hidden = true; done.hidden = false;
    var total = Math.max(0, answered);
    var pct = total ? Math.round(session.right / total * 100) : 0;
    var html = '<h2>Результат: ' + session.right + ' з ' + total + (total ? ' (' + pct + '%)' : '') + '</h2>';
    if (session.mistakes.length) {
      var byLesson = {};
      session.mistakes.forEach(function (q) {
        var k = q.lesson;
        (byLesson[k] = byLesson[k] || { q: q, topics: [] }).topics.push(q.topic);
      });
      html += '<p>Варто перечитати:</p><ul>' + Object.keys(byLesson).sort().map(function (k) {
        var e = byLesson[k];
        var topics = e.topics.filter(function (t, i, a) { return t && a.indexOf(t) === i; });
        return '<li><a href="' + k + '.html">Урок ' + e.q.num + ' · ' + e.q.title + '</a>' +
          (topics.length ? ' — ' + topics.join(', ') : '') + '</li>';
      }).join('') + '</ul><p class="quiz-hint">Питання з помилками повернуться швидше за інші.</p>';
    } else if (total) {
      html += '<p>Без жодної помилки.</p>';
    }
    done.querySelector('.tr-summary').innerHTML = html;
    updatePoolInfo();
  }

  done.querySelector('.tr-again').addEventListener('click', function () {
    done.hidden = true; setup.hidden = false; updatePoolInfo();
    setup.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  root.querySelector('.tr-reset').addEventListener('click', function () {
    if (!confirm('Скинути історію? Усі питання знову вважатимуться новими.')) return;
    state.seen = {}; state.tick = 0; saveState(); updatePoolInfo();
  });

  document.addEventListener('keydown', function (e) {
    if (run.hidden || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'Enter' && !nextBtn.hidden && document.activeElement !== nextBtn) { e.preventDefault(); next(); }
    var n = '1234'.indexOf(e.key);
    if (n !== -1) {
      var b = card.querySelectorAll('.quiz-opt')[n];
      if (b && !b.disabled) b.click();
    }
  });
})();
