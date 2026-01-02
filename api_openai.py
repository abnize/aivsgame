import os
import json
import re
import random
from openai import OpenAI
from memory_manager import load_memory, random_memory_snippet

# ============================================================
# OpenAI Client
# ============================================================
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ------------------------------------------------------------
# 🌈 레벨 → 난이도 매핑
# ------------------------------------------------------------
def _topic(level: int) -> str:
    if level <= 2:
        return "초등수준 계산·기초 상식"
    elif level == 3:
        return "유명 한국어 넌센스 퀴즈(인터넷에서 많이 알려진 것만)"
    elif level == 4:
        return "한국 기초상식·생활 상식"
    elif level == 5:
        return "중학교 수준 역사·과학·지리"
    elif level == 6:
        return "속담·문화·음식 상식"
    elif level == 7:
        return "고등학교 수학·물리·국사"
    elif level == 8:
        return "심화 상식·추리"
    elif level == 9:
        return "한국 유머·기발한 문제"
    else:
        return "대학 교양·전문적 사고 문제"

# ------------------------------------------------------------
# 🔰 유명 넌센스 문제 (레벨 3 전용)
# ------------------------------------------------------------
NONSENSE_BANK = [
    ("빵이 차를 타면?", ["빵카", "빵택시", "빵기"], "빵카"),
    ("세상에서 가장 뜨거운 바다는?", ["열받아", "뜨바다", "핫바다"], "열받아"),
    ("자동차가 웃으면?", ["카톡", "웃차차", "부릉부릉"], "카톡"),
    ("왕이 넘어지면?", ["킹콩", "킹받네", "킹콩킹"], "킹콩"),
    ("화장실을 영어로 하면?", ["휴게소", "rest room", "똥칸"], "rest room"),
    ("바나나가 웃으면?", ["바나나킥", "바나나웃음", "바나나빵"], "바나나킥"),
]

# ------------------------------------------------------------
# 🧩 로컬 백업 문제
# ------------------------------------------------------------
LOCAL_BANK = {
    1: [
        {"type": "quiz", "question": "3+5=?", "options": ["7", "8", "9"], "answer": "8", "memory": False},
        {"type": "quiz", "question": "10-4=?", "options": ["5", "6", "7"], "answer": "6", "memory": False},
        {"type": "quiz", "question": "2×6=?", "options": ["10", "12", "14"], "answer": "12", "memory": False},
    ],
    2: [
        {"type": "quiz", "question": "한국의 수도는?", "options": ["부산", "서울", "인천"], "answer": "서울", "memory": False},
        {"type": "quiz", "question": "물의 끓는점은?", "options": ["90", "100", "110"], "answer": "100", "memory": False},
    ],
    3: [],
}

# ------------------------------------------------------------
# 🧩 JSON 안전 파서
# ------------------------------------------------------------
def _safe_json_array(text: str):
    """
    GPT 응답에서 JSON 배열만 추출
    """
    match = re.search(r"\[\s*{.*?}\s*\]", text, re.S)
    if not match:
        raise ValueError("JSON 배열을 찾지 못했습니다.")
    return json.loads(match.group())

# ------------------------------------------------------------
# ⭐ 메인 퀴즈 생성 함수
# ------------------------------------------------------------
def get_quiz_batch(level=1, n=5):
    # ✅ level 타입 보정
    try:
        level = int(level)
    except Exception:
        level = 1

    topic_desc = _topic(level)
    memory_list = load_memory()

    # --------------------------------------------------------
    # 🟣 레벨별 chat 최소 개수
    # --------------------------------------------------------
    if level <= 2:
        chat_min = 3
    elif level <= 4:
        chat_min = 2
    else:
        chat_min = 1

    # --------------------------------------------------------
    # 🟣 memory:true 조건
    # --------------------------------------------------------
    must_memory = level >= 5 and len(memory_list) > 0

    # --------------------------------------------------------
    # 🟣 프롬프트
    # --------------------------------------------------------
    prompt = f"""
너는 'AI 퀴즈 + 일상대화' 생성기이다.
항상 JSON 배열([])만 출력하라.
문제는 반드시 한국어로 생성한다.

현재 레벨: {level}
현재 난이도 설명: {topic_desc}

🎯 난이도 규칙:
- 반드시 현재 레벨 범위 안에서만 출제

🎯 출력 규칙:
- 총 {n}개 생성
- 최소 {chat_min}개는 "type": "chat"

🎯 memory 규칙:
{"- memory:true 문제를 반드시 1개 포함" if must_memory else "- memory:true 문제를 절대 생성하지 마라"}

사담 데이터(JSON):
{json.dumps(memory_list, ensure_ascii=False)}

형식:
[
  {{
    "type": "chat" 또는 "quiz",
    "question": "...",
    "options": ["A","B","C"] 또는 [],
    "answer": "정답" 또는 null,
    "memory": true 또는 false
  }}
]
""".strip()

    items = []

    # --------------------------------------------------------
    # 🧠 GPT 호출
    # --------------------------------------------------------
    try:
        response = client.chat.completions.create(
    model="gpt-4.1-mini",   # 🔹 더 빠름
    messages=[{"role": "user", "content": prompt}],
    temperature=0.6,        # 🔹 안정 + 속도
)

        raw = response.choices[0].message.content
        arr = _safe_json_array(raw)

        for q in arr:
            if not isinstance(q, dict):
                continue

            if q.get("type") == "chat":
                q["options"] = []
                q["answer"] = None
                q["memory"] = False

            items.append(q)

    except Exception as e:
        print("❌ GPT 오류:", e)

    # --------------------------------------------------------
    # 🟤 레벨 3: 넌센스 강제
    # --------------------------------------------------------
    if level == 3:
        items = []
        selected = random.sample(NONSENSE_BANK, min(n, len(NONSENSE_BANK)))
        for q, opts, ans in selected:
            items.append({
                "type": "quiz",
                "question": q,
                "options": opts,
                "answer": ans,
                "memory": False,
            })

    # --------------------------------------------------------
    # 🔧 부족한 수 로컬 문제 보강
    # --------------------------------------------------------
    while len(items) < n:
        if level in LOCAL_BANK and LOCAL_BANK[level]:
            items.append(random.choice(LOCAL_BANK[level]))
        else:
            items.append(random.choice(LOCAL_BANK[1]))

    return items
