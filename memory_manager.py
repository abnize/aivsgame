# memory_manager.py
import json
import os
import random

MEMORY_FILE = os.path.join("data", "session_memory.json")

def _ensure_file():
    os.makedirs("data", exist_ok=True)
    if not os.path.exists(MEMORY_FILE):
        with open(MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)

def load_memory():
    _ensure_file()
    try:
        with open(MEMORY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data[-20:]  # 최근 20개 사용
            return []
    except:
        return []

def save_memory(entry):
    _ensure_file()
    memory = load_memory()
    memory.append(entry)
    memory = memory[-50:]  # 최대 50개
    with open(MEMORY_FILE, "w", encoding="utf-8") as f:
        json.dump(memory, f, ensure_ascii=False, indent=2)

def random_memory_snippet():
    memory = load_memory()
    return random.choice(memory) if memory else None
