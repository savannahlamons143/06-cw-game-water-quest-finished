// ========================================================
// charity: water – Water Quest Game
// Plain JavaScript DOM implementation
// ========================================================

// Difficulty settings
const DIFFICULTY_CONFIG = {
  easy: {
    name: "Easy",
    goal: 15,
    roundLength: 35,
    spawnDelay: 1200,
    info: "Goal: 15 cans • Time: 35s • Can speed: 1.2s"
  },
  normal: {
    name: "Normal",
    goal: 20,
    roundLength: 30,
    spawnDelay: 1000,
    info: "Goal: 20 cans • Time: 30s • Can speed: 1.0s"
  },
  hard: {
    name: "Hard",
    goal: 25,
    roundLength: 25,
    spawnDelay: 800,
    info: "Goal: 25 cans • Time: 25s • Can speed: 0.8s"
  }
};

const MISS_PENALTY = 1;

// End-of-game message arrays
const winningMessages = [
  "Amazing work! You reached the goal and helped bring clean water!",
  "Quest complete! You made every single drop count!",
  "Splashtastic! That was a truly heroic water run!",
  "Incredible tapping! You beat the challenge with time to spare!"
];

const losingMessages = [
  "Nice try! Start another round and see if you can reach the goal.",
  "The quest isn't over. Dust off your boots and try again!",
  "Almost made it! Pick up another jerry can and give it your all.",
  "Every drop counts! Try another round and beat your score."
];

// Confetti palette matching charity: water brand colors
const CONFETTI_COLORS = ["#FFC907", "#2E9DF7", "#8BD1CB", "#4FCB53", "#FF902A"];

// Game state variables
let selectedDifficultyKey = "normal";
let currentDifficulty = DIFFICULTY_CONFIG.normal;
let currentCans = 0;
let timeLeft = currentDifficulty.roundLength;
let gameActive = false;
let currentCell = null;
let spawnInterval = null;
let timerInterval = null;
let confettiTimeout = null;
let triggeredMilestones = [];
let soundEnabled = true;

// DOM Elements
const grid = document.querySelector(".game-grid");
const scoreDisplay = document.getElementById("current-cans");
const goalDisplay = document.getElementById("goal-cans");
const timerDisplay = document.getElementById("timer");
const achievements = document.getElementById("achievements");
const startButton = document.getElementById("start-game");
const resetButton = document.getElementById("reset-game");
const confettiContainer = document.getElementById("confetti");
const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
const difficultyInfo = document.getElementById("difficulty-info");
const soundToggle = document.getElementById("sound-toggle");

// ========================================================
// Sound Effects using Web Audio API (No external library)
// ========================================================
let audioCtx = null;

function initAudio() {
  if (!soundEnabled) return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Pleasant ascending chime on can collection
function playCollectSound() {
  if (!soundEnabled) return;
  try {
    const ctx = initAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  } catch (err) {
    // Audio may fail if blocked by browser policy
  }
}

// Low tone on penalty/miss
function playMissSound() {
  if (!soundEnabled) return;
  try {
    const ctx = initAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.15);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  } catch (err) {
    // Audio failure safeguard
  }
}

// Triumphant multi-note fanfare on victory
function playWinSound() {
  if (!soundEnabled) return;
  try {
    const ctx = initAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + i * 0.11;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.22, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  } catch (err) {
    // Audio failure safeguard
  }
}

// ========================================================
// Milestone Tracking
// Uses an array of milestone objects and conditionals
// ========================================================
function getMilestones(goal) {
  return [
    {
      threshold: Math.max(1, Math.floor(goal * 0.25)),
      message: "Great start! 1/4 of the way to the goal!"
    },
    {
      threshold: Math.max(2, Math.floor(goal * 0.50)),
      message: "Halfway there! Keep filling those cans!"
    },
    {
      threshold: Math.max(3, Math.floor(goal * 0.75)),
      message: "Almost there! Three-quarters complete!"
    },
    {
      threshold: Math.max(4, goal - 2),
      message: "Just 2 cans left! Sprint to the finish!"
    }
  ];
}

function checkMilestones() {
  const milestones = getMilestones(currentDifficulty.goal);
  let milestoneMessage = null;

  for (let i = 0; i < milestones.length; i++) {
    const item = milestones[i];
    if (currentCans === item.threshold && !triggeredMilestones.includes(item.threshold)) {
      triggeredMilestones.push(item.threshold);
      milestoneMessage = item.message;
      break;
    }
  }

  if (milestoneMessage) {
    achievements.textContent = milestoneMessage;
  } else {
    achievements.textContent = "Can collected! Find the next one.";
  }
}

// ========================================================
// Grid Creation & Management
// ========================================================
function createGrid() {
  grid.innerHTML = "";

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");

    cell.className = "grid-cell";
    cell.setAttribute("role", "button");
    cell.setAttribute("tabindex", "0");
    cell.setAttribute("aria-label", `Empty tile ${i + 1}`);

    // Click activation
    cell.addEventListener("click", () => handleCellClick(cell));

    // Keyboard activation (Enter / Space)
    cell.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleCellClick(cell);
      }
    });

    grid.appendChild(cell);
  }
}

// Update UI displays
function updateScore() {
  scoreDisplay.textContent = currentCans;
}

function updateTimer() {
  timerDisplay.textContent = timeLeft;
}

function updateGoal() {
  goalDisplay.textContent = currentDifficulty.goal;
}

// ========================================================
// Difficulty Selection
// ========================================================
function handleDifficultyChange(event) {
  if (gameActive) return;

  selectedDifficultyKey = event.target.value;
  currentDifficulty = DIFFICULTY_CONFIG[selectedDifficultyKey] || DIFFICULTY_CONFIG.normal;

  // Update description and displays
  difficultyInfo.innerHTML = currentDifficulty.info;
  timeLeft = currentDifficulty.roundLength;
  updateGoal();
  updateTimer();
}

function setDifficultyControlsDisabled(disabled) {
  difficultyRadios.forEach(radio => {
    radio.disabled = disabled;
  });
}

// ========================================================
// Jerry Can Spawning & Movement
// ========================================================
function spawnWaterCan() {
  if (!gameActive) return;

  // If previous can was not collected, apply penalty
  if (currentCell) {
    applyPenalty("Missed can!");
  }

  const cells = document.querySelectorAll(".grid-cell");
  if (cells.length === 0) return;

  // Clear previous tiles
  cells.forEach(cell => {
    cell.innerHTML = "";
    cell.setAttribute("aria-label", "Empty tile");
  });

  // Pick a random tile from 0 to 8
  const randomIndex = Math.floor(Math.random() * cells.length);
  currentCell = cells[randomIndex];

  currentCell.setAttribute(
    "aria-label",
    "Jerry can. Activate to collect one point."
  );

  // Insert the styled water can
  currentCell.innerHTML = `
    <div class="water-can-wrapper">
      <div class="water-can"></div>
    </div>
  `;
}

// ========================================================
// Cell Interaction (Click & Keyboard)
// ========================================================
function handleCellClick(cell) {
  if (!gameActive) return;

  const canIsInThisCell = cell.querySelector(".water-can");

  if (canIsInThisCell) {
    // Award 1 point and remove the can immediately
    currentCans += 1;
    currentCell = null;
    cell.innerHTML = "";
    cell.setAttribute("aria-label", "Empty tile");

    updateScore();
    playCollectSound();

    // Check if goal reached to end round immediately
    if (currentCans >= currentDifficulty.goal) {
      endGame(true);
      return;
    }

    // Check score milestones
    checkMilestones();
  } else {
    // Empty tile penalty
    applyPenalty("Empty tile!");
  }
}

// Deduct 1 point without dropping below zero
function applyPenalty(reason) {
  currentCans = Math.max(0, currentCans - MISS_PENALTY);
  updateScore();
  playMissSound();
  achievements.textContent = `${reason} One point deducted.`;
}

// ========================================================
// Round Lifecycle (Start, End, Reset)
// ========================================================
function startGame() {
  // Prevent starting overlapping rounds
  if (gameActive) return;

  // Clear any existing timers
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  clearTimeout(confettiTimeout);
  confettiContainer.innerHTML = "";

  // Reset round state
  currentCans = 0;
  timeLeft = currentDifficulty.roundLength;
  currentCell = null;
  triggeredMilestones = [];

  createGrid();
  updateScore();
  updateTimer();
  updateGoal();

  gameActive = true;
  setDifficultyControlsDisabled(true);

  startButton.disabled = true;
  startButton.textContent = "Game in progress...";
  resetButton.hidden = false;
  achievements.textContent = "Go! Tap the yellow cans!";

  // Spawn first can immediately
  spawnWaterCan();
  spawnInterval = setInterval(spawnWaterCan, currentDifficulty.spawnDelay);

  // Countdown timer (once per second)
  timerInterval = setInterval(() => {
    timeLeft -= 1;
    updateTimer();

    // End round when timer hits 0
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateTimer();
      endGame(currentCans >= currentDifficulty.goal);
    }
  }, 1000);
}

function endGame(won) {
  if (!gameActive) return;

  gameActive = false;
  currentCell = null;

  clearInterval(spawnInterval);
  clearInterval(timerInterval);

  // Clear remaining cans from board
  document.querySelectorAll(".grid-cell").forEach(cell => {
    cell.innerHTML = "";
    cell.setAttribute("aria-label", "Game over");
  });

  // Pick random message based on win or loss
  const messages = won ? winningMessages : losingMessages;
  const randomIndex = Math.floor(Math.random() * messages.length);
  achievements.textContent = messages[randomIndex];

  startButton.disabled = false;
  startButton.textContent = won ? "Play Again" : "Try Again";
  resetButton.hidden = true;
  setDifficultyControlsDisabled(false);

  if (won) {
    playWinSound();
    celebrateWin();
  }
}

function resetGame() {
  // Clear any active timers
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  clearTimeout(confettiTimeout);
  confettiContainer.innerHTML = "";

  gameActive = false;
  currentCans = 0;
  timeLeft = currentDifficulty.roundLength;
  currentCell = null;
  triggeredMilestones = [];

  createGrid();
  updateScore();
  updateTimer();
  updateGoal();

  achievements.textContent = "Press Start Game when you're ready.";
  startButton.disabled = false;
  startButton.textContent = "Start Game";
  resetButton.hidden = true;
  setDifficultyControlsDisabled(false);
}

// ========================================================
// Confetti Win Animation
// ========================================================
function celebrateWin() {
  confettiContainer.innerHTML = "";

  for (let i = 0; i < 50; i++) {
    const piece = document.createElement("div");

    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.animationDelay = `${Math.random() * 0.5}s`;

    confettiContainer.appendChild(piece);
  }

  confettiTimeout = setTimeout(() => {
    confettiContainer.innerHTML = "";
  }, 3000);
}

// ========================================================
// Sound Toggle Button
// ========================================================
function toggleSound() {
  soundEnabled = !soundEnabled;
  soundToggle.setAttribute("aria-pressed", soundEnabled ? "true" : "false");
  soundToggle.textContent = soundEnabled ? "Sound: ON" : "Sound: MUTED";
}

// ========================================================
// Event Listeners & Initial Page Setup
// ========================================================
startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", resetGame);
soundToggle.addEventListener("click", toggleSound);

difficultyRadios.forEach(radio => {
  radio.addEventListener("change", handleDifficultyChange);
});

// Initial render
createGrid();
updateScore();
updateTimer();
updateGoal();
resetButton.hidden = true;
