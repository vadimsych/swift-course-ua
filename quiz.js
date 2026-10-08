// Interactive self-check quizzes at the end of lessons.
(function () {
  document.querySelectorAll('.quiz').forEach(function (quiz) {
    var items = quiz.querySelectorAll('.quiz-item');
    var score = quiz.querySelector('.quiz-score');
    var answered = 0, correct = 0;

    function shuffleOptions(item) {
      var list = item.querySelector('.quiz-opts');
      var lis = Array.prototype.slice.call(list.children);
      for (var i = lis.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = lis[i]; lis[i] = lis[j]; lis[j] = tmp;
      }
      lis.forEach(function (li) { list.appendChild(li); });
    }

    items.forEach(function (item) {
      shuffleOptions(item);
      var opts = item.querySelectorAll('.quiz-opt');
      var why = item.querySelector('.quiz-why');
      opts.forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (item.dataset.done) return;
          item.dataset.done = '1';
          var ok = btn.dataset.correct === '1';
          btn.classList.add(ok ? 'is-right' : 'is-wrong');
          opts.forEach(function (b) {
            b.disabled = true;
            if (b.dataset.correct === '1') b.classList.add('is-right');
          });
          if (why) {
            why.hidden = false;
            why.insertAdjacentHTML('afterbegin',
              '<strong class="quiz-verdict">' + (ok ? 'Правильно.' : 'Не зовсім.') + '</strong> ');
          }
          answered += 1;
          if (ok) correct += 1;
          if (answered === items.length && score) {
            score.hidden = false;
            score.textContent = 'Результат: ' + correct + ' з ' + items.length +
              (correct === items.length ? ' — тема засвоєна.' : '. Перечитай розділи, де були помилки.');
            score.insertAdjacentHTML('beforeend', ' <button type="button" class="quiz-retry">Пройти ще раз</button>');
            score.querySelector('.quiz-retry').addEventListener('click', reset);
          }
        });
      });
    });

    function reset() {
      answered = 0; correct = 0;
      items.forEach(function (item) {
        delete item.dataset.done;
        shuffleOptions(item);
        item.querySelectorAll('.quiz-opt').forEach(function (b) {
          b.disabled = false;
          b.classList.remove('is-right', 'is-wrong');
        });
        var why = item.querySelector('.quiz-why');
        if (why) {
          var v = why.querySelector('.quiz-verdict');
          if (v) v.remove();
          why.hidden = true;
        }
      });
      if (score) { score.hidden = true; score.textContent = ''; }
      quiz.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
})();
