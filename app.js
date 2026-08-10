const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRj2u2mNdNoaxrTnuNN3wcDEEZze0pZJEVlnrihL0UAA3cIyZop2xwRu5rsSgcsnIJ2PWDacDNaSjr9/pub?output=csv";

const CONTENT_TEMPLATE_CANDIDATES = [
  "Card Back Horizontal Master.png", "back.png", "Back.png",
  "assets/cards/Card Back Horizontal Master.png", "assets/cards/back.png", "assets/cards/Back.png"
];
const LOGO_TEMPLATE_CANDIDATES = [
  "Card Front Horizontal Master.png", "front.png", "Front.png",
  "assets/cards/Card Front Horizontal Master.png", "assets/cards/front.png", "assets/cards/Front.png"
];
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
const CATEGORY_PREFIX = {
  CI: "Check In", CO: "Check Out", FD: "Front Desk", PH: "Telephone",
  RM: "Rooms", HA: "Hotel Amenities", BV: "Bonvoy", ME: "Meetings/Events",
  SS: "Service Standards", LU: "Level Up"
};
const MODE_NAMES = {
  standard: "Standard Deck",
  category: "Pick a Category",
  elimination: "Category Elimination",
  roulette: "Category Roulette",
  challenge: "10-Card Challenge"
};

const $ = id => document.getElementById(id);
const els = {
  app: $("app"), controlsPanel: $("controlsPanel"), hideControlsBtn: $("hideControlsBtn"), showControlsBtn: $("showControlsBtn"),
  contentTemplate: $("contentTemplate"), logoTemplate: $("logoTemplate"), cardShell: $("cardShell"), logoFace: $("logoFace"),
  headerTapZone: $("headerTapZone"), centerTapZone: $("centerTapZone"), footerTapZone: $("footerTapZone"),
  cardTitle: $("cardTitle"), cardId: $("cardId"), textLayout: $("textLayout"), scenarioText: $("scenarioText"),
  answerWrap: $("answerWrap"), answerText: $("answerText"), imageLayout: $("imageLayout"), cardImage: $("cardImage"),
  imagePrompt: $("imagePrompt"), imageAnswerWrap: $("imageAnswerWrap"), imageAnswerText: $("imageAnswerText"),
  statusText: $("statusText"), flipBtn: $("flipBtn"), revealBtn: $("revealBtn"), hideBtn: $("hideBtn"),
  resetDeckBtn: $("resetDeckBtn"), fullscreenBtn: $("fullscreenBtn"), gotoSelect: $("gotoSelect"), gotoBtn: $("gotoBtn"),
  loadingMask: $("loadingMask"), howToPlayBtn: $("howToPlayBtn"), gameModeBtn: $("gameModeBtn"), modeBanner: $("modeBanner"),
  modeName: $("modeName"), exitModeBtn: $("exitModeBtn"), howToPlayModal: $("howToPlayModal"), gameModeModal: $("gameModeModal"),
  categoryModal: $("categoryModal"), categoryGrid: $("categoryGrid"), categoryProgress: $("categoryProgress"),
  resultModal: $("resultModal"), resultMessage: $("resultMessage"), playAgainBtn: $("playAgainBtn"),
  challengeScore: $("challengeScore"), challengeProgress: $("challengeProgress"), challengeMissBtn: $("challengeMissBtn"), challengeGotBtn: $("challengeGotBtn")
};

const state = {
  deck: [], unusedIndices: [], currentCard: null, currentIndex: -1,
  isAnimating: false, showingContent: false, answerVisible: false, controlsVisible: true,
  gameMode: "standard", categories: [], eliminationRemaining: [], currentCategory: "",
  challengeRound: 0, challengeScore: 0, challengeScored: false, immersive: false
};

function parseCsvLine(line) {
  const result = [];
  let current = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i], next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim()); current = "";
    } else current += ch;
  }
  result.push(current.trim());
  return result;
}

function categoryFor(card) {
  if (card.Category) return card.Category;
  const prefix = String(card.CardID || "").split("-")[0].toUpperCase();
  return CATEGORY_PREFIX[prefix] || "Other";
}

function normalizeCard(row) {
  const card = {
    CardID: (row.CardID || "").trim(),
    CardType: ((row.CardType || "text").trim().toLowerCase()),
    Title: (row.Title || "").trim(), Scenario: (row.Scenario || "").trim(),
    ProfessionalApproach: (row.ProfessionalApproach || "").trim(), ImageURL: (row.ImageURL || "").trim(),
    ImagePrompt: (row.ImagePrompt || "").trim(), Active: ((row.Active || "Y").trim().toUpperCase()),
    Category: (row.Category || "").trim(), SortOrder: (row.SortOrder || "").trim()
  };
  card.ResolvedCategory = categoryFor(card);
  return card;
}

function refreshDeckPool() { state.unusedIndices = state.deck.map((_, i) => i); }
function removeFromUnused(index) { state.unusedIndices = state.unusedIndices.filter(i => i !== index); }
function setStatus(text) { els.statusText.textContent = text; }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function overflow(el) { return el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1; }

function fitSingle(el, max, min) {
  el.style.fontSize = max + "px";
  for (let size = max; size > min && overflow(el); size -= .5) el.style.fontSize = (size - .5) + "px";
}

function fitBlock(block, text, label, maxText, minText, maxLabel, minLabel) {
  let textSize = maxText, labelSize = maxLabel;
  text.style.fontSize = textSize + "px"; label.style.fontSize = labelSize + "px";
  for (let guard = 0; overflow(block) && guard < 100; guard++) {
    if (textSize > minText) { textSize -= .5; text.style.fontSize = textSize + "px"; }
    else if (labelSize > minLabel) { labelSize -= .5; label.style.fontSize = labelSize + "px"; }
    else break;
  }
}

function fitAll() {
  requestAnimationFrame(() => {
    const width = els.cardShell.getBoundingClientRect().width || 400;
    if (els.cardTitle.textContent) fitSingle(els.cardTitle, Math.min(29, Math.max(18, width * .047)), Math.max(12, width * .029));
    els.cardId.style.fontSize = Math.min(22, Math.max(14, width * .036)) + "px";
    if (!state.currentCard) return;
    if (state.currentCard.CardType !== "image") {
      const blocks = els.textLayout.querySelectorAll(".text-block"), labels = els.textLayout.querySelectorAll(".section-label");
      const maxText = Math.min(27, Math.max(16, width * .040)), minText = Math.max(12, width * .028);
      const maxLabel = Math.min(20, Math.max(13, width * .030)), minLabel = Math.max(10, width * .023);
      if (blocks[0] && labels[0]) fitBlock(blocks[0], els.scenarioText, labels[0], maxText, minText, maxLabel, minLabel);
      if (blocks[1] && labels[1]) fitBlock(blocks[1], els.answerText, labels[1], maxText, minText, maxLabel, minLabel);
    } else {
      let size = Math.min(23, Math.max(14, width * .038)), min = Math.max(10, width * .024);
      els.imagePrompt.style.fontSize = els.imageAnswerText.style.fontSize = size + "px";
      for (let guard = 0; overflow(els.imageLayout) && size > min && guard < 60; guard++) {
        size -= .5; els.imagePrompt.style.fontSize = els.imageAnswerText.style.fontSize = size + "px";
      }
    }
  });
}

function showModal(el) { if (el) el.hidden = false; }
function hideModal(el) { if (el) el.hidden = true; }
function hideAllModals() { document.querySelectorAll(".modal-backdrop").forEach(m => m.hidden = true); }

function updateChallengePanel() {
  if (state.gameMode !== "challenge") { els.challengeScore.hidden = true; return; }
  els.challengeProgress.textContent = `Card ${Math.max(1, state.challengeRound)} of 10 • Score ${state.challengeScore}`;
  els.challengeScore.hidden = !state.answerVisible || state.challengeScored;
}

function hideAnswer() {
  els.answerWrap.classList.add("hidden"); els.imageAnswerWrap.classList.add("hidden");
  state.answerVisible = false;
  els.revealBtn.disabled = !state.currentCard || !state.currentCard.ProfessionalApproach || state.isAnimating || !state.showingContent;
  els.hideBtn.disabled = true;
  updateChallengePanel(); fitAll();
}

function showAnswer() {
  if (!state.currentCard || !state.currentCard.ProfessionalApproach || state.isAnimating || !state.showingContent) return;
  (state.currentCard.CardType === "image" ? els.imageAnswerWrap : els.answerWrap).classList.remove("hidden");
  state.answerVisible = true; els.revealBtn.disabled = true; els.hideBtn.disabled = false;
  updateChallengePanel(); fitAll();
}
function toggleAnswer() { state.answerVisible ? hideAnswer() : showAnswer(); }

function testImage(src) { return new Promise(resolve => { const img = new Image(); img.onload = () => resolve(src); img.onerror = () => resolve(null); img.src = src; }); }
async function firstImage(candidates) { for (const src of candidates) if (await testImage(src)) return src; return ""; }
async function resolveCardImage(card) {
  if (card.CardType !== "image") return "";
  const raw = card.CardID.trim(), normalized = raw.replace(/[^A-Za-z0-9]/g, ""), candidates = [];
  for (const ext of IMAGE_EXTENSIONS) candidates.push(`${raw}.${ext}`, `${normalized}.${ext}`, `assets/cards/${raw}.${ext}`, `assets/cards/${normalized}.${ext}`);
  return firstImage(card.ImageURL ? [card.ImageURL, ...candidates] : candidates);
}

async function renderCard(card) {
  state.currentCard = card; state.answerVisible = false; state.challengeScored = false;
  els.cardTitle.textContent = card.Title; els.cardId.textContent = card.CardID; els.scenarioText.textContent = card.Scenario || "";
  els.answerText.textContent = els.imageAnswerText.textContent = card.ProfessionalApproach || "";
  els.answerWrap.classList.add("hidden"); els.imageAnswerWrap.classList.add("hidden"); els.imagePrompt.textContent = ""; els.cardImage.removeAttribute("src");
  if (card.CardType === "image") {
    els.textLayout.style.display = "none"; els.imageLayout.style.display = "flex";
    const src = await resolveCardImage(card); if (src) els.cardImage.src = src; els.imagePrompt.textContent = card.ImagePrompt || "";
  } else { els.textLayout.style.display = "grid"; els.imageLayout.style.display = "none"; }
  els.hideBtn.disabled = true; updateChallengePanel(); fitAll();
}

async function showCardByIndex(index, label = "Showing") {
  if (!state.deck.length || state.isAnimating || index < 0 || index >= state.deck.length) return;
  state.isAnimating = true; state.currentIndex = index;
  [els.flipBtn, els.revealBtn, els.hideBtn, els.gotoBtn].forEach(el => el.disabled = true);
  const card = state.deck[index]; removeFromUnused(index);
  if (state.showingContent) {
    setStatus("Returning to front…"); els.cardShell.classList.remove("show-content"); state.showingContent = false; await wait(1050);
  }
  setStatus("Flipping card…"); await renderCard(card); await wait(180);
  els.cardShell.classList.add("show-content"); state.showingContent = true; fitAll(); await wait(1080);
  state.isAnimating = false; els.flipBtn.disabled = false; els.revealBtn.disabled = !card.ProfessionalApproach; els.gotoBtn.disabled = !els.gotoSelect.value;
  const cat = card.ResolvedCategory ? ` • ${card.ResolvedCategory}` : "";
  if (state.gameMode === "challenge") setStatus(`Challenge ${state.challengeRound}/10${cat} • ${card.CardID}`);
  else setStatus(`${label} ${card.CardID}${cat}`);
  updateModeControls();
}

function randomIndexFrom(indices) { return indices.length ? indices[Math.floor(Math.random() * indices.length)] : -1; }
function availableIndicesForCategory(category) {
  let indices = state.unusedIndices.filter(i => state.deck[i].ResolvedCategory === category);
  if (!indices.length) {
    const all = state.deck.map((card, i) => card.ResolvedCategory === category ? i : -1).filter(i => i >= 0);
    indices = all;
  }
  return indices;
}
function pickRandomIndex() {
  if (!state.unusedIndices.length) refreshDeckPool();
  return randomIndexFrom(state.unusedIndices);
}

async function flipRandomCard() { const index = pickRandomIndex(); if (index >= 0) await showCardByIndex(index); }
async function drawFromCategory(category) {
  hideModal(els.categoryModal); state.currentCategory = category;
  const index = randomIndexFrom(availableIndicesForCategory(category));
  if (index < 0) { setStatus(`No active cards found for ${category}.`); return; }
  if (state.gameMode === "elimination") state.eliminationRemaining = state.eliminationRemaining.filter(c => c !== category);
  await showCardByIndex(index, category);
}
async function rouletteDraw() {
  if (!state.categories.length) return;
  const category = state.categories[Math.floor(Math.random() * state.categories.length)];
  state.currentCategory = category;
  await drawFromCategory(category);
}

function renderCategoryPicker() {
  const elimination = state.gameMode === "elimination";
  els.categoryGrid.innerHTML = "";
  state.categories.forEach(category => {
    const button = document.createElement("button"); button.type = "button"; button.className = "category-choice"; button.textContent = category;
    const done = elimination && !state.eliminationRemaining.includes(category);
    if (done) { button.disabled = true; button.classList.add("done"); }
    else button.onclick = () => drawFromCategory(category);
    els.categoryGrid.appendChild(button);
  });
  if (elimination) els.categoryProgress.textContent = `${state.categories.length - state.eliminationRemaining.length} of ${state.categories.length} categories completed`;
  else els.categoryProgress.textContent = "Choose any category for the next card.";
}

function openCategoryPicker() {
  if (!state.categories.length) { setStatus("No categories were found in the deck."); return; }
  if (state.gameMode === "elimination" && !state.eliminationRemaining.length) {
    completeElimination(); return;
  }
  renderCategoryPicker(); showModal(els.categoryModal);
}

function updateModeControls() {
  const mode = state.gameMode;
  els.modeBanner.hidden = mode === "standard";
  els.modeName.textContent = MODE_NAMES[mode];
  els.gotoSelect.disabled = mode !== "standard"; els.gotoBtn.disabled = mode !== "standard" || !els.gotoSelect.value;
  if (mode === "standard") els.flipBtn.textContent = "Flip Card";
  if (mode === "category") els.flipBtn.textContent = "Choose Category";
  if (mode === "elimination") els.flipBtn.textContent = state.eliminationRemaining.length ? "Choose Category" : "Finish Game";
  if (mode === "roulette") els.flipBtn.textContent = "Spin Again";
  if (mode === "challenge") els.flipBtn.textContent = "Next Card";
  updateChallengePanel();
}

async function nextAction() {
  if (state.isAnimating) return;
  if (state.gameMode === "standard") return flipRandomCard();
  if (state.gameMode === "category") return openCategoryPicker();
  if (state.gameMode === "elimination") return openCategoryPicker();
  if (state.gameMode === "roulette") return rouletteDraw();
  if (state.gameMode === "challenge") {
    if (state.currentCard && !state.challengeScored) {
      setStatus(state.answerVisible ? "Score this card with Got It or Missed It." : "Reveal the answer, then score this card.");
      return;
    }
    return startChallengeRound();
  }
}

async function resetDeck(keepMode = true) {
  if (state.isAnimating) return;
  refreshDeckPool(); state.currentCard = null; state.currentIndex = -1; state.showingContent = state.answerVisible = false;
  [els.cardTitle, els.cardId, els.scenarioText, els.answerText, els.imageAnswerText, els.imagePrompt].forEach(el => el.textContent = "");
  els.cardImage.removeAttribute("src"); els.textLayout.style.display = "grid"; els.imageLayout.style.display = "none";
  els.answerWrap.classList.add("hidden"); els.imageAnswerWrap.classList.add("hidden"); els.cardShell.classList.remove("show-content");
  els.revealBtn.disabled = els.hideBtn.disabled = true; els.challengeScore.hidden = true;
  if (!keepMode) state.gameMode = "standard";
  setStatus(state.gameMode === "standard" ? "Deck reset. Tap the card or use Flip Card to start." : `${MODE_NAMES[state.gameMode]} ready.`);
  updateModeControls();
}

async function selectMode(mode) {
  hideModal(els.gameModeModal); state.gameMode = mode;
  state.currentCategory = ""; state.challengeRound = 0; state.challengeScore = 0; state.challengeScored = false;
  state.eliminationRemaining = [...state.categories];
  await resetDeck(true); updateModeControls();
  if (mode === "category" || mode === "elimination") openCategoryPicker();
  else if (mode === "roulette") await rouletteDraw();
  else if (mode === "challenge") await startChallengeRound();
}

async function exitGameMode() { await resetDeck(false); }

async function startChallengeRound() {
  if (state.challengeRound >= 10) { completeChallenge(); return; }
  state.challengeRound++; state.challengeScored = false;
  await flipRandomCard(); updateChallengePanel();
}

async function scoreChallenge(gotIt) {
  if (state.gameMode !== "challenge" || state.challengeScored || !state.answerVisible) return;
  state.challengeScored = true; if (gotIt) state.challengeScore++;
  els.challengeScore.hidden = true;
  if (state.challengeRound >= 10) completeChallenge();
  else { setStatus(`${gotIt ? "Got it!" : "Marked missed."} Score ${state.challengeScore}/${state.challengeRound}. Tap Next Card.`); updateModeControls(); }
}

function completeChallenge() {
  els.resultMessage.innerHTML = `<strong>${state.challengeScore} out of 10</strong><br>${state.challengeScore >= 8 ? "Excellent service recovery knowledge!" : state.challengeScore >= 6 ? "Nice work — review the missed cards and go again." : "Good practice round. Review the Professional Approaches and try again."}`;
  showModal(els.resultModal);
}
function completeElimination() {
  els.resultMessage.innerHTML = `<strong>All ${state.categories.length} categories completed!</strong><br>You worked through the entire service recovery mix.`;
  showModal(els.resultModal);
}
async function playAgain() { hideModal(els.resultModal); await selectMode(state.gameMode); }

async function goToSelectedCard() {
  const index = state.deck.findIndex(card => card.CardID === els.gotoSelect.value);
  if (index >= 0 && !state.isAnimating) await showCardByIndex(index);
}

function setControlsVisible(visible) {
  state.controlsVisible = visible; els.controlsPanel.hidden = !visible; els.showControlsBtn.hidden = visible;
  els.app.classList.toggle("controls-hidden", !visible); fitAll();
}

async function enterImmersive() {
  state.immersive = true; document.body.classList.add("immersive-mobile"); setControlsVisible(false);
  els.showControlsBtn.hidden = false; els.showControlsBtn.textContent = "Full Screen"; els.fullscreenBtn.textContent = "Exit Full Screen";
  window.scrollTo(0, 0); fitAll();
}
async function exitImmersive() {
  state.immersive = false; document.body.classList.remove("immersive-mobile");
  if (document.fullscreenElement && document.exitFullscreen) { try { await document.exitFullscreen(); } catch (e) {} }
  els.showControlsBtn.textContent = "☰ Controls"; els.fullscreenBtn.textContent = "Full Screen"; setControlsVisible(true); fitAll();
}
async function toggleFullscreen() {
  if (state.immersive) return exitImmersive();
  const mobileLike = window.matchMedia("(max-width: 720px)").matches || navigator.maxTouchPoints > 0;
  if (!mobileLike && document.documentElement.requestFullscreen) {
    try { await document.documentElement.requestFullscreen(); els.fullscreenBtn.textContent = "Exit Full Screen"; return; } catch (e) {}
  }
  if (mobileLike && document.documentElement.requestFullscreen) { try { await document.documentElement.requestFullscreen(); } catch (e) {} }
  await enterImmersive();
}

async function loadSheetData() {
  const response = await fetch(SHEET_URL); if (!response.ok) throw Error(response.status);
  const lines = (await response.text()).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n").filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line), row = {}; headers.forEach((header, i) => row[header] = values[i] || ""); return normalizeCard(row);
  }).filter(card => card.Active === "Y" && card.CardID && card.Title);
}

function populateGotoMenu() {
  els.gotoSelect.innerHTML = '<option value="">Go to card…</option>';
  [...state.deck].sort((a, b) => (Number(a.SortOrder) || 999999) - (Number(b.SortOrder) || 999999) || a.CardID.localeCompare(b.CardID)).forEach(card => {
    const option = document.createElement("option"); option.value = card.CardID; option.textContent = `${card.CardID} — ${card.Title}`; els.gotoSelect.appendChild(option);
  });
}

function keyActivate(event, callback) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); callback(); } }

function wire() {
  els.flipBtn.onclick = nextAction; els.revealBtn.onclick = showAnswer; els.hideBtn.onclick = hideAnswer; els.resetDeckBtn.onclick = () => resetDeck(true);
  els.fullscreenBtn.onclick = toggleFullscreen; els.gotoBtn.onclick = goToSelectedCard;
  els.gotoSelect.onchange = () => els.gotoBtn.disabled = state.gameMode !== "standard" || !els.gotoSelect.value || state.isAnimating;
  els.hideControlsBtn.onclick = () => setControlsVisible(false);
  els.showControlsBtn.onclick = () => state.immersive ? exitImmersive() : setControlsVisible(true);
  els.howToPlayBtn.onclick = () => showModal(els.howToPlayModal); els.gameModeBtn.onclick = () => showModal(els.gameModeModal);
  els.exitModeBtn.onclick = exitGameMode; els.challengeGotBtn.onclick = () => scoreChallenge(true); els.challengeMissBtn.onclick = () => scoreChallenge(false);
  els.playAgainBtn.onclick = playAgain;
  els.logoFace.onclick = els.headerTapZone.onclick = els.footerTapZone.onclick = nextAction; els.centerTapZone.onclick = toggleAnswer;
  [[els.logoFace, nextAction], [els.headerTapZone, nextAction], [els.footerTapZone, nextAction], [els.centerTapZone, toggleAnswer]].forEach(([el, cb]) => el.onkeydown = e => keyActivate(e, cb));
  document.querySelectorAll("[data-close]").forEach(button => button.onclick = () => hideModal($(button.dataset.close)));
  document.querySelectorAll(".mode-choice").forEach(button => button.onclick = () => selectMode(button.dataset.mode));
  document.querySelectorAll(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", e => { if (e.target === backdrop) hideModal(backdrop); }));
  document.addEventListener("keydown", e => { if (e.key === "Escape") hideAllModals(); });
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && !state.immersive) els.fullscreenBtn.textContent = "Full Screen";
    setTimeout(fitAll, 50);
  });
  let resizeTimer; window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fitAll, 120); });
  window.addEventListener("orientationchange", () => setTimeout(fitAll, 250));
}

async function init() {
  wire();
  const [back, front] = await Promise.all([firstImage(CONTENT_TEMPLATE_CANDIDATES), firstImage(LOGO_TEMPLATE_CANDIDATES)]);
  if (back) els.contentTemplate.src = back; if (front) els.logoTemplate.src = front;
  try {
    state.deck = await loadSheetData(); refreshDeckPool(); populateGotoMenu();
    state.categories = [...new Set(state.deck.map(card => card.ResolvedCategory).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    state.eliminationRemaining = [...state.categories];
    if (!state.deck.length) { setStatus("No active cards found. Check your Google Sheet and Active column."); return; }
    els.gotoBtn.disabled = true; updateModeControls(); setStatus("Ready. Tap the card or use Flip Card to start.");
  } catch (error) {
    console.error(error); setStatus("Could not load Google Sheet. Check your published CSV link.");
  } finally { els.loadingMask.style.display = "none"; }
}

init();