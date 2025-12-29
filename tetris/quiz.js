console.log("🐰 퀴즈 시스템 로딩됨");

// =================================================
// quizOverlay가 React에서 생성될 때까지 대기
// =================================================
let retry = 0;

const STATIC_QUIZZES = [
  {
    question: "테트리스에서 한 줄을 채우면?",
    options: ["점수 감소", "줄 제거", "게임 오버"],
    answer: "줄 제거"
  },
  {
    question: "토끼는 어떤 동물일까?",
    options: ["파충류", "포유류", "양서류"],
    answer: "포유류"
  }
];

const waitForOverlay = setInterval(() => {
  const overlay = document.getElementById("quizOverlay");
  if (overlay) {
    console.log("✅ quizOverlay 발견 → 퀴즈 시스템 시작");
    clearInterval(waitForOverlay);
    startQuizSystem();
  } else {
    retry++;
    if (retry > 30) {
      console.warn("❌ quizOverlay 찾기 실패");
      clearInterval(waitForOverlay);
    }
  }
}, 300);

// =================================================
// ⭐ CSS 자동 삽입
// =================================================
(function injectQuizCSS() {
  const style = document.createElement("style");
  style.innerHTML = `
    #pauseOverlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 99999;
    }
    #pauseOverlay button {
      background: #fff;
      padding: 15px 25px;
      border-radius: 15px;
      font-size: 20px;
      font-weight: bold;
      border: none;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
})();

// =================================================
// 메인 퀴즈 시스템
// =================================================
function startQuizSystem() {
  const overlay = document.getElementById("quizOverlay");
  const qText = document.getElementById("quizQuestion");
  const qOptions = document.getElementById("quizOptions");
  const scoreDom = document.getElementById("sc");
  const levelDom = document.getElementById("lv");
  const bunnyBubble = document.getElementById("bunny-bubble");
  const pauseBtn = document.getElementById("pause-btn");

  let quizCache = [];
  let inQuiz = false;
  let quizInterval = 4000;
  let isPaused = false;

  window.score = window.score || 0;
  window.level = window.level || 1;
  window.combo = window.combo || 0;

  // =================================================
  // 일시정지 오버레이
  // =================================================
  const pauseOverlay = document.createElement("div");
  pauseOverlay.id = "pauseOverlay";
  pauseOverlay.innerHTML = `<button id="resumeBtn">계속하기</button>`;
  document.body.appendChild(pauseOverlay);

  if (pauseBtn) {
    pauseBtn.onclick = () => {
      isPaused = true;
      window.gamePaused = true;
      pauseOverlay.style.display = "flex";
    };
  }

  document.addEventListener("click", (e) => {
    if (e.target.id === "resumeBtn") {
      isPaused = false;
      window.gamePaused = false;
      pauseOverlay.style.display = "none";
    }
  });

  // ===============================
  // 🐰 토끼 이미지 & 말풍선
  // ===============================
  function img(file, text) {
    const bunny = document.getElementById("bunny-img");
    const BASE = window.PUBLIC_URL || "";
    if (bunny) bunny.src = `${BASE}/tetris/${file}`;
    if (bunnyBubble) bunnyBubble.innerText = text;
  }

  // ===============================
  // ✅ 토끼 혼잣말 (서버 저장 제거)
  // ===============================
  function generateBunnyChat() {
    const chats = [
      "오늘 기분 좋아 🐰",
      "게임 재밌다!",
      "집중 중이야…",
      "조금 긴장돼 😳"
    ];
    return chats[Math.floor(Math.random() * chats.length)];
  }

  // ===============================
  // 🚫 서버 퀴즈 제거 → 정적 퀴즈 사용
  // ===============================
  function preloadQuizzes() {
    quizCache = [...STATIC_QUIZZES];
  }

  // ===============================
  // 퀴즈 표시
  // ===============================
  function displayQuiz(q) {
    if (isPaused) return;
    qText.textContent = q.question;
    qOptions.innerHTML = "";

    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.textContent = opt;
      btn.onclick = () => checkAnswer(opt, q.answer);
      qOptions.appendChild(btn);
    });

    overlay.style.display = "flex";
    inQuiz = true;
  }

  // ===============================
  // 혼잣말 표시
  // ===============================
  function showChat(text) {
    if (isPaused) return;
    qText.textContent = text;
    qOptions.innerHTML = "";
    overlay.style.display = "flex";

    setTimeout(() => {
      if (!isPaused) {
        overlay.style.display = "none";
        inQuiz = false;
      }
    }, 3000);
  }

  // ===============================
  // 문제 출제
  // ===============================
  function triggerQuiz() {
    if (inQuiz || isPaused) return;
    if (!quizCache.length) preloadQuizzes();

    const q = quizCache.pop();
    if (!q) return;

    displayQuiz(q);
  }

  // ===============================
  // 반복 루프
  // ===============================
  setInterval(() => {
    triggerQuiz();
  }, quizInterval);

  // ===============================
  // 정답 / 오답
  // ===============================
  let wrongCombo = 0;

  function quizCorrect() {
    window.score += 50;
    if (scoreDom) scoreDom.innerText = window.score;

    window.combo++;
    if (window.combo >= 3) {
      window.level++;
      window.combo = 0;
      if (levelDom) levelDom.innerText = window.level;
      img("bunny_surprised.PNG", "레벨 업! 😲");
    } else {
      img("bunny_happy.PNG", "정답! 🐰");
    }

    overlay.style.display = "none";
    inQuiz = false;
  }

  function quizWrong() {
    wrongCombo++;
    img("bunny_sad.PNG", "틀렸어 😢");

    if (wrongCombo >= 3) {
      wrongCombo = 0;
      img("bunny_angry.PNG", "벌칙 발동 😡");
      if (window.addPenalty) window.addPenalty();
    }

    overlay.style.display = "none";
    inQuiz = false;
  }

  function checkAnswer(sel, correct) {
    sel === correct ? quizCorrect() : quizWrong();
  }
}
