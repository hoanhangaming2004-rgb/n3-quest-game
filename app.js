(function () {
  "use strict";

  var QUESTIONS_PER_ROUND = 10;
  var bank = window.N3_QUESTION_BANK || [];

  var qs = [];
  var pos = 0;
  var score = 0;
  var streak = 0;
  var correct = 0;
  var answered = false;

  function el(id) {
    return document.getElementById(id);
  }

  function shuffle(arr) {
    var a = arr.slice();
    var i;
    var j;
    var tmp;

    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }

    return a;
  }

  function roundLength() {
    return Math.min(QUESTIONS_PER_ROUND, bank.length);
  }

  function updateStats() {
    var total = roundLength();
    var done = pos + (answered ? 1 : 0);
    var acc = done ? Math.round((correct / done) * 100) : 0;

    el("score").textContent = score;
    el("streak").textContent = streak + " 🔥";
    el("counter").textContent = Math.min(pos + 1, total) + "/" + total;
    el("accuracy").textContent = "Độ chính xác: " + acc + "%";
    el("bar").style.width = total ? (done / total) * 100 + "%" : "0%";
  }

  function render() {
    var q = qs[pos];
    var i;
    var button;

    answered = false;
    el("type").textContent = q.t;
    el("question").textContent = q.q;
    el("reading").textContent = q.r;
    el("reading").className = "reading hide";
    el("hint").textContent = "💡 Xem hiragana";
    el("feedback").textContent = "";
    el("feedback").className = "feedback";
    el("next").disabled = true;
    el("answers").innerHTML = "";

    for (i = 0; i < q.a.length; i++) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "answer";
      button.setAttribute("data-index", String(i));
      button.textContent = String.fromCharCode(65 + i) + ". " + q.a[i];
      button.addEventListener("click", choose, false);
      el("answers").appendChild(button);
    }

    updateStats();
  }

  function choose(evt) {
    var selected;
    var q;
    var buttons;
    var i;
    var bonus;

    if (answered) {
      return;
    }

    answered = true;
    selected = parseInt(evt.currentTarget.getAttribute("data-index"), 10);
    q = qs[pos];
    buttons = el("answers").getElementsByTagName("button");

    for (i = 0; i < buttons.length; i++) {
      buttons[i].disabled = true;
      if (i === q.c) {
        buttons[i].className += " correct";
      }
    }

    if (selected === q.c) {
      streak++;
      correct++;
      bonus = Math.min(streak - 1, 5) * 2;
      score += 10 + bonus;
      el("feedback").textContent =
        "✅ Chính xác! +" + (10 + bonus) + " điểm.\n" + q.e;
      el("feedback").className = "feedback ok";
    } else {
      streak = 0;
      evt.currentTarget.className += " wrong";
      el("feedback").textContent =
        "❌ Chưa đúng. Đáp án đúng: " + q.a[q.c] + "\n" + q.e;
      el("feedback").className = "feedback no";
    }

    el("next").disabled = false;
    updateStats();
  }

  function finish() {
    var total = roundLength();
    var acc = total ? Math.round((correct / total) * 100) : 0;

    el("quiz").className = "panel hide";
    el("result").className = "panel result";
    el("finalScore").textContent =
      score + " điểm • " + correct + "/" + total + " câu đúng • " + acc + "%";

    if (acc >= 90) {
      el("finalMsg").textContent = "Rất tốt. Có thể tăng độ khó lên N3 nâng cao.";
    } else if (acc >= 70) {
      el("finalMsg").textContent = "Khá tốt. Hãy ôn lại các câu đã sai.";
    } else if (acc >= 50) {
      el("finalMsg").textContent = "Đang tiến bộ. Nên củng cố từ vựng và ngữ pháp N3.";
    } else {
      el("finalMsg").textContent = "Nên chơi lại và đọc kỹ phần giải thích sau mỗi câu.";
    }
  }

  function next() {
    if (!answered) {
      return;
    }

    if (pos >= qs.length - 1) {
      finish();
      return;
    }

    pos++;
    render();
  }

  function reset() {
    if (!bank.length) {
      el("question").textContent = "Không tìm thấy dữ liệu câu hỏi.";
      el("feedback").textContent = "Hãy kiểm tra file questions.js.";
      return;
    }

    qs = shuffle(bank).slice(0, roundLength());
    pos = 0;
    score = 0;
    streak = 0;
    correct = 0;
    answered = false;

    el("result").className = "panel result hide";
    el("quiz").className = "panel";
    render();
  }

  var warning = el("jsWarning");
  if (warning) {
    warning.style.display = "none";
  }

  el("hint").addEventListener(
    "click",
    function () {
      var reading = el("reading");

      if (reading.className.indexOf("hide") >= 0) {
        reading.className = "reading";
        el("hint").textContent = "🙈 Ẩn hiragana";
      } else {
        reading.className = "reading hide";
        el("hint").textContent = "💡 Xem hiragana";
      }
    },
    false
  );

  el("next").addEventListener("click", next, false);
  el("restart").addEventListener("click", reset, false);
  el("again").addEventListener("click", reset, false);

  reset();
})();
