// Runs Swift snippets via the Compiler Explorer API (godbolt.org).
(function () {
  var API = 'https://godbolt.org/api/compiler/swift640/compile';

  async function runSwift(source) {
    var res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        source: source,
        options: {
          userArguments: '-swift-version 6',
          executeParameters: { args: [], stdin: '' },
          compilerOptions: { executorRequest: true },
          filters: { execute: true }
        }
      })
    });
    if (!res.ok) throw new Error('Сервер відповів ' + res.status);
    return res.json();
  }

  function lines(arr) { return (arr || []).map(function (l) { return l.text; }).join('\n'); }

  function cleanCompilerOutput(text) {
    // технічні шляхи на кшталт /app/example.swift:3:5 → рядок 3:5
    return text
      .split('\n')
      .filter(function (l) { return !/emit-module command failed/.test(l); })
      .join('\n')
      .replace(/\/app\/example\.swift:/g, 'рядок ').replace(/<source>:/g, 'рядок ');
  }

  function render(out, data) {
    out.hidden = false;
    out.className = 'run-output';
    var build = data.buildResult || {};
    if (build.code && build.code !== 0) {
      out.classList.add('is-error');
      out.textContent = 'Помилка компіляції:\n' + cleanCompilerOutput(lines(build.stderr) || lines(data.stderr));
      return;
    }
    var text = lines(data.stdout);
    var err = lines(data.stderr);
    if (data.timedOut) text += '\n⏱ Перевищено час виконання';
    if (err) text += (text ? '\n' : '') + cleanCompilerOutput(err);
    if (data.code !== 0 && !data.timedOut) {
      out.classList.add('is-error');
      text += '\nПрограма завершилась з кодом ' + data.code;
    }
    out.textContent = text || '(програма нічого не вивела)';
  }

  function makeEditor(initial, minRows) {
    var ta = document.createElement('textarea');
    ta.className = 'run-editor';
    ta.spellcheck = false;
    ta.autocapitalize = 'off';
    ta.setAttribute('autocorrect', 'off');
    ta.value = initial;
    var fit = function () {
      ta.style.height = 'auto';
      ta.style.height = Math.max(ta.scrollHeight, minRows * 22) + 'px';
    };
    ta.addEventListener('input', fit);
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var s = ta.selectionStart, end = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = s + 4;
      }
    });
    requestAnimationFrame(fit);
    return ta;
  }

  function button(label, secondary) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'run-btn' + (secondary ? ' secondary' : '');
    b.textContent = label;
    return b;
  }

  function attach(block, source, opts) {
    opts = opts || {};
    var bar = document.createElement('div');
    bar.className = 'run-bar';
    var runBtn = button('▶ Запустити');
    var editBtn = button('✎ Змінити', true);
    var resetBtn = button('↺ Скинути', true);
    resetBtn.hidden = true;
    var out = document.createElement('pre');
    out.className = 'run-output';
    out.hidden = true;

    var editor = null;
    var pre = block.querySelector('pre');

    function enterEdit() {
      if (editor) return;
      editor = makeEditor(source, opts.minRows || 3);
      if (pre) pre.hidden = true;
      block.insertBefore(editor, bar);
      editBtn.hidden = true;
      resetBtn.hidden = false;
      if (!opts.editable) editor.focus();
    }

    editBtn.addEventListener('click', enterEdit);
    resetBtn.addEventListener('click', function () {
      if (editor) { editor.value = source; editor.dispatchEvent(new Event('input')); }
      out.hidden = true;
    });
    runBtn.addEventListener('click', async function () {
      var code = editor ? editor.value : source;
      runBtn.disabled = true;
      runBtn.textContent = '… Компілюємо';
      out.hidden = false;
      out.className = 'run-output is-pending';
      out.textContent = 'Компілюємо й запускаємо…';
      try {
        render(out, await runSwift(code));
      } catch (e) {
        out.className = 'run-output is-error';
        out.textContent = 'Не вдалося зв\'язатися з сервером компіляції (godbolt.org). Перевір інтернет і спробуй ще раз.\n' + e.message;
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = '▶ Запустити';
      }
    });

    bar.appendChild(runBtn);
    bar.appendChild(editBtn);
    bar.appendChild(resetBtn);
    block.appendChild(bar);
    block.appendChild(out);
    if (opts.editable) enterEdit();
  }

  document.querySelectorAll('.code[data-runnable]').forEach(function (block) {
    var src = block.querySelector('template.src');
    if (src) attach(block, src.content.textContent, {});
  });

  var playground = document.getElementById('playground');
  if (playground) {
    var tpl = playground.querySelector('template.src');
    attach(playground, tpl ? tpl.content.textContent : '', { editable: true, minRows: 12 });
  }
})();
