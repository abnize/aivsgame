console.log("🐰 퀴즈 시스템 로딩됨");

// =================================================
// quizOverlay가 React에서 생성될 때까지 대기
// =================================================
let retry = 0;
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
// ⭐ CSS 자동 삽입 (요구사항 반영)
// =================================================
(function injectQuizCSS() {
  const style = document.createElement("style");
  style.innerHTML = `
    #pauseBtn {
      background: #ffcee6;
      border: none;
      padding: 8px 15px;
      border-radius: 12px;
      font-weight: bold;
      cursor: pointer;
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 9999;
    }

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

  let quizCache = [];
  let inQuiz = false;
  let quizInterval = 4000;

  window.score = window.score || 0;
  window.level = window.level || 1;
  window.combo = window.combo || 0;

  // =================================================
  // ⭐ 일시정지 기능 (테트리스 포함 전체 pause)
  // =================================================
  let isPaused = false;

  // pause 오버레이 DOM 삽입
  const pauseOverlay = document.createElement("div");
  pauseOverlay.id = "pauseOverlay";
  pauseOverlay.innerHTML = `<button id="resumeBtn">계속하기</button>`;
  document.body.appendChild(pauseOverlay);

  // pause 버튼 생성 (기존 AI 퀴즈 받기 버튼 대체)
  let waitBtn = setInterval(() => {
    const btn = document.getElementById("aiBtn");
    if (btn) {
      clearInterval(waitBtn);

      // ⭐ 버튼 이름 변경 + ID 변경
      btn.id = "pauseBtn";
      btn.innerText = "⏸ 일시정지";

      btn.onclick = () => {
        isPaused = true;

        // 테트리스 드롭 멈춤
        if (window.dropTimer) clearInterval(window.dropTimer);
        window.gamePaused = true;

        pauseOverlay.style.display = "flex";
      };
    }
  }, 200);

  // ⭐ 계속하기 버튼
  document.addEventListener("click", (e) => {
    if (e.target.id === "resumeBtn") {
      isPaused = false;

      // 테트리스 드롭 재개
      if (window.startDropLoop) window.startDropLoop();
      window.gamePaused = false;

      pauseOverlay.style.display = "none";
    }
  });

  // ===============================
  // 🐰 토끼 이미지 & 말풍선 헬퍼
  // ===============================
  function img(file, text) {
    const bunny = document.getElementById("bunny-img");
    if (bunny) bunny.src = "/" + file;
    bunnyBubble.innerText = text;
  }

  // ===============================
  // ✅ 토끼 혼잣말 생성 + 서버에 저장
  // ===============================
function generateBunnyChat() {
  const foods = [
    "오므라이스","갈비", "우육면", "양념치킨", "오징어회",
     "광어회", "돈가스", "돈카츠", "냉면", "불닭볶으면", "로제떡볶이",
      "계란찜", "부침개", "초밥", "피자", "라면", "치킨", "샐러드", "스파게티",
    "멘보샤", "새우튀김우동", "볶음밥", "한우A++", "등심카츠", "토마토설탕무침",
  "파닭", "문어숙회", "젓국", "게국지", "김밥", "짜파게티", "짬뽕", "날달걀"
  ];
  const breakfast = ["계란찜", "토스트", "우유", "시리얼", "미역국", "샐러드"];
  const lunchFoods = ["냉면", "돈가스", "불고기덮밥", "김치찌개", "마라탕", "파스타"];
  const nightFoods = ["라면", "치킨", "피자", "떡볶이", "부대찌개", "우동"];

  const hobbies = [
    "뜨개질","건담조립", "요리", "작곡", "게임", "코딩",
    "런닝", "운동", "재봉", "농사", "농구", "수영", "독서", "산책", "낚시", "노래"
  ];

  const moodsMorning = ["오늘은 상쾌해!", "기분 좋아!", "뭔가 힘이 나!", "잘 일어난 것 같아 😊"
    ,"하늘이 엄청 예뻐~", "잠을 잘 못 잔 것 같아..."
  ];
  const moodsNight = ["조금 피곤하네", "눕고 싶어…", "졸려 😪", "하암… 오늘 하루 길었다"
    ,"그냥 조용히 있고 싶어.", "달을 보러 갈래?", "와아. 별이 반짝거려~아. 건물 불빛이네."
  ];
  const moodsNormal = ["행복해", "기분 최고야!", "그럭저럭 괜찮아~", "지루하네"];

    const hour = new Date().getHours();

  let moodSource =
      hour < 12 ? moodsMorning :
      hour < 19 ? moodsNormal :
                  moodsNight;

  let chatObj;
  const r = Math.random();

  if (r < 0.33) {
    const pick = foods[Math.floor(Math.random() * foods.length)];
    chatObj = { type: "food", text: pick };
  } else if (r < 0.66) {
    const pick = hobbies[Math.floor(Math.random() * hobbies.length)];
    chatObj = { type: "hobby", text: pick };
  } else {
    const pick = moodSource[Math.floor(Math.random() * moodSource.length)];
    chatObj = { type: "mood", text: pick };
  }

  fetch("/api/save_chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(chatObj)
  });

  if (chatObj.type === "food")
    return `나는 ${chatObj.text}를 좋아해! 🐰`;

  if (chatObj.type === "hobby")
    return `요즘 ${chatObj.text}에 빠졌어 🐰`;

  return `오늘은 ${chatObj.text} 😊`;
}

  // ===============================
  // 서버 퀴즈 불러오기
  // ===============================
  async function preloadQuizzes() {
    if (isPaused) return;
    try {
      const res = await fetch(`/api/get_quiz_batch?level=${window.level}&n=5`);
      quizCache = await res.json();
    } catch (err) {
      console.error("퀴즈 로드 실패", err);
    }
  }

  // ===============================
  // 퀴즈 표시
  // ===============================
  function displayQuiz(q) {
    if (isPaused) return;
    qText.textContent = q.question;
    qOptions.innerHTML = "";

    (q.options || []).forEach(opt => {
      const btn = document.createElement("button");
      btn.textContent = opt;
      btn.onclick = () => checkAnswer(opt, q.answer);
      qOptions.appendChild(btn);
    });

    overlay.classList.remove("hidden");
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
    overlay.classList.remove("hidden");
    overlay.style.display = "flex";

    setTimeout(() => {
      if (!isPaused) {
        overlay.classList.add("hidden");
        overlay.style.display = "none";
      }
    }, 3800);
  }

  // ===============================
  // 문제 출제
  // ===============================
  async function triggerQuiz() {
    if (inQuiz || isPaused) return;

    if (!quizCache.length) {
      await preloadQuizzes();
    }

    const q = quizCache.pop();
    if (!q) return;

    if (q.type === "chat")
      return showChat(generateBunnyChat());

    return displayQuiz(q);
  }

  // ===============================
  // 반복 루프 (pause 완벽 대응)
  // ===============================
  let quizTimer = null;

  function startQuizLoop() {
    if (quizTimer) clearTimeout(quizTimer);

    quizTimer = setTimeout(async () => {
      if (!inQuiz && !isPaused) await triggerQuiz();
      startQuizLoop();
    }, quizInterval);
  }

  startQuizLoop();


  // ===============================
  // 정답 처리
  // ===============================
  function quizCorrect() {
    if (isPaused) return;

    window.score += 50;
    scoreDom.innerText = window.score;

    window.combo++;
    if (window.combo >= 3) {
      window.level++;
      window.combo = 0;
      levelDom.innerText = window.level;
      img("bunny_surprised.PNG", "레벨 업! 😲");
    } else img("bunny_happy.PNG", "정답! 🐰");

    overlay.classList.add("hidden");
    inQuiz = false;
  }

  // ===============================
  // 오답 처리
  // ===============================
  let wrongCombo = 0;

  function quizWrong() {
    if (isPaused) return;

    wrongCombo++;
    img("bunny_sad.PNG", "틀렸어 😢");

    if (wrongCombo >= 3) {
      wrongCombo = 0;
      img("bunny_angry.PNG", "벌칙 발동 😡");
      if (window.addPenalty) window.addPenalty();
    }

    overlay.classList.add("hidden");
    inQuiz = false;
  }

  function checkAnswer(sel, correct) {
    sel === correct ? quizCorrect() : quizWrong();
  }
}
