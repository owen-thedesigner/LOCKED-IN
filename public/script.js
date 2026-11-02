const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const today = () => new Date().toISOString().slice(0, 10);
const load = (key, fallback) => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const dateLabel = (date = new Date()) => date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

let habits = load("lockin_habits", [
  { id: "h1", name: "Make my bed", category: "Personal" },
  { id: "h2", name: "Move my body", category: "Fitness" },
  { id: "h3", name: "Practice or learn something", category: "Personal" },
  { id: "h4", name: "Work on school priorities", category: "School" }
]);
let completions = load("lockin_completions", {});
let workouts = load("lockin_workouts", []);
let meals = load("lockin_meals", []);
let water = load("lockin_water", {});
let focusMinutes = load("lockin_focus_minutes", {});
let coachHistory = load("lockin_coach_history", []);
let timerMinutes = 25;
let timerRemaining = timerMinutes * 60;
let timerInterval = null;
let timerRunning = false;

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => el.classList.remove("show"), 2200);
}
function doneToday(id) { return Boolean(completions[today()]?.[id]); }
function setDone(id, checked) {
  completions[today()] ||= {};
  completions[today()][id] = checked;
  save("lockin_completions", completions);
  renderAll();
}
function completedCount(date = today()) {
  return habits.filter(h => Boolean(completions[date]?.[h.id])).length;
}
function streakForHabit(id) {
  let streak = 0;
  const d = new Date();
  if (!completions[today()]?.[id]) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().slice(0, 10);
    if (!completions[key]?.[id]) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
function bestStreak() {
  return habits.reduce((best, h) => Math.max(best, streakForHabit(h.id)), 0);
}
function goTo(page) {
  $$(".page").forEach(p => p.classList.toggle("active", p.id === `page-${page}`));
  $$(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  const nav = $(`.nav-link[data-page="${page}"]`);
  $("#topPageName").textContent = nav ? nav.textContent.trim() : "Overview";
  $("#sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
$$("[data-page]").forEach(button => button.addEventListener("click", e => {
  e.preventDefault();
  goTo(button.dataset.page);
}));
$$("[data-go]").forEach(button => button.addEventListener("click", () => goTo(button.dataset.go)));
$("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

function renderHome() {
  const count = completedCount();
  const total = habits.length;
  const percent = total ? Math.round(count / total * 100) : 0;
  $("#homePercent").textContent = `${percent}%`;
  $("#homeRing").style.strokeDashoffset = 371 - (371 * percent / 100);
  $("#homeHabits").textContent = `${count} / ${total}`;
  $("#homeFocus").textContent = `${focusMinutes[today()] || 0} min`;
  $("#homeWorkouts").textContent = workouts.filter(w => w.date === today()).length;
  $("#dailyMessage").textContent = percent === 100 && total ? "You showed up for every habit today." : count ? "Nice work. Keep your momentum going." : "Start with one small win.";
  $("#habitCountLabel").textContent = `${total} ITEMS`;
  $("#homeHabitList").innerHTML = total ? habits.slice(0, 5).map(h => `
    <div class="home-habit-row">
      <button class="habit-check ${doneToday(h.id) ? "done" : ""}" data-toggle="${h.id}" aria-label="Toggle ${escapeHTML(h.name)}">${doneToday(h.id) ? "✓" : ""}</button>
      <span class="habit-name">${escapeHTML(h.name)}</span>
      <span class="habit-meta">${escapeHTML(h.category)}</span>
    </div>`).join("") : `<div class="empty-state">Add your first habit to get started.</div>`;
  $("#communityDays").textContent = `${new Set(Object.keys(completions).filter(d => completedCount(d) > 0)).size} days`;
}
function renderHabits() {
  const count = completedCount();
  $("#habitDoneStat").textContent = count;
  $("#habitTotalStat").textContent = habits.length;
  $("#habitStreakStat").innerHTML = `${bestStreak()} <em>days</em>`;
  $("#habitList").innerHTML = habits.length ? habits.map(h => `
    <div class="habit-row">
      <button class="habit-check ${doneToday(h.id) ? "done" : ""}" data-toggle="${h.id}" aria-label="Toggle ${escapeHTML(h.name)}">${doneToday(h.id) ? "✓" : ""}</button>
      <div class="habit-info"><strong>${escapeHTML(h.name)}</strong><small>${streakForHabit(h.id)} day streak · ${doneToday(h.id) ? "Completed today" : "Not completed yet"}</small></div>
      <span class="category-tag">${escapeHTML(h.category)}</span>
      <button class="delete-habit" data-delete="${h.id}" aria-label="Delete habit">×</button>
    </div>`).join("") : `<div class="empty-state">No habits yet. Add one small thing you want to do regularly.</div>`;
}
function renderWorkouts() {
  $("#workoutCount").textContent = `${workouts.length} SESSIONS`;
  $("#workoutList").innerHTML = workouts.length ? workouts.slice().reverse().map(w => `
    <div class="activity-row"><span class="activity-icon">↗</span><div class="activity-info"><strong>${escapeHTML(w.name)}</strong><small>${escapeHTML(w.type)} · ${dateLabel(new Date(`${w.date}T12:00:00`))}${w.notes ? ` · ${escapeHTML(w.notes)}` : ""}</small></div><span class="activity-extra">${w.duration} min</span></div>`).join("") : `<div class="empty-state">Your training sessions will show up here.</div>`;
}
function renderNutrition() {
  const count = water[today()] || 0;
  $("#waterCount").textContent = count;
  $("#waterFill").style.width = `${Math.min(count / 8 * 100, 100)}%`;
  $("#mealList").innerHTML = meals.length ? meals.slice().reverse().map(m => `
    <div class="activity-row"><span class="activity-icon">◇</span><div class="activity-info"><strong>${escapeHTML(m.name)}</strong><small>${dateLabel(new Date(`${m.date}T12:00:00`))} · Energy: ${escapeHTML(m.energy)}</small></div></div>`).join("") : `<div class="empty-state">Your meal notes will appear here.</div>`;
}
function renderFocus() {
  $("#focusTotal").innerHTML = `${focusMinutes[today()] || 0} <small>min</small>`;
}
function renderAll() {
  renderHome(); renderHabits(); renderWorkouts(); renderNutrition(); renderFocus();
  $$("[data-toggle]").forEach(btn => btn.addEventListener("click", () => setDone(btn.dataset.toggle, !doneToday(btn.dataset.toggle))));
  $$("[data-delete]").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.delete;
    habits = habits.filter(h => h.id !== id);
    Object.values(completions).forEach(day => delete day[id]);
    save("lockin_habits", habits); save("lockin_completions", completions); renderAll(); toast("Habit removed");
  }));
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

$("#addHabitBtn").addEventListener("click", () => { $("#addHabitPanel").hidden = false; $("#habitName").focus(); });
$("#cancelHabit").addEventListener("click", () => { $("#addHabitPanel").hidden = true; });
$("#habitForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("#habitName").value.trim();
  if (!name) return;
  habits.push({ id: uid(), name, category: $("#habitCategory").value });
  save("lockin_habits", habits); e.target.reset(); $("#addHabitPanel").hidden = true; renderAll(); toast("Habit added");
});
$("#workoutForm").addEventListener("submit", e => {
  e.preventDefault();
  workouts.push({ id: uid(), name: $("#workoutName").value.trim(), type: $("#workoutType").value, duration: Number($("#workoutDuration").value), notes: $("#workoutNotes").value.trim(), date: today() });
  save("lockin_workouts", workouts); e.target.reset(); renderAll(); toast("Session saved");
});
$("#addWater").addEventListener("click", () => { water[today()] = (water[today()] || 0) + 1; save("lockin_water", water); renderNutrition(); });
$("#removeWater").addEventListener("click", () => { water[today()] = Math.max(0, (water[today()] || 0) - 1); save("lockin_water", water); renderNutrition(); });
$("#mealForm").addEventListener("submit", e => {
  e.preventDefault();
  meals.push({ id: uid(), name: $("#mealName").value.trim(), energy: $("#mealEnergy").value, date: today() });
  save("lockin_meals", meals); e.target.reset(); renderNutrition(); toast("Meal note saved");
});

function updateTimer() {
  const mins = Math.floor(timerRemaining / 60);
  const secs = timerRemaining % 60;
  $("#timerDisplay").textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  $("#timerProgress").style.strokeDashoffset = 729 * (1 - timerRemaining / (timerMinutes * 60));
  $("#timerStatus").textContent = timerRunning ? "YOU'RE IN FOCUS MODE" : "READY WHEN YOU ARE";
}
function stopTimer() {
  clearInterval(timerInterval); timerInterval = null; timerRunning = false;
  $("#timerStart").textContent = "Start focus"; updateTimer();
}
function chooseTimer(minutes) {
  stopTimer(); timerMinutes = minutes; timerRemaining = minutes * 60;
  $$(".preset").forEach(b => b.classList.toggle("active", Number(b.dataset.minutes) === minutes));
  updateTimer();
}
$$(".preset").forEach(button => button.addEventListener("click", () => chooseTimer(Number(button.dataset.minutes))));
$("#timerStart").addEventListener("click", () => {
  if (timerRunning) { stopTimer(); return; }
  if (timerRemaining <= 0) timerRemaining = timerMinutes * 60;
  timerRunning = true; $("#timerStart").textContent = "Pause"; updateTimer();
  timerInterval = setInterval(() => {
    timerRemaining--;
    updateTimer();
    if (timerRemaining <= 0) {
      stopTimer();
      focusMinutes[today()] = (focusMinutes[today()] || 0) + timerMinutes;
      save("lockin_focus_minutes", focusMinutes); renderAll(); toast("Focus session complete. Take a break!");
    }
  }, 1000);
});
$("#timerReset").addEventListener("click", () => { stopTimer(); timerRemaining = timerMinutes * 60; updateTimer(); });
$("#focusTask").addEventListener("change", () => save("lockin_focus_task", $("#focusTask").value));

function renderCoachHistory() {
  const messages = $("#coachMessages");
  const welcome = `<div class="chat-message assistant"><div class="message-avatar">✳</div><div class="message-bubble"><p>Hey! What's one thing you'd like to make progress on today?</p><small>LOCK IN COACH</small></div></div><div class="coach-prompts"><span>Try asking</span><button class="suggestion" data-prompt="Help me plan my afternoon">Plan my afternoon</button><button class="suggestion" data-prompt="How can I build a better routine?">Build a routine</button><button class="suggestion" data-prompt="I'm feeling unmotivated. Help me start.">Help me get started</button></div>`;
  messages.innerHTML = coachHistory.length ? "" : welcome;
  coachHistory.forEach(m => {
    const row = document.createElement("div");
    row.className = `chat-message ${m.role}`;
    const avatar = document.createElement("div"); avatar.className = "message-avatar"; avatar.textContent = m.role === "assistant" ? "✳" : "Y";
    const bubble = document.createElement("div"); bubble.className = "message-bubble";
    const p = document.createElement("p"); p.textContent = m.content;
    bubble.appendChild(p);
    if (m.role === "assistant") { const small = document.createElement("small"); small.textContent = "LOCK IN COACH"; bubble.appendChild(small); }
    row.append(avatar, bubble); messages.appendChild(row);
  });
  messages.scrollTop = messages.scrollHeight;
}
async function sendCoachMessage(text) {
  const content = text.trim();
  if (!content) return;
  coachHistory.push({ role: "user", content });
  save("lockin_coach_history", coachHistory); renderCoachHistory();
  $("#coachInput").value = ""; $("#coachInput").disabled = true;
  const pending = document.createElement("div");
  pending.className = "chat-message assistant"; pending.id = "coachPending";
  pending.innerHTML = `<div class="message-avatar">✳</div><div class="message-bubble"><p>Thinking...</p></div>`;
  $("#coachMessages").appendChild(pending);
  $("#coachMessages").scrollTop = $("#coachMessages").scrollHeight;
  try {
    if (window.location.protocol === "file:") {
      throw new Error("The AI coach needs the LOCK IN server. Run `npm start` in the project folder, then open http://localhost:3000.");
    }
    const response = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: coachHistory.slice(-16) })
    });
    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new Error("Open LOCK IN at http://localhost:3000 so the AI coach can reach its server.");
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The coach couldn't respond.");
    coachHistory.push({ role: "assistant", content: data.reply });
    save("lockin_coach_history", coachHistory);
  } catch (error) {
    coachHistory.push({ role: "assistant", content: error.message || "I couldn't connect. Please try again." });
    save("lockin_coach_history", coachHistory);
  } finally {
    $("#coachInput").disabled = false; renderCoachHistory(); $("#coachInput").focus();
  }
}
$("#coachForm").addEventListener("submit", e => { e.preventDefault(); sendCoachMessage($("#coachInput").value); });
$("#coachMessages").addEventListener("click", e => {
  const button = e.target.closest(".suggestion");
  if (button) sendCoachMessage(button.dataset.prompt);
});
$("#clearChat").addEventListener("click", () => {
  coachHistory = []; save("lockin_coach_history", coachHistory); renderCoachHistory(); toast("Chat cleared");
});

$("#todayLabel").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
$("#dateChip").textContent = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
$("#focusTask").value = load("lockin_focus_task", "");
renderAll(); renderCoachHistory(); chooseTimer(25);
