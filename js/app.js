(function () {
  "use strict";

  var DATA = window.CARD_DATA;
  var SRC = window.SOURCES;
  var $ = function (id) { return document.getElementById(id); };

  // ---------- 安全的 localStorage ----------
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------- 深淺色 ----------
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function applyTheme(pref) {
    var dark = pref === "dark" || (pref === "system" && mq.matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme-pref", pref);
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      b.setAttribute("aria-checked", String(b.dataset.themeSet === pref));
    });
  }
  var themePref = "system";
  try { themePref = localStorage.getItem("tc-theme") || "system"; } catch (e) {}
  applyTheme(themePref);
  document.querySelectorAll("[data-theme-set]").forEach(function (b) {
    b.addEventListener("click", function () {
      themePref = b.dataset.themeSet;
      try { localStorage.setItem("tc-theme", themePref); } catch (e) {}
      applyTheme(themePref);
    });
  });
  mq.addEventListener && mq.addEventListener("change", function () { if (themePref === "system") applyTheme("system"); });

  // ---------- 常數 ----------
  var TAGS = ["全場合", "朋友以上", "情侶限定"];
  var TOPICS = ["日常生活", "旅行與體驗", "童年與成長", "工作與職場", "金錢與選擇", "友情", "家庭", "感情", "自我認識", "未來與人生"];
  var LEVELS = [
    { n: 1, label: "Lv.1 暖身／輕鬆" },
    { n: 2, label: "Lv.2 認識／價值觀" },
    { n: 3, label: "Lv.3 深聊／兩難" }
  ];
  var LEVEL_DESC = {
    talk: { 1: "輕鬆破冰，第一次見面也能聊", 2: "聊聊你的習慣、選擇和想法", 3: "說說平常不太說的那些事" },
    pick: { 1: "生活小事，越無厘頭越好玩", 2: "工作、金錢、朋友之間的選擇", 3: "感情與人生，怎麼選都有點痛" }
  };
  var SCENES = [
    { id: "first", ico: "🤝", name: "初次見面／同事聚會", desc: "只用「全場合」卡，停在 Lv.1–2，不碰太私人的話題",
      tags: ["全場合"], levels: [1, 2] },
    { id: "friends", ico: "🍻", name: "朋友聚會", desc: "全場合＋朋友以上，三個等級都可以聊",
      tags: ["全場合", "朋友以上"], levels: [1, 2, 3] },
    { id: "deep", ico: "☕", name: "老朋友深聊", desc: "跳過暖身，直接從 Lv.2 開始聊心裡話",
      tags: ["全場合", "朋友以上"], levels: [2, 3] },
    { id: "couple", ico: "💞", name: "情侶約會", desc: "全部卡片開放，包含「情侶限定」",
      tags: ["全場合", "朋友以上", "情侶限定"], levels: [1, 2, 3] },
    { id: "custom", ico: "🛠", name: "自訂", desc: "自己挑卡角標示、等級與主題",
      tags: null, levels: null }
  ];

  var ALL = DATA.pick.concat(DATA.talk).map(function (c) {
    c.lv = parseInt(c.level.replace(/[^0-9]/g, ""), 10) || 1;
    return c;
  });

  // ---------- 設定狀態 ----------
  var saved = store.get("tc-settings", null);
  var S = saved || {
    scene: "friends", deck: "mix", tags: ["全場合", "朋友以上"], levels: [1, 2, 3],
    topics: TOPICS.slice(), order: "progressive", limit: 20, countdown: true, experiment: false
  };

  function chip(type, name, value, label, checked) {
    var l = document.createElement("label");
    l.className = "chip";
    l.innerHTML = '<input type="' + type + '" name="' + name + '" value="' + value + '"' + (checked ? " checked" : "") + '><span></span>';
    l.querySelector("span").textContent = label;
    return l;
  }

  function renderSetup() {
    var g = $("sceneGrid"); g.innerHTML = "";
    SCENES.forEach(function (sc) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "scene"; b.dataset.scene = sc.id;
      b.setAttribute("aria-pressed", String(S.scene === sc.id));
      b.innerHTML = '<span class="ico" aria-hidden="true"></span><strong></strong><small></small>';
      b.querySelector(".ico").textContent = sc.ico;
      b.querySelector("strong").textContent = sc.name;
      b.querySelector("small").textContent = sc.desc;
      b.addEventListener("click", function () { pickScene(sc.id); });
      g.appendChild(b);
    });

    var t = $("sceneTags"); t.innerHTML = "";
    TAGS.forEach(function (x) { t.appendChild(chip("checkbox", "tag", x, x, S.tags.indexOf(x) > -1)); });
    var lv = $("levelChips"); lv.innerHTML = "";
    LEVELS.forEach(function (x) { lv.appendChild(chip("checkbox", "level", x.n, x.label, S.levels.indexOf(x.n) > -1)); });
    var tp = $("topicChips"); tp.innerHTML = "";
    TOPICS.forEach(function (x) { tp.appendChild(chip("checkbox", "topic", x, x, S.topics.indexOf(x) > -1)); });

    document.querySelector('input[name="deck"][value="' + S.deck + '"]').checked = true;
    document.querySelector('input[name="order"][value="' + S.order + '"]').checked = true;
    var lim = document.querySelector('input[name="limit"][value="' + S.limit + '"]');
    if (lim) lim.checked = true;
    $("optCountdown").checked = S.countdown;
    $("optExperiment").checked = S.experiment;
    updatePool();
  }

  function pickScene(id) {
    var sc = SCENES.filter(function (x) { return x.id === id; })[0];
    S.scene = id;
    if (sc.tags) { S.tags = sc.tags.slice(); S.levels = sc.levels.slice(); S.topics = TOPICS.slice(); }
    renderSetup();
    if (id === "custom") $("advanced").open = true;
  }

  function readSetup() {
    var vals = function (name) {
      return Array.prototype.map.call(document.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; });
    };
    S.deck = vals("deck")[0];
    S.tags = vals("tag");
    S.levels = vals("level").map(Number);
    S.topics = vals("topic");
    S.order = vals("order")[0];
    S.limit = Number(vals("limit")[0]);
    S.countdown = $("optCountdown").checked;
    S.experiment = $("optExperiment").checked;
  }

  function filterPool() {
    return ALL.filter(function (c) {
      return (S.deck === "mix" || c.deck === S.deck) &&
        S.tags.indexOf(c.scene) > -1 &&
        S.levels.indexOf(c.lv) > -1 &&
        S.topics.indexOf(c.topic) > -1;
    });
  }

  function updatePool() {
    var p = filterPool();
    var nTalk = p.filter(function (c) { return c.deck === "talk"; }).length;
    var nPick = p.length - nTalk;
    var parts = [];
    if (S.deck !== "pick") parts.push("慢熟 " + nTalk);
    if (S.deck !== "talk") parts.push("選邊站 " + nPick);
    var willPlay = S.limit ? Math.min(S.limit, p.length) : p.length;
    $("poolInfo").innerHTML = "符合條件 <b>" + p.length + "</b> 張（" + parts.join("、") + "），本輪抽 <b>" + willPlay + "</b> 張";
    $("startBtn").disabled = p.length === 0;
    if (!p.length) $("poolInfo").textContent = "沒有符合條件的卡片，請放寬進階調整的條件。";
    store.set("tc-settings", S);
  }

  $("view-setup").addEventListener("change", function (e) {
    readSetup();
    if (e.target.name !== "deck" && e.target.name !== "order" && e.target.name !== "limit" &&
        e.target.id !== "optCountdown" && e.target.id !== "optExperiment") {
      S.scene = "custom";
      document.querySelectorAll(".scene").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.scene === "custom")); });
    }
    updatePool();
  });
  $("topicAll").addEventListener("click", function () { document.querySelectorAll('input[name="topic"]').forEach(function (i) { i.checked = true; }); $("view-setup").dispatchEvent(new Event("change")); });
  $("topicNone").addEventListener("click", function () { document.querySelectorAll('input[name="topic"]').forEach(function (i) { i.checked = false; }); $("view-setup").dispatchEvent(new Event("change")); });

  // ---------- 洗牌 ----------
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function buildDeck() {
    var pool = filterPool();
    var limit = S.limit || pool.length;
    var seq;
    if (S.order === "random") {
      seq = shuffle(pool).slice(0, limit);
    } else {
      var levels = [1, 2, 3].filter(function (n) { return pool.some(function (c) { return c.lv === n; }); });
      var byLv = {}; levels.forEach(function (n) { byLv[n] = pool.filter(function (c) { return c.lv === n; }); });
      // 依各等級張數比例分配題數，每個等級至少 1 張
      var quota = {}, left = limit;
      levels.forEach(function (n, idx) {
        var q = idx === levels.length - 1 ? left : Math.max(1, Math.round(limit * byLv[n].length / pool.length));
        q = Math.min(q, byLv[n].length, left - (levels.length - 1 - idx));
        quota[n] = Math.max(0, q); left -= quota[n];
      });
      seq = [];
      levels.forEach(function (n) {
        var q = quota[n];
        if (S.deck === "mix") {
          // 混合：同一等級中先用選邊站暖場，再換慢熟
          var pk = shuffle(byLv[n].filter(function (c) { return c.deck === "pick"; }));
          var tk = shuffle(byLv[n].filter(function (c) { return c.deck === "talk"; }));
          var np = Math.min(pk.length, Math.ceil(q / 2));
          var nt = Math.min(tk.length, q - np);
          np = Math.min(pk.length, q - nt);
          seq = seq.concat(pk.slice(0, np), tk.slice(0, nt));
        } else {
          seq = seq.concat(shuffle(byLv[n]).slice(0, q));
        }
      });
    }

    // 框架效應實驗：P2-21 與 P2-22 前後連抽
    if (S.experiment) {
      var a = pool.filter(function (c) { return c.id === "P2-21"; })[0];
      var b = pool.filter(function (c) { return c.id === "P2-22"; })[0];
      if (a && b) {
        var pos = seq.findIndex(function (c) { return c === a || c === b; });
        var missing = (seq.indexOf(a) > -1 ? 0 : 1) + (seq.indexOf(b) > -1 ? 0 : 1);
        seq = seq.filter(function (c) { return c !== a && c !== b; });
        // 補進實驗卡後，從同等級（選邊站優先）拿掉等量卡片，維持總題數
        for (var k = 0; k < missing && seq.length + 2 > limit; k++) {
          var cand = seq.map(function (c, i) { return c.lv === 2 && c.deck === "pick" ? i : -1; }).filter(function (i) { return i > -1; });
          if (!cand.length) cand = seq.map(function (c, i) { return c.lv === 2 ? i : -1; }).filter(function (i) { return i > -1; });
          if (!cand.length) break;
          var rm = cand[Math.floor(Math.random() * cand.length)];
          seq.splice(rm, 1);
          if (pos > rm) pos--;
        }
        if (pos < 0) {
          var lv2 = seq.map(function (c, i) { return c.lv === 2 ? i : -1; }).filter(function (i) { return i > -1; });
          pos = lv2.length ? lv2[Math.floor(Math.random() * lv2.length)] : Math.floor(Math.random() * (seq.length + 1));
        }
        var pair = Math.random() < .5 ? [a, b] : [b, a];
        seq.splice.apply(seq, [Math.min(pos, seq.length), 0].concat(pair));
      }
    }
    return seq;
  }

  // ---------- 抽卡 ----------
  var P = { seq: [], i: 0, votes: {}, gateShownFor: {} };

  function showView(id) {
    document.querySelectorAll(".view").forEach(function (v) { v.classList.toggle("active", v.id === id); });
    window.scrollTo(0, 0);
  }

  function start() {
    readSetup(); store.set("tc-settings", S);
    P.seq = buildDeck(); P.i = 0; P.votes = {}; P.gateShownFor = {};
    showView("view-play");
    render();
  }

  function render() {
    var c = P.seq[P.i];
    var card = $("card");
    $("levelGate").hidden = true; $("doneBox").hidden = true;
    stopCountdown();
    if (!c) {
      card.hidden = true; $("doneBox").hidden = false;
      setControls(true); updateProgress(); return;
    }
    // 由淺入深：等級往上時先問「要不要進到下一級」
    var prev = P.seq[P.i - 1];
    if (S.order === "progressive" && prev && c.lv > prev.lv && !P.gateShownFor[P.i]) {
      card.hidden = true;
      $("gateTitle").textContent = "要進到 Lv." + c.lv + " 嗎？";
      var desc = [];
      if (S.deck !== "pick") desc.push("慢熟：" + LEVEL_DESC.talk[c.lv]);
      if (S.deck !== "talk") desc.push("選邊站：" + LEVEL_DESC.pick[c.lv]);
      $("gateDesc").textContent = desc.join("／") + "。大家一起決定，覺得聊開了再往下。";
      $("levelGate").hidden = false;
      setControls(false, true); updateProgress(); return;
    }
    card.hidden = false;
    card.classList.remove("flipped");
    card.dataset.deck = c.deck;
    $("cDeck").textContent = c.deck === "talk" ? "慢熟" : "選邊站";
    $("cLevel").textContent = c.level;
    $("cTopic").textContent = c.topic;
    $("cScene").textContent = c.scene;
    $("cScene").dataset.scene = c.scene;
    $("cQ").textContent = c.q;
    $("cId").textContent = c.id;
    var isPick = c.deck === "pick";
    $("cAB").hidden = !isPick;
    if (isPick) {
      $("cA").textContent = c.a; $("cB").textContent = c.b;
      $("countdownBtn").hidden = !S.countdown;
      renderVotes();
    }
    $("flipBtn").hidden = !c.bias;
    if (c.bias) {
      $("bId").textContent = c.id;
      $("bBias").textContent = c.bias;
      $("bNote").textContent = c.note;
      var ul = $("bRefs"); ul.innerHTML = "";
      (SRC.bias[c.bias] || []).forEach(function (r) { ul.appendChild(refItem(r)); });
    }
    card.classList.remove("enter"); void card.offsetWidth; card.classList.add("enter");
    setControls(false);
    updateProgress();
  }

  function refItem(r) {
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(r.cite + " "));
    if (r.url) {
      var a = document.createElement("a");
      a.href = r.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = r.url.replace("https://", "");
      li.appendChild(a);
    }
    return li;
  }

  function setControls(done, gate) {
    $("prevBtn").disabled = P.i === 0;
    $("nextBtn").hidden = done || gate;
    $("skipBtn").hidden = done || gate;
  }

  function updateProgress() {
    var n = P.seq.length, i = Math.min(P.i + 1, n);
    $("progText").textContent = P.i >= n ? "全部 " + n + " 張完成" : "第 " + i + " ／ " + n + " 張";
    $("progBar").style.width = (n ? (Math.min(P.i, n) / n) * 100 : 0) + "%";
  }

  function go(d) {
    var ni = P.i + d;
    if (ni < 0 || ni > P.seq.length) return;
    P.i = ni; render();
  }

  // 投票
  function renderVotes() {
    var c = P.seq[P.i], v = P.votes[c.id] || { a: 0, b: 0 };
    $("cntA").textContent = v.a ? v.a + " 票" : "";
    $("cntB").textContent = v.b ? v.b + " 票" : "";
    $("cntA").classList.toggle("has", v.a > v.b);
    $("cntB").classList.toggle("has", v.b > v.a);
  }
  function vote(opt) {
    var c = P.seq[P.i]; if (!c || c.deck !== "pick" || $("card").hidden) return;
    var v = P.votes[c.id] || (P.votes[c.id] = { a: 0, b: 0 });
    v[opt]++; renderVotes();
    var btn = document.querySelector('.opt[data-opt="' + opt + '"]');
    btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
  }
  document.querySelectorAll(".opt").forEach(function (b) { b.addEventListener("click", function () { vote(b.dataset.opt); }); });
  $("resetVotes").addEventListener("click", function () { var c = P.seq[P.i]; if (c) { delete P.votes[c.id]; renderVotes(); } });

  // 倒數
  var cdTimer = null;
  function stopCountdown() { clearInterval(cdTimer); cdTimer = null; $("countdown").classList.remove("on"); }
  $("countdownBtn").addEventListener("click", function () {
    var n = 3, el = $("countdown");
    stopCountdown(); el.textContent = n; el.classList.add("on");
    cdTimer = setInterval(function () {
      n--;
      if (n > 0) el.textContent = n;
      else if (n === 0) el.textContent = "比！";
      else stopCountdown();
    }, 800);
  });

  // 翻卡
  function flip(to) {
    var c = P.seq[P.i]; if (!c || !c.bias || $("card").hidden) return;
    var card = $("card");
    var f = typeof to === "boolean" ? to : !card.classList.contains("flipped");
    card.classList.toggle("flipped", f);
    card.querySelector(".back").setAttribute("aria-hidden", String(!f));
    card.querySelector(".front").setAttribute("aria-hidden", String(f));
  }
  $("flipBtn").addEventListener("click", function () { flip(true); });
  $("flipBack").addEventListener("click", function () { flip(false); });

  $("startBtn").addEventListener("click", start);
  $("nextBtn").addEventListener("click", function () { go(1); });
  $("skipBtn").addEventListener("click", function () { go(1); });
  $("prevBtn").addEventListener("click", function () {
    if (!$("levelGate").hidden || !$("doneBox").hidden) { P.gateShownFor[P.i] = false; }
    go(-1);
  });
  $("gateGo").addEventListener("click", function () { P.gateShownFor[P.i] = true; render(); });
  $("gateStay").addEventListener("click", function () { P.seq = P.seq.slice(0, P.i); render(); });
  $("againBtn").addEventListener("click", start);
  $("doneSetup").addEventListener("click", function () { showView("view-setup"); });
  $("backSetup").addEventListener("click", function () { showView("view-setup"); });
  $("homeBtn").addEventListener("click", function () { showView("view-setup"); });

  document.addEventListener("keydown", function (e) {
    if (!$("view-play").classList.contains("active") || $("rulesDlg").open) return;
    if (e.target.matches("input, textarea")) return;
    if (e.key === "ArrowRight") { if (!$("levelGate").hidden) $("gateGo").click(); else go(1); }
    else if (e.key === "ArrowLeft") $("prevBtn").click();
    else if (e.key === " ") { e.preventDefault(); flip(); }
    else if (e.key === "1") vote("a");
    else if (e.key === "2") vote("b");
  });

  // ---------- 參考來源 ----------
  var lastView = "view-setup";
  function renderSources() {
    var box = $("srcBias"); box.innerHTML = "";
    Object.keys(SRC.bias).forEach(function (bias) {
      var ids = DATA.pick.filter(function (c) { return c.bias === bias; }).map(function (c) { return c.id; });
      var d = document.createElement("div"); d.className = "src-item";
      d.innerHTML = "<h3></h3><div class='cards'></div><ul class='refs'></ul>";
      d.querySelector("h3").textContent = bias;
      d.querySelector(".cards").textContent = "對應卡片：" + ids.join("、");
      SRC.bias[bias].forEach(function (r) { d.querySelector("ul").appendChild(refItem(r)); });
      box.appendChild(d);
    });
    var ul = $("srcDesign"); ul.innerHTML = "";
    SRC.design.forEach(function (r) {
      var li = refItem(r);
      var b = document.createElement("strong"); b.textContent = r.title + "：";
      li.insertBefore(b, li.firstChild); ul.appendChild(li);
    });
  }
  $("sourcesBtn").addEventListener("click", function () {
    var act = document.querySelector(".view.active");
    if (act && act.id !== "view-sources") lastView = act.id;
    showView("view-sources");
  });
  $("srcBack").addEventListener("click", function () { showView(lastView); });

  // ---------- 玩法說明 ----------
  function showRule(k) {
    $("rulesText").textContent = DATA.intro[k] || "";
    document.querySelectorAll("[data-rule]").forEach(function (b) { b.classList.toggle("on", b.dataset.rule === k); });
  }
  document.querySelectorAll("[data-rule]").forEach(function (b) { b.addEventListener("click", function () { showRule(b.dataset.rule); }); });
  $("rulesBtn").addEventListener("click", function () {
    var c = P.seq[P.i];
    showRule($("view-play").classList.contains("active") && c ? c.deck : (S.deck === "pick" ? "pick" : "talk"));
    $("rulesDlg").showModal();
  });

  renderSetup();
  renderSources();
})();
