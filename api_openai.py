import os
import json
import re
import random
from openai import OpenAI
from memory_manager import load_memory, random_memory_snippet
from hashlib import sha1

# ============================================================
# 🔁 중복 질문 방지용 캐시
# ============================================================
_RECENT_Q = set()
_MAX_RECENT = 50

def _is_duplicate(q: str) -> bool:
    """같은 질문 중복 방지"""
    if not q:
        return False
    h = sha1(q.strip().encode("utf-8")).hexdigest()
    if h in _RECENT_Q:
        return True
    _RECENT_Q.add(h)
    if len(_RECENT_Q) > _MAX_RECENT:
        _RECENT_Q.pop()
    return False

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
    try:
        return json.loads(text)
    except Exception:
        match = re.search(r"\[.*\]", text, re.S)
        if not match:
            raise ValueError("JSON 배열을 찾지 못했습니다.")
        return json.loads(match.group())

# ------------------------------------------------------------
# ⭐ 메인 퀴즈 생성 함수
# ------------------------------------------------------------
def get_quiz_batch(level=1, n=5):
    try:
        level = int(level)
    except Exception:
        level = 1

    topic_desc = _topic(level)
    memory_list = load_memory()

    # 🟣 chat 최소 개수
    chat_min = 3 if level <= 2 else 2 if level <= 4 else 1

    # 🟣 memory 조건
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

출력 규칙:
- 총 {n}개 생성
- 최소 {chat_min}개는 chat

memory 규칙:
{"- memory:true 반드시 1개 포함" if must_memory else "- memory:true 생성 금지"}

사담 데이터:
{json.dumps(memory_list, ensure_ascii=False)}
""".strip()

    items = []

    # --------------------------------------------------------
    # 🧠 GPT 호출
    # --------------------------------------------------------
    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
        )

        raw = response.choices[0].message.content
        arr = _safe_json_array(raw)

        for q in arr:
            if not isinstance(q, dict):
                continue

            # ✅ 수정 ①: 레벨 1에서 chat 완전 차단
            if level == 1 and q.get("type") == "chat":
                continue

            # ✅ 수정 ②: 중복 질문 제거
            if _is_duplicate(q.get("question", "")):
                continue

        if q.get("type") == "chat":
            q["options"] = []
            q["answer"] = None
            q["memory"] = False

# ✅ quiz인데 options가 없으면 빈 배열로 보정
        if q.get("type") == "quiz" and "options" not in q:
            q["options"] = []

        items.append(q)
    except Exception as e:
        print("❌ GPT 오류:", e)

    # --------------------------------------------------------
    # 🟤 레벨 3: 넌센스 강제 (GPT 완전 무시)
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
    # 🔧 부족한 수 로컬 문제 보강 (중복 방지 포함)
    # --------------------------------------------------------
    while len(items) < n:
        src = LOCAL_BANK.get(level) or LOCAL_BANK[1]
        cand = random.choice(src)

        # ✅ 수정 ③: 로컬 보강도 중복 체크
        if _is_duplicate(cand.get("question", "")):
            continue

        items.append(cand)

    return items
