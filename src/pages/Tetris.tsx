import React, { useEffect } from "react";
import "./Tetris.css";

declare global {
  interface Window {
    initTetris: () => void;
  }
}

const Tetris: React.FC = () => {

  useEffect(() => {

    // ✅ game.js 중복 삽입 방지
    if (!document.getElementById("tetris-script")) {
      const gameScript = document.createElement("script");
      gameScript.src = "/game.js";
      gameScript.id = "tetris-script";

      gameScript.onload = () => {
        if (window.initTetris) {
          window.initTetris(); // 🎮 테트리스 시작
        } else {
          console.error("❌ initTetris not found");
        }
      };

      document.body.appendChild(gameScript);
    }

    // ✅ quiz.js 중복 삽입 방지
    if (!document.getElementById("quiz-script")) {
      const quizScript = document.createElement("script");
      quizScript.src = "/quiz.js";
      quizScript.id = "quiz-script";
      document.body.appendChild(quizScript);
    }

  }, []);

  return (
    <div className="tetris-page">

      <h1>퀴즈 테트리스</h1>

      {/* HUD */}
      <div id="hud">
        Level <span id="lv">1</span> ｜ Score <span id="sc">0</span>
      </div>

      <div id="game-wrapper">

        {/* 🎮 게임 영역 */}
        <div id="game-container">
          <canvas id="gameCanvas" width={200} height={400}></canvas>

          {/* 퀴즈 오버레이 */}
          <div id="quizOverlay" className="hidden">
            <div id="quizBox">
              <p id="quizQuestion">문제 불러오는 중...</p>
              <div id="quizOptions"></div>
            </div>
          </div>
        </div>

        {/* 🐰 토끼 영역 */}
        <div id="bunny-box">
          <img 
            id="bunny-img"
            src="/bunny_neutral.PNG"
            alt="bunny"
            style={{
              width: "220px",
              height: "220px",
              objectFit: "contain"
            }}
          />
          <div id="bunny-bubble">화이팅! ✨</div>
        </div>

      </div>

      {/* 버튼 */}
      <div id="btn-box">
  <button id="aiBtn">⏸ 일시정지</button>
  <button onClick={() => window.location.href = "/"}>
    🏠 메인으로
  </button>
</div>


    </div>
  );
};

export default Tetris;
