const STORAGE_KEYS = {
  students: "retards_students_v1",
  retards: "retards_entries_v1",
};

const SESSION_KEYS = {
  selectedStudentId: "retards_selected_student_id",
  draftMinutes: "retards_draft_minutes",
};

const studentForm = document.getElementById("student-form");
const retardForm = document.getElementById("retard-form");
const nomInput = document.getElementById("nom");
const prenomInput = document.getElementById("prenom");
const studentSelect = document.getElementById("student-select");
const minutesInput = document.getElementById("minutes");
const dateInput = document.getElementById("retard-date");
const noteInput = document.getElementById("note");
const studentFeedback = document.getElementById("student-feedback");
const retardFeedback = document.getElementById("retard-feedback");
const summaryBody = document.getElementById("student-summary-body");
const historyBody = document.getElementById("history-body");
const statsContainer = document.getElementById("stats");
const barsContainer = document.getElementById("bars");

let students = readStorage(STORAGE_KEYS.students, []);
let retards = readStorage(STORAGE_KEYS.retards, []);

init();

function init() {
  dateInput.valueAsDate = new Date();

  const draftMinutes = sessionStorage.getItem(SESSION_KEYS.draftMinutes);
  if (draftMinutes) {
    minutesInput.value = draftMinutes;
  }

  renderAll();
  bindEvents();
}

function bindEvents() {
  studentForm.addEventListener("submit", onAddStudent);
  retardForm.addEventListener("submit", onAddRetard);

  studentSelect.addEventListener("change", () => {
    sessionStorage.setItem(SESSION_KEYS.selectedStudentId, studentSelect.value);
  });

  minutesInput.addEventListener("input", () => {
    sessionStorage.setItem(SESSION_KEYS.draftMinutes, minutesInput.value);
  });
}

function onAddStudent(event) {
  event.preventDefault();

  const nom = nomInput.value.trim();
  const prenom = prenomInput.value.trim();

  if (!nom || !prenom) {
    showFeedback(studentFeedback, "Nom et prenom sont obligatoires.");
    return;
  }

  const duplicate = students.find(
    (student) =>
      student.nom.toLowerCase() === nom.toLowerCase() &&
      student.prenom.toLowerCase() === prenom.toLowerCase(),
  );

  if (duplicate) {
    showFeedback(studentFeedback, "Cet etudiant existe deja.");
    return;
  }

  const newStudent = {
    id: crypto.randomUUID(),
    nom,
    prenom,
    createdAt: new Date().toISOString(),
  };

  students.push(newStudent);
  saveStorage(STORAGE_KEYS.students, students);

  studentForm.reset();
  showFeedback(studentFeedback, "Etudiant ajoute avec succes.", true);
  renderAll();
}

function onAddRetard(event) {
  event.preventDefault();

  const studentId = studentSelect.value;
  const minutes = Number.parseInt(minutesInput.value, 10);
  const date = dateInput.value;
  const note = noteInput.value.trim();

  if (!studentId) {
    showFeedback(retardFeedback, "Veuillez selectionner un etudiant.");
    return;
  }

  if (!Number.isInteger(minutes) || minutes < 1) {
    showFeedback(retardFeedback, "Le retard doit etre un nombre de minutes >= 1.");
    return;
  }

  if (!date) {
    showFeedback(retardFeedback, "La date est obligatoire.");
    return;
  }

  const newRetard = {
    id: crypto.randomUUID(),
    studentId,
    minutes,
    date,
    note,
    createdAt: new Date().toISOString(),
  };

  retards.push(newRetard);
  saveStorage(STORAGE_KEYS.retards, retards);

  noteInput.value = "";
  showFeedback(retardFeedback, `Retard enregistre: ${minutes} min = ${minutes} DH.`, true);
  renderAll();
}

function renderAll() {
  renderStudentSelect();
  renderDashboard();
  renderHistory();
}

function renderStudentSelect() {
  const selectedId = sessionStorage.getItem(SESSION_KEYS.selectedStudentId) || "";

  studentSelect.innerHTML = "<option value=\"\">Selectionner un etudiant</option>";

  students
    .slice()
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
    .forEach((student) => {
      const option = document.createElement("option");
      option.value = student.id;
      option.textContent = `${student.nom} ${student.prenom}`;
      if (selectedId && student.id === selectedId) {
        option.selected = true;
      }
      studentSelect.appendChild(option);
    });
}

function renderDashboard() {
  const statsByStudent = buildStudentStats();
  const totalMinutes = statsByStudent.reduce((sum, item) => sum + item.totalMinutes, 0);

  statsContainer.innerHTML = "";
  statsContainer.appendChild(createStatCard("Etudiants", students.length));
  statsContainer.appendChild(createStatCard("Total minutes", totalMinutes));
  statsContainer.appendChild(createStatCard("Total DH", `${totalMinutes} DH`));

  summaryBody.innerHTML = "";
  if (students.length === 0) {
    summaryBody.innerHTML = "<tr><td colspan=\"5\">Aucun etudiant.</td></tr>";
  } else {
    statsByStudent.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.nom}</td>
        <td>${item.prenom}</td>
        <td>${item.countRetards}</td>
        <td>${item.totalMinutes}</td>
        <td>${item.totalMinutes} DH</td>
      `;
      summaryBody.appendChild(row);
    });
  }

  renderBars(statsByStudent);
}

function renderBars(statsByStudent) {
  barsContainer.innerHTML = "";

  const max = Math.max(1, ...statsByStudent.map((item) => item.totalMinutes));
  const withRetards = statsByStudent.filter((item) => item.totalMinutes > 0);

  if (withRetards.length === 0) {
    barsContainer.innerHTML = "<p>Aucun retard saisi pour le moment.</p>";
    return;
  }

  withRetards.forEach((item) => {
    const percentage = Math.round((item.totalMinutes / max) * 100);
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span>${item.nom}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${percentage}%"></div></div>
      <strong>${item.totalMinutes}</strong>
    `;
    barsContainer.appendChild(row);
  });
}

function renderHistory() {
  historyBody.innerHTML = "";

  if (retards.length === 0) {
    historyBody.innerHTML = "<tr><td colspan=\"5\">Aucun retard enregistre.</td></tr>";
    return;
  }

  const sorted = retards
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  sorted.forEach((entry) => {
    const student = students.find((s) => s.id === entry.studentId);
    const studentName = student ? `${student.nom} ${student.prenom}` : "Etudiant supprime";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(entry.date)}</td>
      <td>${studentName}</td>
      <td>${entry.minutes}</td>
      <td>${entry.minutes} DH</td>
      <td>${entry.note || "-"}</td>
    `;
    historyBody.appendChild(row);
  });
}

function buildStudentStats() {
  const base = students.map((student) => ({
    id: student.id,
    nom: student.nom,
    prenom: student.prenom,
    countRetards: 0,
    totalMinutes: 0,
  }));

  const statsMap = new Map(base.map((item) => [item.id, item]));

  retards.forEach((entry) => {
    const target = statsMap.get(entry.studentId);
    if (!target) {
      return;
    }

    target.countRetards += 1;
    target.totalMinutes += Number(entry.minutes) || 0;
  });

  return base.sort((a, b) => b.totalMinutes - a.totalMinutes);
}

function createStatCard(label, value) {
  const card = document.createElement("article");
  card.className = "stat";
  card.innerHTML = `<span class="stat-label">${label}</span><span class="stat-value">${value}</span>`;
  return card;
}

function showFeedback(node, message, success = false) {
  node.textContent = message;
  node.style.color = success ? "#0a6f66" : "#c76628";
}

function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
