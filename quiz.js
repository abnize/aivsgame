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
  let isPaused = false;

  window.score = window.score || 0;
  window.level = window.level || 1;
  window.combo = window.combo || 0;

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

  // 현재 시간
  const hour = new Date().getHours();

  let chatObj;

  // 시간 기반 분기
  if (hour >= 0 && hour <= 5) {
    // 새벽 → 졸림/피곤 기분 증가
    const pick = moodsNight[Math.floor(Math.random() * moodsNight.length)];
    chatObj = { type: "mood", text: pick };

  } else if (hour >= 6 && hour <= 11) {
    // 아침 → 아침식사 음식 or 상쾌한 기분
    if (Math.random() < 0.5) {
      const pick = breakfast[Math.floor(Math.random() * breakfast.length)];
      chatObj = { type: "food", text: pick };
    } else {
      const pick = moodsMorning[Math.floor(Math.random() * moodsMorning.length)];
      chatObj = { type: "mood", text: pick };
    }

  } else if (hour >= 12 && hour <= 14) {
    // 점심 → 점심 음식 비중 증가
    const pick = lunchFoods[Math.floor(Math.random() * lunchFoods.length)];
    chatObj = { type: "food", text: pick };

  } else if (hour >= 15 && hour <= 18) {
    // 오후 → 취미 증가
    const pick = hobbies[Math.floor(Math.random() * hobbies.length)];
    chatObj = { type: "hobby", text: pick };

  } else {
    // 저녁/밤 → 야식 + 느긋함
    if (Math.random() < 0.5) {
      const pick = nightFoods[Math.floor(Math.random() * nightFoods.length)];
      chatObj = { type: "food", text: pick };
    } else {
      const pick = moodsNight[Math.floor(Math.random() * moodsNight.length)];
      chatObj = { type: "mood", text: pick };
    }
  }

  // 서버 저장
  fetch("/api/save_chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(chatObj)
  });

  // 화면 문구
  if (chatObj.type === "food") {
    return `나는 ${chatObj.text} 먹고 싶어! 🐰`;
  } else if (chatObj.type === "hobby") {
    return `요즘 ${chatObj.text}에 빠졌어 🐰`;
  } else {
    return `오늘은 ${chatObj.text} 😊`;
  }
}


  // ===============================
  // ✅ 서버 퀴즈 불러오기
  // ===============================
  async function preloadQuizzes() {
    console.log("📡 퀴즈 요청 중...");
    try {
      const res = await fetch(
        `http://localhost:5000/api/get_quiz_batch?level=${window.level}&n=5`
      );
      quizCache = await res.json();
      console.log("✅ 퀴즈 로드:", quizCache);
    } catch (err) {
      console.error("❌ 퀴즈 불러오기 실패", err);
    }
  }


  // ===============================
  // ✅ 퀴즈 표시 (선택지 포함)
  // ===============================
  function displayQuiz(q) {
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
  // ✅ 혼잣말 전용
  // ===============================
  function showChat(text) {
    qText.textContent = text;
    qOptions.innerHTML = "";
    overlay.classList.remove("hidden");
    overlay.style.display = "flex";

    setTimeout(() => {
      overlay.classList.add("hidden");
      overlay.style.display = "none";
    }, 4000); // 사담은 자동 삭제
  }



  // ===============================
  // 🎯 문제 출제 로직
  // ===============================
  async function triggerQuiz() {
    if (inQuiz) return;

    // ✅ 레벨 5 이상부터 기억 기반 혼합
    if (window.level >= 5) {
      const rand = Math.random();

      // 25% → 기억 기반 퀴즈
      if (rand < 0.25) {
        if (!quizCache.length) await preloadQuizzes();
        const memQuiz = quizCache.find(q => q.type === "quiz");
        if (memQuiz) {
          displayQuiz(memQuiz);
          return;
        }
      }
    }

    // ✅ 일반 퀴즈
    if (!quizCache.length) await preloadQuizzes();
    const q = quizCache.pop();

    if (!q) return;

    if (q.type === "chat") {
      showChat(generateBunnyChat());
      return;
    }

    if (q.type === "quiz") {
      displayQuiz(q);
    }
  }

/*일시정지 */
const pauseBtn = document.getElementById("pauseBtn");

pauseBtn.addEventListener("click", () => {
  isPaused = !isPaused;

  if (isPaused) {
    pauseBtn.textContent = "▶ 재개";
    pauseBtn.classList.add("paused");
  } else {
    pauseBtn.textContent = "⏸ 일시정지";
    pauseBtn.classList.remove("paused");
    startQuizLoop(); // 다시 시작
  }
});

  // ===============================
  // 반복 실행 루프
  // ===============================
let quizTimer = null;

function startQuizLoop() {
  if (quizTimer) clearTimeout(quizTimer);

  quizTimer = setTimeout(async () => {
    if (!isPaused && !inQuiz) {
      await triggerQuiz();
    }

    if (!isPaused) {
      startQuizLoop();   
    }
}, quizInterval);
}

if (isPaused) {
  overlay.classList.add("hidden");
}


// ✅ 최초 실행
startQuizLoop();

  // ===============================
  // ✅ 정답 처리
  // ===============================
  function quizCorrect() {
    window.score += 50;
    scoreDom.innerText = window.score;
    window.combo++;

    if (window.combo >= 3) {
      window.level++;
      window.combo = 0;
      levelDom.innerText = window.level;
      img("bunny_surprised.PNG", "레벨 업! 😲");
    } else {
      img("bunny_happy.PNG", "정답! 🐰");
    }

    overlay.classList.add("hidden");
    inQuiz = false;
  }


  // ===============================
  // ✅ 오답 처리
  // ===============================
  let wrongCombo = 0;

  function quizWrong() {
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
