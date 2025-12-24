import { BrowserRouter, Routes, Route } from "react-router-dom";
import Tetris from "./pages/Tetris";
import Breakout from "./pages/Breakout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div className="menu-container">
              <h1>AI VS GAME HUB</h1>
              <button onClick={() => window.location.href = "/tetris"}>
                🎮 테트리스 시작
              </button>
              <button onClick={() => window.location.href = "/breakout"}>
                🧩 블록깨기 시작
              </button>
            </div>
          }
        />
        <Route path="/tetris" element={<Tetris />} />
        <Route path="/breakout" element={<Breakout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
