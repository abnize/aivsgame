console.log("🐰 퀴즈 시스템 로딩됨");

// =================================================
// quizOverlay가 React에서 생성될 때까지 대기
// =================================================
let retry = 0;
let quizSystemStarted = false;

const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://aivsgame-backend.onrender.com";

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
  if (quizSystemStarted) return;
  quizSystemStarted = true;

  const overlay = document.getElementById("quizOverlay");
  const qText = document.getElementById("quizQuestion");
  const qOptions = document.getElementById("quizOptions");
  const scoreDom = document.getElementById("sc");
  const levelDom = document.getElementById("lv");
  const bunnyBubble = document.getElementById("bunny-bubble");
  const pauseBtn = document.getElementById("pauseBtn");

  let quizCache = [];
  let inQuiz = false;
  let quizInterval = 4000;
  let isPaused = false;
  let quizTimer = null;

  let lastChatText = null;
  let chatMemory = []; // 🔥 사담 누적 메모리

  window.score = window.score || 0;
  window.level = window.level || 1;
  window.combo = window.combo || 0;

  // ===============================
  // 🐰 토끼 이미지 & 말풍선
  // ===============================
  function img(file, text) {
    const bunny = document.getElementById("bunny-img");
    if (bunny) bunny.src = `/aivsgame/assets/bunny/${file}`;
    bunnyBubble.innerText = text;
  }

  function pickRandom(arr) {
    let pick;
    do {
      pick = arr[Math.floor(Math.random() * arr.length)];
    } while (pick === lastChatText && arr.length > 1);
    lastChatText = pick;
    return pick;
  }

  // ===============================
  // 🐰 사담 생성 (원본 유지)
  // ===============================
  function generateBunnyChat() {
    const foods = [
      "오므라이스","갈비","우육면","양념치킨","오징어회","광어회",
      "돈가스","돈카츠","냉면","불닭볶으면","로제떡볶이","계란찜",
      "부침개","초밥","피자","라면","치킨","샐러드","스파게티",
      "멘보샤","새우튀김우동","볶음밥","한우A++","등심카츠",
      "토마토설탕무침","파닭","문어숙회","젓국","게국지",
      "김밥","짜파게티","짬뽕","날달걀"
    ];

    const breakfast = ["계란찜","토스트","우유","시리얼","미역국","샐러드"];
    const lunchFoods = ["냉면","돈가스","불고기덮밥","김치찌개","마라탕","파스타"];
    const nightFoods = ["라면","치킨","피자","떡볶이","부대찌개","우동"];
    const hobbies = ["뜨개질","건담조립","요리","작곡","게임","코딩","런닝","운동","재봉","농사","농구","수영","독서","산책","낚시","노래"];
    const moodsMorning = ["오늘은 상쾌해!","기분 좋아!","힘이 나!","하늘이 예뻐~"];
    const moodsNight = ["조금 피곤하네","졸려 😪","눕고 싶어…","조용히 있고 싶어"];

    const hour = new Date().getHours();
    let chatObj;

    if (hour <= 5) {
      chatObj = { type: "mood", text: pickRandom(moodsNight) };
    } else if (hour <= 11) {
      chatObj = Math.random() < 0.5
        ? { type: "food", text: pickRandom(breakfast) }
        : { type: "mood", text: pickRandom(moodsMorning) };
    } else if (hour <= 14) {
      chatObj = { type: "food", text: pickRandom(lunchFoods) };
    } else if (hour <= 18) {
      chatObj = { type: "hobby", text: pickRandom(hobbies) };
    } else {
      chatObj = Math.random() < 0.5
        ? { type: "food", text: pickRandom(nightFoods) }
        : { type: "mood", text: pickRandom(moodsNight) };
    }

    chatMemory.push(chatObj.text); // 🔥 사담 누적

    fetch(`${API_BASE}/api/save_chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(chatObj),
}).catch(() => {});


    if (chatObj.type === "food") return `나는 ${chatObj.text} 먹고 싶어! 🐰`;
    if (chatObj.type === "hobby") return `요즘 ${chatObj.text}에 빠졌어 🐰`;
    return `오늘은 ${chatObj.text} 😊`;
  }

  // ===============================
  // 🔥 사담 기반 퀴즈 생성
  // ===============================
  function generateMemoryQuiz() {
    if (!chatMemory.length) return null;

    const answer = chatMemory[Math.floor(Math.random() * chatMemory.length)];
    const options = [answer];

    while (options.length < 4) {
      const fake = chatMemory[Math.floor(Math.random() * chatMemory.length)];
      if (!options.includes(fake)) options.push(fake);
    }

    return {
      type: "memoryQuiz",
      question: "아까 토끼가 말했던 건 무엇일까?",
      options: options.sort(() => Math.random() - 0.5),
      answer,
    };
  }

  // ===============================
  // 퀴즈 로드 (로컬/배포 대응)
  // ===============================
  async function preloadQuizzes() {
    try {
      const res = await fetch(
        `${API_BASE}/api/get_quiz_batch?level=${window.level}&n=5`
      );
      quizCache = await res.json();
    } catch (e) {
      console.error("❌ 퀴즈 로드 실패", e);
      quizCache = [];
    }
  }

  function displayQuiz(q) {
    qText.textContent = q.question;
    qOptions.innerHTML = "";

    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.textContent = opt;
      btn.onclick = () => checkAnswer(opt, q.answer);
      qOptions.appendChild(btn);
    });

    overlay.classList.remove("hidden");
    overlay.style.display = "flex";
    inQuiz = true;
  }

  function showChat(text) {
    qText.textContent = text;
    qOptions.innerHTML = "";
    overlay.classList.remove("hidden");
    overlay.style.display = "flex";
    setTimeout(() => overlay.classList.add("hidden"), 4000);
  }

  // ===============================
  // 🎯 레벨 규칙 반영된 트리거
  // ===============================
  async function triggerQuiz() {
    if (inQuiz || isPaused) return;
    if (!quizCache.length) await preloadQuizzes();

    // 🔹 레벨 1: 퀴즈만
    if (window.level === 1) {
      const q = quizCache.find(q => q.type === "quiz");
      if (q) displayQuiz(q);
      return;
    }

    // 🔹 레벨 2~4: 퀴즈 + 사담
    if (window.level >= 2 && window.level < 5) {
      if (Math.random() < 0.4) {
        showChat(generateBunnyChat());
        return;
      }
      const quizzes = quizCache.filter(q => q.type === "quiz");
if (quizzes.length) {
  const q = quizzes[Math.floor(Math.random() * quizzes.length)];
  displayQuiz(q);
}

      return;
    }

    // 🔹 레벨 5+: 사담 기반 퀴즈 포함
    if (window.level >= 5 && chatMemory.length >= 2 && Math.random() < 0.4) {
      const mq = generateMemoryQuiz();
      if (mq) {
        displayQuiz(mq);
        return;
      }
    }

    const q = quizCache.find(q => q.type === "quiz");
    if (q) displayQuiz(q);
  }

  function startQuizLoop() {
    quizTimer = setTimeout(async () => {
      await triggerQuiz();
      startQuizLoop();
    }, quizInterval);
  }

  // ===============================
  // 정답 / 오답 / 벌칙 (원본 유지)
  // ===============================
  let wrongCombo = 0;

  function quizCorrect() {
    window.score += 50;
    scoreDom.innerText = window.score;
    window.combo++;

    if (window.combo >= 3) {
      window.level++;
      window.combo = 0;
      levelDom.innerText = window.level;
      img("bunny_surprised.png", "레벨 업! 😲");
    } else {
      img("bunny_happy.png", "정답! 🐰");
    }

    overlay.classList.add("hidden");
    inQuiz = false;
  }

  function quizWrong() {
    wrongCombo++;
    img("bunny_sad.png", "틀렸어 😢");

    if (wrongCombo >= 3) {
      wrongCombo = 0;
      img("bunny_angry.png", "벌칙 발동 😡");
      window.addPenalty && window.addPenalty();
    }

    overlay.classList.add("hidden");
    inQuiz = false;
  }

  function checkAnswer(sel, correct) {
    sel === correct ? quizCorrect() : quizWrong();
  }

  pauseBtn?.addEventListener("click", () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? "▶ 재개" : "⏸ 일시정지";
  });

  startQuizLoop();
}
