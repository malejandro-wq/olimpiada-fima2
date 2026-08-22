const QUESTIONS = [
  {
    id: 1,
    subject: "Matemáticas",
    type: "choice",
    text: "Si f(x) = x² − 6x + 5, ¿cuál es el valor mínimo de la función?",
    options: ["−5", "−4", "4", "5"],
    answer: "−4",
    points: 10
  },
  {
    id: 2,
    subject: "Matemáticas",
    type: "text",
    text: "Determine el valor de x si 2x + 7 = 19.",
    answer: "6",
    points: 10
  },
  {
    id: 3,
    subject: "Matemáticas",
    type: "text",
    text: "Un triángulo rectángulo tiene catetos de 3 cm y 4 cm. Determine su área.",
    answer: "6",
    points: 10
  },
  {
    id: 4,
    subject: "Física",
    type: "choice",
    text: "Un móvil parte del reposo con aceleración constante de 2 m/s² durante 5 s. ¿Qué distancia recorre?",
    options: ["10 m", "20 m", "25 m", "50 m"],
    answer: "25 m",
    points: 10
  },
  {
    id: 5,
    subject: "Física",
    type: "text",
    text: "¿Qué ley relaciona el flujo eléctrico neto a través de una superficie cerrada con la carga encerrada?",
    answer: "ley de gauss",
    points: 10
  },
  {
    id: 6,
    subject: "Física",
    type: "text",
    text: "Una onda tiene una frecuencia de 75 Hz y una cresta recorre 14 m en 12 s. Determine su longitud de onda.",
    answer: "0.01556",
    points: 10
  }
];

const STORAGE_KEY = "olimpiada_mpf_participante_v1";
const TOTAL_TIME = 60 * 60;

let state = {
  participant: null,
  startTime: null,
  remaining: TOTAL_TIME,
  questions: QUESTIONS.map(q => ({
    id: q.id,
    attempts: 0,
    solved: false,
    locked: false,
    points: 0
  })),
  finished: false
};

const $ = id => document.getElementById(id);

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return false;

  try {
    state = JSON.parse(saved);
    return !!state.participant && !state.finished;
  } catch {
    return false;
  }
}

function normalize(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/,/g, ".")
    .replace(/\s+/g, " ");
}

function answerIsCorrect(question, answer) {
  const a = normalize(answer);
  const b = normalize(question.answer);

  if (question.id === 6) {
    const number = Number(a);
    return Number.isFinite(number) && Math.abs(number - (14 / 12 / 75)) < 0.0005;
  }

  if (question.id === 5) {
    return a.includes("gauss");
  }

  return a === b;
}

function getQuestionState(id) {
  return state.questions.find(q => q.id === id);
}

function renderParticipant() {
  $("displayName").textContent = state.participant.name;
  $("displaySchool").textContent = state.participant.school;
  $("displayCategory").textContent = state.participant.category;

  if (state.participant.city) {
    $("displayCity").textContent = state.participant.city;
    $("displayCityLine").classList.remove("hidden");
  } else {
    $("displayCityLine").classList.add("hidden");
  }
}

function questionHTML(question) {
  const qs = getQuestionState(question.id);
  const locked = qs.locked || qs.solved;

  let content = "";

  if (question.type === "choice") {
    content = `
      <div class="options">
        ${question.options.map(option => `
          <button
            class="option"
            data-question="${question.id}"
            data-option="${option}"
            ${locked ? "disabled" : ""}
          >${option}</button>
        `).join("")}
      </div>
      <div class="feedback" id="feedback-${question.id}"></div>
    `;
  } else {
    content = `
      <div class="answer-row">
        <input
          class="answer-input"
          id="input-${question.id}"
          placeholder="Escriba su respuesta..."
          ${locked ? "disabled" : ""}
        >
        <button
          class="send-btn"
          data-submit="${question.id}"
          ${locked ? "disabled" : ""}
        >ENVIAR</button>
      </div>
      <div class="feedback" id="feedback-${question.id}"></div>
    `;
  }

  return `
    <article
      class="question ${qs.solved ? "solved" : ""} ${qs.locked ? "locked" : ""}"
      id="question-${question.id}"
    >
      <div class="question-title">
        <span class="question-number">${String(question.id).padStart(2, "0")}</span>
        <span class="question-text">${question.text}</span>
      </div>

      <div class="question-meta">
        <span>INTENTOS: <strong id="attempts-${question.id}">${qs.attempts}/3</strong></span>
        <span>VALOR: ${question.points} PUNTOS</span>
      </div>

      ${content}
    </article>
  `;
}

function renderQuestions() {
  $("mathQuestions").innerHTML =
    QUESTIONS.filter(q => q.subject === "Matemáticas")
      .map(questionHTML).join("");

  $("physicsQuestions").innerHTML =
    QUESTIONS.filter(q => q.subject === "Física")
      .map(questionHTML).join("");

  document.querySelectorAll(".option").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.question);
      const group = btn.parentElement;
      group.querySelectorAll(".option").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");

      submitAnswer(id, btn.dataset.option);
    });
  });

  document.querySelectorAll("[data-submit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.submit);
      const input = $(`input-${id}`);
      submitAnswer(id, input.value);
    });
  });
}

function updateStats() {
  $("statsBody").innerHTML = QUESTIONS.map(q => {
    const qs = getQuestionState(q.id);

    let status = "No se intentó";
    let cls = "status-open";

    if (qs.solved) {
      status = "✓ Resuelto";
      cls = "status-solved";
    } else if (qs.locked) {
      status = "Bloqueado";
      cls = "status-locked";
    } else if (qs.attempts > 0) {
      status = "✗ Incorrecto";
      cls = "status-wrong";
    }

    return `
      <tr>
        <td>${String(q.id).padStart(2, "0")} — ${q.text.substring(0, 42)}${q.text.length > 42 ? "..." : ""}</td>
        <td>${q.subject}</td>
        <td>${qs.attempts} / 3</td>
        <td class="${cls}">${status}</td>
        <td>${qs.points} / ${q.points}</td>
      </tr>
    `;
  }).join("");
}

function setFeedback(id, text, type) {
  const el = $(`feedback-${id}`);
  if (!el) return;
  el.className = `feedback ${type}`;
  el.textContent = text;
}

function submitAnswer(id, answer) {
  const question = QUESTIONS.find(q => q.id === id);
  const qs = getQuestionState(id);

  if (qs.solved || qs.locked) return;

  if (!answer || !answer.trim()) {
    setFeedback(id, "Escriba o seleccione una respuesta.", "incorrect");
    return;
  }

  qs.attempts++;

  if (answerIsCorrect(question, answer)) {
    qs.solved = true;
    qs.points = question.points;

    setFeedback(
      id,
      `✓ Respuesta correcta. +${question.points} puntos.`,
      "correct"
    );

    const article = $(`question-${id}`);
    article.classList.add("solved");

    article.querySelectorAll("button, input").forEach(el => {
      el.disabled = true;
    });
  } else if (qs.attempts >= 3) {
    qs.locked = true;

    setFeedback(
      id,
      "✗ Respuesta incorrecta. Has agotado los 3 intentos.",
      "locked"
    );

    const article = $(`question-${id}`);
    article.classList.add("locked");

    article.querySelectorAll("button, input").forEach(el => {
      el.disabled = true;
    });
  } else {
    setFeedback(
      id,
      `✗ Respuesta incorrecta. Intento ${qs.attempts}/3. Puedes volver a intentarlo.`,
      "incorrect"
    );
  }

  $(`attempts-${id}`).textContent = `${qs.attempts}/3`;
  updateStats();
  saveState();
}

function updateTimer() {
  if (!state.startTime || state.finished) return;

  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  state.remaining = Math.max(0, TOTAL_TIME - elapsed);

  const minutes = String(Math.floor(state.remaining / 60)).padStart(2, "0");
  const seconds = String(state.remaining % 60).padStart(2, "0");

  $("timer").textContent = `${minutes}:${seconds}`;

  if (state.remaining <= 300) {
    $("timerBox").classList.add("danger");
  }

  if (state.remaining <= 0) {
    finishCompetition(true);
  }
}

function startCompetition(participant) {
  state.participant = participant;
  state.startTime = Date.now();
  state.remaining = TOTAL_TIME;
  state.finished = false;
  state.questions = QUESTIONS.map(q => ({
    id: q.id,
    attempts: 0,
    solved: false,
    locked: false,
    points: 0
  }));

  saveState();

  $("registration").classList.add("hidden");
  $("competition").classList.remove("hidden");
  $("timerBox").classList.remove("hidden");

  renderParticipant();
  renderQuestions();
  updateStats();
  updateTimer();
}

function finishCompetition(auto = false) {
  if (state.finished) return;

  state.finished = true;
  saveState();

  const total = state.questions.reduce((sum, q) => sum + q.points, 0);
  const max = QUESTIONS.reduce((sum, q) => sum + q.points, 0);
  const solved = state.questions.filter(q => q.solved).length;

  const result = $("finalResult");
  result.classList.remove("hidden");

  result.innerHTML = `
    <h2>${auto ? "⏱ TIEMPO AGOTADO" : "✓ COMPETENCIA FINALIZADA"}</h2>
    <div class="score">${total} / ${max} puntos</div>
    <p>
      <strong>${state.participant.name}</strong><br>
      ${state.participant.school}
    </p>
    <p>
      Problemas resueltos: ${solved} de ${QUESTIONS.length}
    </p>
  `;

  $("finishBtn").disabled = true;
  $("finishBtn").textContent = "COMPETENCIA FINALIZADA";
  $("timer").textContent = "00:00";
  $("timerBox").classList.add("danger");

  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function resetCompetition() {
  const ok = confirm(
    "¿Seguro que quieres reiniciar la prueba? Se borrarán tus respuestas y comenzará un nuevo intento."
  );

  if (!ok) return;

  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

$("registrationForm").addEventListener("submit", event => {
  event.preventDefault();

  startCompetition({
    name: $("participantName").value.trim(),
    school: $("school").value.trim(),
    category: $("category").value.trim(),
    city: $("city").value.trim()
  });
});

$("finishBtn").addEventListener("click", () => {
  const ok = confirm(
    "¿Quieres finalizar la competencia? Después no podrás responder más preguntas."
  );

  if (ok) finishCompetition(false);
});

$("resetBtn").addEventListener("click", resetCompetition);

if (loadState()) {
  $("registration").classList.add("hidden");
  $("competition").classList.remove("hidden");
  $("timerBox").classList.remove("hidden");

  renderParticipant();
  renderQuestions();
  updateStats();
  updateTimer();
} else {
  localStorage.removeItem(STORAGE_KEY);
}

setInterval(updateTimer, 1000);
