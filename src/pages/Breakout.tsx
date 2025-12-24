/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect } from "react";

function Breakout() {

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/game.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div style={{ textAlign: "center", color: "white" }}>
      <h1>🧩 AI 블록깨기</h1>

      <canvas
        id="breakoutCanvas"
        width={300}
        height={400}
        style={{ border: "2px solid white", background: "#000" }}
      />

      <br />

      <button
        onClick={() => window.location.href = "/"}
        style={{
          marginTop: "15px",
          padding: "10px 20px",
          borderRadius: "10px",
          cursor: "pointer"
        }}
      >
        🏠 메인으로
      </button>
    </div>
  );
}

export default Breakout;
