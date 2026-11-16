# 慢熟 × 選邊站｜對話卡網頁版

把《對話卡題庫》Excel 做成可以直接在手機、平板、電腦上抽卡的網頁。

- **慢熟｜深聊卡**（150 張）：Lv.1 暖身 → Lv.2 認識 → Lv.3 深聊
- **選邊站｜二選一卡**（150 張）：Lv.1 輕鬆 → Lv.2 價值觀 → Lv.3 兩難，其中 14 張卡背藏有心理學偏誤解說

## 功能

1. **設定頁**：先選當次使用情境，自動帶出合適的卡片
   | 情境 | 卡角標示 | 等級 |
   |---|---|---|
   | 初次見面／同事聚會 | 全場合 | Lv.1–2 |
   | 朋友聚會 | 全場合、朋友以上 | Lv.1–3 |
   | 老朋友深聊 | 全場合、朋友以上 | Lv.2–3 |
   | 情侶約會 | 全部（含情侶限定） | Lv.1–3 |
   | 自訂 | 自選 | 自選 |
2. 套組可選「混合玩／慢熟／選邊站」；混合時同一等級先用選邊站暖場再換慢熟
3. 進階調整：主題、等級、卡角標示、由淺入深或完全隨機、題數
4. 由淺入深模式在升級前會停下來問「要進到下一級嗎？」，也可以就此結束
5. 選邊站：A／B 計票、倒數三秒、隱藏偏誤卡可翻到卡背看解說與原始研究出處
6. 框架效應實驗：讓 P2-21「存活率 90%」與 P2-22「死亡率 10%」前後連抽
7. **深淺色切換**（淺色／跟隨系統／深色），會記住上次的選擇
8. 參考來源頁：列出每個偏誤的原始研究（附 DOI 連結）

鍵盤操作：`←` `→` 換卡、空白鍵翻卡背、`1` `2` 投票。

## 使用方式

純靜態網頁，無需安裝。直接開 `index.html`，或使用 GitHub Pages 網址。

## 更新題庫

修改 `data/cards.xlsx` 後重新產生資料檔：

```bash
pip install openpyxl
python tools/build_data.py data/cards.xlsx
```

會覆寫 `js/cards.js`。

## 檔案結構

```
index.html          頁面
css/style.css       樣式（含深淺色）
js/app.js           設定、洗牌、抽卡邏輯
js/cards.js         題庫資料（由 Excel 產生）
js/sources.js       參考來源
data/cards.xlsx     原始題庫
tools/build_data.py Excel → js/cards.js
```

## 參考來源

隱藏偏誤卡對應的原始研究：

- 宜家效應：Norton, Mochon & Ariely (2012). *Journal of Consumer Psychology*, 22(3), 453–460. https://doi.org/10.1016/j.jcps.2011.08.002
- 計畫謬誤：Buehler, Griffin & Ross (1994). *JPSP*, 67(3), 366–381. https://doi.org/10.1037/0022-3514.67.3.366
- 確定性效應：Kahneman & Tversky (1979). Prospect theory. *Econometrica*, 47(2), 263–291. https://doi.org/10.2307/1914185
- 沉沒成本謬誤：Arkes & Blumer (1985). *OBHDP*, 35(1), 124–140. https://doi.org/10.1016/0749-5978(85)90049-4
- 現時偏誤：O'Donoghue & Rabin (1999). *AER*, 89(1), 103–124. https://doi.org/10.1257/aer.89.1.103 ；Laibson (1997). *QJE*, 112(2), 443–478. https://doi.org/10.1162/003355397555253
- 錨定效應：Tversky & Kahneman (1974). *Science*, 185(4157), 1124–1131. https://doi.org/10.1126/science.185.4157.1124
- 從眾效應：Leibenstein (1950). *QJE*, 64(2), 183–207. https://doi.org/10.2307/1882692 ；Cialdini, *Influence*（社會認同）
- 聚光燈效應：Gilovich, Medvec & Savitsky (2000). *JPSP*, 78(2), 211–222. https://doi.org/10.1037/0022-3514.78.2.211
- 確認偏誤：Nickerson (1998). *Review of General Psychology*, 2(2), 175–220. https://doi.org/10.1037/1089-2680.2.2.175
- 框架效應：McNeil, Pauker, Sox & Tversky (1982). *NEJM*, 306(21), 1259–1262. https://doi.org/10.1056/NEJM198205273062103 ；Tversky & Kahneman (1981). *Science*, 211(4481), 453–458. https://doi.org/10.1126/science.7455683
- 負面偏誤：Baumeister et al. (2001). Bad is stronger than good. *Review of General Psychology*, 5(4), 323–370. https://doi.org/10.1037/1089-2680.5.4.323
- 優於平均效應：Svenson (1981). *Acta Psychologica*, 47(2), 143–148. https://doi.org/10.1016/0001-6918(81)90005-6
- 現狀偏誤：Samuelson & Zeckhauser (1988). *Journal of Risk and Uncertainty*, 1(1), 7–59. https://doi.org/10.1007/BF00055564

延伸閱讀（分級設計可對照的概念，非題目來源）：

- Aron et al. (1997). The experimental generation of interpersonal closeness. *PSPB*, 23(4), 363–377. https://doi.org/10.1177/0146167297234003
- Altman & Taylor (1973). *Social Penetration: The Development of Interpersonal Relationships*.
