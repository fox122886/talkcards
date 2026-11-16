"""Convert the card-deck Excel workbook into js/cards.js.

Usage:
    python tools/build_data.py path/to/cards.xlsx

Requires: openpyxl
"""
import json
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "js" / "cards.js"

SHEET_TALK = "慢熟｜深聊卡"
SHEET_PICK = "選邊站｜二選一卡"
SHEET_FIGHT = "全民吵架｜生活爭議"
SHEET_INTRO = "說明卡"


def clean(v):
    if v is None:
        return ""
    return str(v).strip()


# ---------- 重複題檢查 ----------
# 撞題通常是「同一個主題、換句話說」，逐字比對抓不到，所以用兩層檢查：
#   1. 概念關鍵字：兩題都碰到同一個概念（例如都在問「電話 vs 傳訊息」），就列出來。
#   2. 字面相似：相鄰兩字的重疊比例（Jaccard）過高時也列出來，抓幾乎照抄的題目。
# 只檢查「吵架王 vs 二選一」與「吵架王內部」。已人工確認不算撞題的組合放在 REVIEWED_OK。
# 新增題目時若出現新主題，請把關鍵字補進 CONCEPTS。
CONCEPTS = {
    "電話": ["電話"],
    "遠距": ["遠距", "在家工作"],
    "守時": ["遲到", "提早一小時到", "準時到", "幾點到"],
    "揪團": ["揪團", "等別人揪", "改天約"],
    "驚喜": ["驚喜"],
    "午餐": ["午餐"],
    "寵物": ["狗", "貓", "寵物"],
    "已讀": ["已讀"],
    "冷氣": ["冷氣"],
    "電量": ["電量"],
    "冰熱": ["喝冰", "冰的", "熱的", "冰塊"],
    "早餐": ["早餐", "蛋餅", "飯糰"],
    "外送": ["外送"],
    "網購": ["網購", "包裹"],
    "追劇": ["追劇", "劇透"],
    "自由行": ["自由行", "跟團，"],
    "禮物": ["禮物"],
    "生日": ["生日"],
    "紅包": ["紅包"],
    "開會": ["開會", "會議"],
    "下班": ["下班", "加班"],
    "休假": ["請假", "特休", "休假", "放假"],
    "KTV": ["KTV"],
    "排隊": ["排隊", "排到"],
    "住宿": ["住宿", "飯店", "民宿"],
    "家事": ["洗碗", "煮飯", "家事", "大掃除", "打掃"],
    "起床睡覺": ["點起床", "才能睡"],
    "電影": ["電影"],
    "社群": ["社群", "限時動態"],
    "借錢分帳": ["分帳", "借一筆", "借錢"],
}
REVIEWED_OK = {
    # (卡號, 卡號): 人工判定不算撞題的理由。二選一問「極端假設」，吵架王問「現實習慣」，角度不同就放行。
    ("P1-01", "F-013"): "一輩子只能冰或熱（假設）vs 冰塊要多少（習慣）",
    ("P1-02", "F-097"): "永遠早一小時或遲到（假設）vs 上班幾點到（習慣）",
    ("P1-46", "F-097"): "朋友準時無聊或有趣遲到 vs 自己上班幾點到",
    ("P1-03", "F-043"): "電量永遠只剩 10%（忍受）vs 剩多少開始緊張（焦慮習慣）",
    ("P1-04", "F-029"): "沒冷氣或沒熱水 vs 冷氣開幾度",
    ("P1-04", "F-089"): "沒冷氣或沒熱水 vs 辦公室冷氣太強怎麼辦",
    ("F-029", "F-089"): "在家設幾度 vs 公共空間冷氣攻防，場景不同",
    ("P1-08", "F-057"): "不能網購或外送 vs 包裹多久拆",
    ("P1-08", "F-085"): "不能網購或外送 vs 聚會出門或在家",
    ("P1-39", "F-057"): "網購挑便宜或高評價 vs 包裹多久拆",
    ("P1-17", "F-069"): "地點與美景取捨 vs 飯店或民宿",
    ("P1-27", "F-090"): "開會發言順序 vs 視訊開不開鏡頭",
    ("P1-32", "F-077"): "記得名字或生日 vs 自己生日怎麼過",
    ("P1-43", "F-077"): "送禮用心或貴 vs 自己生日怎麼過",
    ("P1-43", "F-082"): "送禮用心或貴 vs 交換禮物實用或搞笑",
    ("P1-43", "F-087"): "送禮用心或貴 vs 收到不喜歡的禮物",
    ("F-082", "F-087"): "準備交換禮物 vs 收到不喜歡的禮物",
    ("P1-42", "F-076"): "聚會揪團 vs 團購跟不跟",
    ("P1-45", "F-045"): "群組誰先已讀 vs 沒空回時點不點開",
    ("P1-49", "F-054"): "爸媽加社群好友 vs 自己發不發限動",
    ("P2-04", "F-054"): "不能用社群或不能看新聞 vs 發不發限動",
    ("P1-50", "F-033"): "寵物會說話的假設 vs 狗派貓派",
    ("P1-58", "F-050"): "一年不能追劇 vs 被劇透的反應",
    ("P1-68", "F-034"): "家事機器人 vs 家族聚餐煮飯或洗碗",
    ("P2-18", "F-091"): "無聊準時或有趣加班 vs 下班訊息回不回",
    ("P2-18", "F-103"): "無聊準時或有趣加班 vs 同事聚餐去不去",
    ("F-091", "F-103"): "下班訊息 vs 下班聚餐，問題不同",
    ("F-093", "F-100"): "休假制度 vs 特休怎麼用，問題不同",
}
SIM_THRESHOLD = 0.18
STOP = ["你寧願", "你會", "你選", "你是", "還是", "比較", "一輩子", "永遠", "要不要",
        "可以", "一定", "就好", "什麼", "的時候", "通常", "喜歡"]


def _text(card):
    return card["q"] + card.get("a", "") + card.get("b", "")


def _grams(card):
    text = _text(card)
    for w in STOP:
        text = text.replace(w, "")
    text = "".join(ch for ch in text if ch.isalnum())
    return {text[i:i + 2] for i in range(len(text) - 1)}


def _concepts(card):
    t = _text(card)
    return {k for k, words in CONCEPTS.items() if any(w in t for w in words)}


def check_duplicates(pick, fight):
    found = []
    pool = [(c, _grams(c), _concepts(c)) for c in pick + fight]
    for i, (c1, g1, k1) in enumerate(pool):
        for c2, g2, k2 in pool[i + 1:]:
            if c1["deck"] == "pick" and c2["deck"] == "pick":
                continue
            if (c1["id"], c2["id"]) in REVIEWED_OK or (c2["id"], c1["id"]) in REVIEWED_OK:
                continue
            shared = k1 & k2
            sim = len(g1 & g2) / len(g1 | g2) if g1 and g2 else 0
            if shared or sim >= SIM_THRESHOLD:
                found.append((c1, c2, shared, sim))
    if found:
        print(f"\n[重複題檢查] {len(found)} 組需要人工確認：")
        for a, b, shared, sim in found:
            why = "、".join(sorted(shared)) if shared else f"字面相似 {sim:.2f}"
            print(f"  [{why}] {a['id']} {a['q']}（{a.get('a','')}／{a.get('b','')}）")
            print(f"        ↔ {b['id']} {b['q']}（{b.get('a','')}／{b.get('b','')}）")
    else:
        print("[重複題檢查] 沒有需要確認的組合。")
    return found


def main(xlsx_path):
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)

    talk = []
    for r in wb[SHEET_TALK].iter_rows(min_row=2, values_only=True):
        if not r[0]:
            continue
        talk.append({
            "id": clean(r[0]), "deck": "talk", "level": clean(r[1]),
            "topic": clean(r[2]), "scene": clean(r[3]), "q": clean(r[4]),
        })

    pick = []
    for r in wb[SHEET_PICK].iter_rows(min_row=2, values_only=True):
        if not r[0]:
            continue
        card = {
            "id": clean(r[0]), "deck": "pick", "level": clean(r[1]),
            "topic": clean(r[2]), "scene": clean(r[3]), "q": clean(r[4]),
            "a": clean(r[5]), "b": clean(r[6]),
        }
        if clean(r[7]):
            card["bias"] = clean(r[7])
            card["note"] = clean(r[8])
        pick.append(card)

    fight = []
    if SHEET_FIGHT in wb.sheetnames:
        for r in wb[SHEET_FIGHT].iter_rows(min_row=2, values_only=True):
            if not r[0]:
                continue
            fight.append({
                "id": clean(r[0]), "deck": "fight", "level": "全民吵架",
                "title": clean(r[1]), "emoji": clean(r[2]), "topic": clean(r[3]),
                "scene": clean(r[4]) or "全場合", "q": clean(r[5]),
                "a": clean(r[6]), "b": clean(r[7]),
                "fa": clean(r[8]) if len(r) > 8 else "",
                "fb": clean(r[9]) if len(r) > 9 else "",
            })

    prefix = {"W": "talk", "P": "pick", "F": "fight"}
    intro = {}
    for r in wb[SHEET_INTRO].iter_rows(min_row=2, values_only=True):
        if r[0] and clean(r[0])[0] in prefix:
            intro[prefix[clean(r[0])[0]]] = clean(r[2])

    data = {"talk": talk, "pick": pick, "fight": fight, "intro": intro}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "// Generated by tools/build_data.py - do not edit by hand.\n"
        "window.CARD_DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8",
    )
    print(f"talk={len(talk)} pick={len(pick)} fight={len(fight)} -> {OUT}")
    check_duplicates(pick, fight)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
