if (window.__TETRIS_LOADED__) {
  console.warn("⚠️ Tetris already loaded - skip");
}
window.__TETRIS_LOADED__ = true;

console.log("🎮 Tetris game loaded...");

let canvas, ctx;

const ROWS = 20;
const COLS = 10;
const BLOCK = 20;
const COLORS = ["#FF595E", "#FFCA3A", "#8AC926", "#1982C4", "#6A4C93"];

let board;
let level = 1;
let score = 0;
let combo = 0;

let penaltyStack = 0;
const maxPenaltyBeforeGarbage = 3;

// ⭐ 일시정지 플래그 기본값
window.gamePaused = window.gamePaused || false;

// ============================
// ✅ React에서 호출할 초기화 함수
// ============================
window.initTetris = function () {
  canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    console.error("❌ canvas not found");
    return;
  }

  ctx = canvas.getContext("2d");
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);  // ⭐ 소프트드랍 해제용

  update();
};

// 테트리스 벌칙용 “벽 줄” 색상
const WALL_COLOR = "#222222";

// ✅ 오답 3번마다 바로 한 줄 추가
window.addPenalty = function () {
  console.warn("벌칙 발동 → 맨 아래에 검은 벽 1줄 추가");
  addGarbageLine();
};

// ✅ 위 한 줄 제거 + 아래에 벽 줄 추가 (영구)
function addGarbageLine() {
  // 맨 위 줄 제거
  board.shift();

  // 맨 아래에 “벽” 줄 추가
  board.push(Array(COLS).fill(WALL_COLOR));

  drawBoard();
}


// ============================
// 🧱 블록 모양
// ============================
const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 1],[1, 1]],
  [[0, 1, 0],[1, 1, 1]],
  [[1, 0, 0],[1, 1, 1]],
  [[0, 0, 1],[1, 1, 1]],
];

let player = {
  x: 3,
  y: 0,
  shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
  color: COLORS[Math.floor(Math.random() * COLORS.length)],
};

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) {
        ctx.fillStyle = board[r][c];
        ctx.fillRect(c * BLOCK, r * BLOCK, BLOCK - 1, BLOCK - 1);
      }
    }
  }
}

function drawPiece() {
  ctx.fillStyle = player.color;
  player.shape.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val) {
        ctx.fillRect(
          (player.x + c) * BLOCK,
          (player.y + r) * BLOCK,
          BLOCK - 1,
          BLOCK - 1
        );
      }
    });
  });
}

function collision(offsetX = 0, offsetY = 0, shape = player.shape) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const newX = player.x + c + offsetX;
      const newY = player.y + r + offsetY;
      if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
      if (newY >= 0 && board[newY][newX]) return true;
    }
  }
  return false;
}

function mergePiece() {
  player.shape.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val) board[player.y + r][player.x + c] = player.color;
    });
  });
}

function resetPiece() {
  player = {
    x: 3,
    y: 0,
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };

  if (collision()) {
    alert("게임오버 😭");
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }
}

function clearLines() {
  for (let r = ROWS - 1; r >= 0; r--) {
    const row = board[r];
    const isFull = row.every(v => v);
    const isWall = row.every(v => v === WALL_COLOR); // 벌칙 줄인지 확인

    // ✅ 꽉 찼지만 “벌칙 벽 줄”이면 지우지 않음
    if (isFull && !isWall) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(0));
      r++;
    }
  }
}

// ============================
// 🔁 게임 루프 + 소프트드랍 + 일시정지
// ============================

// ⭐ 기본 낙하 속도 / 현재 속도
let baseDropInterval = 800;
let dropInterval = baseDropInterval;
let dropCounter = 0;
let lastTime = 0;

function update(time = 0) {
  // ⭐ 일시정지 시에는 상태만 유지하고 진행 멈춤
  if (window.gamePaused) {
    requestAnimationFrame(update);
    return;
  }

  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;

  if (dropCounter > dropInterval) {
    if (!collision(0, 1)) player.y++;
    else {
      mergePiece();
      clearLines();
      resetPiece();
    }
    dropCounter = 0;
  }

  drawBoard();
  drawPiece();
  requestAnimationFrame(update);
}

// ============================
// 🎮 키보드 입력
// ============================
function handleKeyDown(e) {
  // ⭐ 일시정지 중이면 조작도 막기
  if (window.gamePaused) return;

  switch (e.key) {
    case "ArrowLeft":
      if (!collision(-1, 0)) player.x--;
      break;
    case "ArrowRight":
      if (!collision(1, 0)) player.x++;
      break;
    case "ArrowDown":
      // ⭐ 소프트드랍: 아래 방향키 누르고 있는 동안 빨라짐
      dropInterval = 60;  // 빠른 속도로 낙하
      break;
    case "ArrowUp":
      const rotated = player.shape[0].map((_, i) =>
        player.shape.map(row => row[i]).reverse()
      );
      if (!collision(0, 0, rotated)) player.shape = rotated;
      break;
    case " ":
      // ⭐ 스페이스바 = 하드드랍 (원하면)
      while (!collision(0, 1)) {
        player.y++;
      }
      mergePiece();
      clearLines();
      resetPiece();
      dropCounter = 0;
      break;
  }
}

// ⭐ ArrowDown 뗐을 때 속도 원상복구
function handleKeyUp(e) {
  if (e.key === "ArrowDown") {
    dropInterval = baseDropInterval;
  }
}
