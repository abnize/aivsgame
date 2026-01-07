from flask import Flask, jsonify, request
from flask_cors import CORS
from openai import OpenAI
from api_openai import get_quiz_batch
from memory_manager import save_memory
import os

app = Flask(__name__)
# 🔥 CORS 완전 허용 (GitHub Pages 접근용)
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    supports_credentials=True)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ===============================
# 서버 상태 확인용
# ===============================
@app.route("/")
def health_check():
    return "Flask quiz server running"

# ===============================
# 퀴즈 요청 API
# ===============================
@app.route("/api/get_quiz_batch")
def api_get_quiz_batch():
    level = int(request.args.get("level", 1))
    n = int(request.args.get("n", 5))
    return jsonify(get_quiz_batch(level, n))

# ===============================
# 기억 저장 API
# ===============================
@app.route("/api/save_chat", methods=["POST"])
def api_save_chat():
    data = request.get_json()
    if isinstance(data, dict) and "type" in data and "text" in data:
        save_memory(data)
    return jsonify({"ok": True})

# ===============================
# Render 실행부 (핵심)
# ===============================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

@app.route("/api/test_gpt")
def test_gpt():
    try:
        resp = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": "1+1은?"}],
            temperature=0
        )
        return {
            "ok": True,
            "answer": resp.choices[0].message.content
        }
    except Exception as e:
        return {
            "ok": False,
            "error": str(e)
        }, 500

@app.after_request
def after_request(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    return response
