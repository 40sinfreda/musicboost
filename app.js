const KEY = "musicboost:meta";
const API = "https://graph.facebook.com/v26.0";
const BUDGETS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const DAYS = [3, 7, 14, 30];
const GEO = {
  IL_FOCUS: { label: "ישראל ושכנות שיווקיות", countries: [["IL","ישראל"],["US","ארצות הברית"],["GB","בריטניה"],["FR","צרפת"],["DE","גרמניה"]] },
  ME: { label: "מזרח תיכון", countries: [["IL","ישראל"],["AE","איחוד האמירויות"],["JO","ירדן"],["EG","מצרים"],["MA","מרוקו"],["TR","טורקיה"]] },
  EU: { label: "אירופה", countries: [["GB","בריטניה"],["DE","גרמניה"],["FR","צרפת"],["ES","ספרד"],["IT","איטליה"],["NL","הולנד"],["SE","שוודיה"],["PL","פולין"]] },
  NA: { label: "צפון אמריקה", countries: [["US","ארצות הברית"],["CA","קנדה"],["MX","מקסיקו"]] },
  WORLD: { label: "עולם", countries: [["US","ארצות הברית"],["GB","בריטניה"],["DE","גרמניה"],["BR","ברזיל"],["IN","הודו"],["JP","יפן"],["AU","אוסטרליה"],["IL","ישראל"]] }
};
const GENRES = [
  { keys: ["reggaeton","dembow","רגטון"], he: "רגטון חם ללילה. אי אפשר לשבת בשקט.", en: "Hot reggaeton for the night. Hit play." },
  { keys: ["latin","latino","לאטינו"], he: "לאטינו שמזיז את הגוף. כנסו לרקוד.", en: "Latin heat that moves your body. Play." },
  { keys: ["hip hop","hiphop","rap","trap","היפ הופ","ראפ"], he: "היפ הופ חד. הקצב תופס מהשנייה הראשונה.", en: "Sharp hip hop. The beat grabs you fast." },
  { keys: ["mizrahi","מזרחית"], he: "מזרחית שמפרקת. כנסו לשמוע עכשיו.", en: "Mizrahi fire. Press play and feel it." },
  { keys: ["pop","hits","פופ"], he: "פופ שנתקע בראש כבר מהבית הראשון.", en: "Pop that sticks from the first bar." },
  { keys: ["electronic","edm","house","אלקטרוני"], he: "אלקטרוני שמניע את הרצפה. כנסו.", en: "Electronic heat that moves the floor." },
];
const state = {
  step: 1,
  media: null,
  continent: "IL_FOCUS",
  countries: ["IL"],
  gender: "all",
  dailyBudget: 10,
  days: 7,
};

function loadSession() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } }
function saveSession(s) { localStorage.setItem(KEY, JSON.stringify(s)); renderMeta(); }
function session() { return loadSession(); }
function hasHebrew(t) { return /[\u0590-\u05FF]/.test(t || ""); }
function audienceLang() { return state.countries.includes("IL") ? "he" : "en"; }
function symbol() {
  const c = document.getElementById("currency").value;
  return c === "USD" ? "$" : c === "EUR" ? "€" : "₪";
}
function clampCopy(raw) {
  const cleaned = String(raw || "").replace(/["'`״׳]/g, "").replace(/[-–—־]/g, " ").replace(/\s+/g, " ").trim();
  const chars = [...cleaned];
  if (chars.length <= 50) return cleaned;
  const sliced = chars.slice(0, 50).join("").trim();
  const cut = sliced.lastIndexOf(" ");
  return (cut >= 20 ? sliced.slice(0, cut) : sliced).trim();
}
function adCopy(media, lang) {
  const hay = ((media.title || "") + " " + (media.author || "")).toLowerCase();
  const g = GENRES.find((x) => x.keys.some((k) => hay.includes(k)));
  if (g) return clampCopy(g[lang]);
  if (media.contentType === "playlist") {
    return clampCopy(lang === "en" ? "A playlist that feels like your own station." : "פלייליסט שמרגיש כמו תחנה פרטית.");
  }
  if (media.author) {
    return clampCopy(lang === "en" ? media.author + " with a track you cannot shake." : media.author + " עם שיר שתופס ולא עוזב.");
  }
  return clampCopy(lang === "en" ? "A track that grabs you. Press play now." : "שיר שתופס ולא עוזב. כנסו להאזין.");
}
function splitSongArtist(title, fallback) {
  const cleaned = String(title || "")
    .replace(/\s*[\[(]?\s*(official\s*(music\s*)?(video|audio)|official|lyrics?|lyric\s*video|visualizer|audio\s*only|hd|4k|mv|music\s*video)\s*[\])]?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const parts = cleaned.split(/\s+[-–—|:]\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) return { artist: parts[0].trim(), song: parts.slice(1).join(" ").trim() };
  return { artist: fallback || "", song: cleaned || title || "" };
}
function formatPlays(n) {
  if (!n || !Number.isFinite(n)) return "";
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + " מיליארד";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + " מיליון";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + " אלף";
  return String(n);
}

async function graph(path, token, opts = {}) {
  const method = opts.method || "GET";
  const url = new URL(API + path);
  const init = { method };
  if (method === "GET") url.searchParams.set("access_token", token);
  else {
    const p = new URLSearchParams();
    p.set("access_token", token);
    Object.entries(opts.body || {}).forEach(([k, v]) => p.set(k, typeof v === "string" ? v : JSON.stringify(v)));
    init.headers = { "Content-Type": "application/x-www-form-urlencoded" };
    init.body = p.toString();
  }
  const res = await fetch(url, init);
  const json = await res.json();
  if (json.error) throw new Error(json.error.error_user_msg || json.error.message || "שגיאת מטא");
  return json;
}

function parseLink(raw) {
  const t = (raw || "").trim();
  if (!t) return { ok: false, error: "חסר קישור" };
  const uri = t.match(/^spotify:(track|playlist):([A-Za-z0-9]+)/i);
  if (uri) {
    const type = uri[1].toLowerCase();
    return { ok: true, data: { platform: "spotify", contentType: type, id: uri[2], canonicalUrl: "https://open.spotify.com/" + type + "/" + uri[2], thumbnail: "" } };
  }
  let u;
  try { u = new URL(t); } catch { return { ok: false, error: "זה לא קישור תקין" }; }
  const host = u.hostname.replace(/^www\./, "");
  if (/youtu/.test(host)) {
    const parts = u.pathname.split("/").filter(Boolean);
    const v = u.searchParams.get("v");
    const list = u.searchParams.get("list");
    if (host === "youtu.be" && parts[0]) return { ok: true, data: { platform: "youtube", contentType: "track", id: parts[0], canonicalUrl: "https://www.youtube.com/watch?v=" + parts[0], thumbnail: "https://img.youtube.com/vi/" + parts[0] + "/hqdefault.jpg" } };
    if (parts[0] === "playlist" && (list || parts[1])) {
      const id = list || parts[1];
      return { ok: true, data: { platform: "youtube", contentType: "playlist", id, canonicalUrl: "https://www.youtube.com/playlist?list=" + id, thumbnail: "" } };
    }
    if (v) return { ok: true, data: { platform: "youtube", contentType: list && !/^RD/.test(list) ? "playlist" : "track", id: list && !/^RD/.test(list) ? list : v, canonicalUrl: list && !/^RD/.test(list) ? "https://www.youtube.com/playlist?list=" + list : "https://www.youtube.com/watch?v=" + v, thumbnail: "https://img.youtube.com/vi/" + v + "/hqdefault.jpg" } };
    if (parts[0] === "shorts" && parts[1]) return { ok: true, data: { platform: "youtube", contentType: "track", id: parts[1], canonicalUrl: "https://www.youtube.com/watch?v=" + parts[1], thumbnail: "https://img.youtube.com/vi/" + parts[1] + "/hqdefault.jpg" } };
  }
  if (/spotify\.com$/.test(host) || host.endsWith(".spotify.com")) {
    const parts = u.pathname.split("/").filter((p) => p && !/^intl-/i.test(p) && p !== "embed");
    const i = parts.findIndex((p) => /^(track|playlist)$/i.test(p));
    if (i !== -1 && parts[i + 1]) {
      const type = parts[i].toLowerCase();
      const id = parts[i + 1].split("?")[0];
      return { ok: true, data: { platform: "spotify", contentType: type, id, canonicalUrl: "https://open.spotify.com/" + type + "/" + id, thumbnail: "" } };
    }
  }
  return { ok: false, error: "הקישור לא זוהה כיוטיוב או ספוטיפיי" };
}

async function fetchMeta(media) {
  try {
    const r = await fetch("https://noembed.com/embed?url=" + encodeURIComponent(media.canonicalUrl));
    if (!r.ok) return media;
    const j = await r.json();
    const split = splitSongArtist(j.title || "", j.author_name || "");
    return {
      ...media,
      title: split.song || j.title || media.title || "",
      author: split.artist || j.author_name || "",
      thumbnail: j.thumbnail_url || media.thumbnail || "",
    };
  } catch { return media; }
}

function showErr(id, msg) {
  const el = document.getElementById(id);
  el.className = "err";
  el.textContent = msg;
  el.classList.remove("hidden");
}
function hide(id) { document.getElementById(id).classList.add("hidden"); }

function renderMeta() {
  const s = session();
  const btn = document.getElementById("metaBtn");
  const box = document.getElementById("connectedBox");
  if (!s) { btn.textContent = "התחבר למטא"; box.classList.add("hidden"); return; }
  btn.textContent = "מטא " + s.userName;
  box.classList.remove("hidden");
  document.getElementById("who").textContent = "מחובר כ" + s.userName + ". הטוקן שמור בדפדפן הזה.";
  document.getElementById("accountSel").innerHTML = (s.accounts || []).map((x) => '<option value="' + x.id + '"' + (x.id === s.adAccountId ? " selected" : "") + ">" + x.name + (x.currency ? " " + x.currency : "") + "</option>").join("");
  const p = document.getElementById("pageSel");
  p.innerHTML = (s.pages || []).length ? s.pages.map((x) => '<option value="' + x.id + '"' + (x.id === s.pageId ? " selected" : "") + ">" + x.name + "</option>").join("") : '<option value="">אין דף</option>';
}

function setStep(n) {
  state.step = n;
  const labels = ["", "קישור", "קהל", "תקציב", "מודעה", "סגירה"];
  document.getElementById("stepLabel").textContent = "שלב " + n + " מתוך 5 " + labels[n];
  [1,2,3,4,5].forEach((i) => {
    document.getElementById("step" + i).classList.toggle("hidden", i !== n);
    document.querySelector('.step[data-s="' + i + '"]').classList.toggle("on", i <= n);
  });
  if (n === 3) renderBudget();
  if (n === 4) fillAdCopy();
  if (n === 5) renderSummary();
}

function renderContinents() {
  document.getElementById("continents").innerHTML = Object.entries(GEO).map(([k, v]) => '<button type="button" class="chip' + (state.continent === k ? " on" : "") + '" data-c="' + k + '">' + v.label + "</button>").join("");
  renderCountries();
}
function renderCountries() {
  document.getElementById("countries").innerHTML = GEO[state.continent].countries.map(([code, name]) => '<button type="button" class="chip' + (state.countries.includes(code) ? " on" : "") + '" data-code="' + code + '">' + name + "</button>").join("");
}
function renderBudget() {
  const s = symbol();
  document.getElementById("budgets").innerHTML = BUDGETS.map((n) => '<button type="button" class="chip' + (state.dailyBudget === n ? " on" : "") + '" data-b="' + n + '">' + s + n + "</button>").join("");
  document.getElementById("days").innerHTML = DAYS.map((d) => '<button type="button" class="chip' + (state.days === d ? " on" : "") + '" data-d="' + d + '">' + d + " ימים</button>").join("");
  document.getElementById("budgetSum").innerHTML =
    '<div class="kv"><dt>תקציב יומי</dt><dd>' + s + state.dailyBudget + '</dd></div>' +
    '<div class="kv"><dt>משך</dt><dd>' + state.days + ' ימים</dd></div>' +
    '<div class="kv"><dt>סה״כ לקמפיין</dt><dd>' + s + (state.dailyBudget * state.days) + "</dd></div>";
}
function fillAdCopy() {
  const lang = audienceLang();
  const media = state.media || { title: "", author: "", contentType: "track" };
  document.getElementById("adLead").textContent = lang === "en"
    ? "הקהל מחוץ לישראל, אז כל הטקסט במודעה באנגלית. אפשר לתקן לפני הסגירה."
    : "הטקסט הראשי נכתב לפי הסגנון שזוהה בשיר או בפלייליסט. אפשר לתקן לפני הסגירה.";
  const body = document.getElementById("adBody");
  if (!body.value || hasHebrew(body.value) !== (lang === "he") || /לחץ והאזן/.test(body.value)) {
    body.value = adCopy(media, lang);
  }
  document.getElementById("adCount").textContent = "עד 50 תווים. " + [...body.value].length + " מתוך 50";
}
function renderSummary() {
  const m = state.media || {};
  const names = GEO[state.continent].countries.filter(([c]) => state.countries.includes(c)).map((x) => x[1]).join(", ");
  const s = symbol();
  const rows = [
    ["קטגוריה", m.contentType === "playlist" ? "פלייליסט" : "שיר"],
    ["מקור", m.platform === "youtube" ? "יוטיוב" : "ספוטיפיי"],
    ["שם השיר", m.title || ""],
    ["אומן", m.author || ""],
    ["מדינות", names],
    ["גילאים", document.getElementById("ageMin").value + " עד " + document.getElementById("ageMax").value],
    ["תקציב", s + state.dailyBudget + " ליום, " + state.days + " ימים"],
    ["סה״כ", s + (state.dailyBudget * state.days)],
    ["מטא", session() ? session().userName : "לא מחובר"],
  ];
  document.getElementById("summary").innerHTML = rows.map(([k, v]) => '<div class="kv"><dt>' + k + "</dt><dd>" + (v || "") + "</dd></div>").join("");
}

document.getElementById("connectBtn").onclick = async () => {
  hide("connectErr");
  const token = document.getElementById("token").value.trim();
  if (token.length < 10) return showErr("connectErr", "חסר טוקן");
  try {
    const me = await graph("/me?fields=id,name", token);
    const acc = await graph("/me/adaccounts?fields=id,name,account_id,currency,account_status&limit=50", token);
    const pages = await graph("/me/accounts?fields=id,name&limit=50", token);
    const accounts = (acc.data || []).filter((a) => a.account_status === 1 || a.account_status == null).map((a) => ({ id: a.id, name: a.name, accountId: a.account_id, currency: a.currency || "" }));
    if (!accounts.length) throw new Error("לא נמצא חשבון מודעות פעיל");
    const pg = (pages.data || []).map((p) => ({ id: p.id, name: p.name }));
    const ignite = accounts.find((a) => /ignite/i.test(a.name)) || accounts[0];
    const ignitePage = pg.find((p) => /ignite/i.test(p.name)) || pg[0];
    saveSession({ token, userId: me.id, userName: me.name, accounts, pages: pg, adAccountId: ignite.id, pageId: ignitePage ? ignitePage.id : "" });
    document.getElementById("token").value = "";
  } catch (e) { showErr("connectErr", e.message); }
};
document.getElementById("logoutBtn").onclick = () => { localStorage.removeItem(KEY); renderMeta(); };
document.getElementById("accountSel").onchange = (e) => { const s = session(); if (s) saveSession({ ...s, adAccountId: e.target.value }); };
document.getElementById("pageSel").onchange = (e) => { const s = session(); if (s) saveSession({ ...s, pageId: e.target.value }); };
document.getElementById("metaBtn").onclick = () => {
  const card = document.getElementById("connectCard");
  card.classList.remove("hidden");
  card.scrollIntoView({ behavior: "smooth" });
};

document.getElementById("detectBtn").onclick = async () => {
  hide("detectErr");
  const parsed = parseLink(document.getElementById("url").value);
  if (!parsed.ok) return showErr("detectErr", parsed.error);
  const media = await fetchMeta({ ...parsed.data, title: "", author: "" });
  if (!media.title) media.title = media.contentType === "playlist" ? "פלייליסט" : "שיר";
  state.media = media;
  const cat = media.contentType === "playlist" ? "פלייליסט" : "שיר";
  const src = media.platform === "youtube" ? "יוטיוב" : "ספוטיפיי";
  const plays = formatPlays(media.plays);
  document.getElementById("mediaBox").className = "media";
  document.getElementById("mediaBox").innerHTML =
    (media.thumbnail ? '<img src="' + media.thumbnail + '" alt="" />' : '<div class="ph"></div>') +
    '<dl class="meta">' +
      "<div><dt>קטגוריה</dt><dd>" + cat + "</dd></div>" +
      "<div><dt>מקור</dt><dd>" + src + "</dd></div>" +
      (plays ? "<div><dt>השמעות</dt><dd>" + plays + "</dd></div>" : "") +
    "</dl>" +
    '<div class="song"><h3>' + media.title + "</h3><p class='muted'>" + (media.author || "") + "</p></div>";
  document.getElementById("to2").disabled = false;
  document.getElementById("adTitle").value = media.title.slice(0, 40);
  document.getElementById("adBody").value = adCopy(media, audienceLang());
  const now = new Date();
  const d = now.getDate() + "." + (now.getMonth() + 1) + "." + now.getFullYear();
  document.getElementById("campName").value = "MusicBoost " + src + " " + media.title.slice(0, 24) + " " + d;
};

document.getElementById("to2").onclick = () => { renderContinents(); setStep(2); };
document.getElementById("to3").onclick = () => { if (!state.countries.length) return; setStep(3); };
document.getElementById("to4").onclick = () => setStep(4);
document.getElementById("to5").onclick = () => setStep(5);
document.querySelectorAll("[data-back]").forEach((b) => { b.onclick = () => setStep(Number(b.dataset.back)); });
document.getElementById("continents").addEventListener("click", (e) => {
  const t = e.target.closest("[data-c]");
  if (!t) return;
  state.continent = t.dataset.c;
  state.countries = GEO[state.continent].countries.map((x) => x[0]);
  renderContinents();
});
document.getElementById("countries").addEventListener("click", (e) => {
  const t = e.target.closest("[data-code]");
  if (!t) return;
  const c = t.dataset.code;
  state.countries = state.countries.includes(c) ? state.countries.filter((x) => x !== c) : state.countries.concat(c);
  renderCountries();
});
document.getElementById("genders").addEventListener("click", (e) => {
  const t = e.target.closest("[data-g]");
  if (!t) return;
  state.gender = t.dataset.g;
  document.querySelectorAll("#genders .chip").forEach((c) => c.classList.toggle("on", c.dataset.g === state.gender));
});
document.getElementById("budgets").addEventListener("click", (e) => {
  const t = e.target.closest("[data-b]");
  if (!t) return;
  state.dailyBudget = Number(t.dataset.b);
  renderBudget();
});
document.getElementById("days").addEventListener("click", (e) => {
  const t = e.target.closest("[data-d]");
  if (!t) return;
  state.days = Number(t.dataset.d);
  renderBudget();
});
document.getElementById("currency").onchange = renderBudget;
document.getElementById("adBody").addEventListener("input", () => {
  document.getElementById("adCount").textContent = "עד 50 תווים. " + [...document.getElementById("adBody").value].length + " מתוך 50";
});

document.getElementById("publishBtn").onclick = async () => {
  const box = document.getElementById("pubMsg");
  box.innerHTML = "";
  const s = session();
  if (!s || !s.token || !s.adAccountId || !s.pageId) {
    document.getElementById("connectCard").classList.remove("hidden");
    box.innerHTML = '<div class="err">תחבר למטא ובחר חשבון ודף.</div>';
    return;
  }
  const m = state.media;
  const name = document.getElementById("campName").value.trim() || "MusicBoost";
  const budget = Math.round(state.dailyBudget * 100);
  const targeting = {
    geo_locations: { countries: state.countries },
    age_min: Math.max(13, Number(document.getElementById("ageMin").value) || 18),
    age_max: Math.min(65, Number(document.getElementById("ageMax").value) || 34),
  };
  if (state.gender !== "all") targeting.genders = [Number(state.gender)];
  try {
    const act = s.adAccountId.replace(/^act_/, "");
    const campaign = await graph("/act_" + act + "/campaigns", s.token, { method: "POST", body: { name, objective: "OUTCOME_TRAFFIC", status: "PAUSED", special_ad_categories: [] } });
    const adset = await graph("/act_" + act + "/adsets", s.token, { method: "POST", body: { name: name + " AdSet", campaign_id: campaign.id, daily_budget: budget, billing_event: "IMPRESSIONS", optimization_goal: "LINK_CLICKS", bid_strategy: "LOWEST_COST_WITHOUT_CAP", targeting, destination_type: "WEBSITE", status: "PAUSED" } });
    const link_data = { link: m.canonicalUrl, message: document.getElementById("adBody").value, name: document.getElementById("adTitle").value, call_to_action: { type: document.getElementById("cta").value } };
    if (m.thumbnail) link_data.picture = m.thumbnail;
    const creative = await graph("/act_" + act + "/adcreatives", s.token, { method: "POST", body: { name: name + " Creative", object_story_spec: { page_id: s.pageId, link_data } } });
    await graph("/act_" + act + "/ads", s.token, { method: "POST", body: { name: name + " Ad", adset_id: adset.id, creative: { creative_id: creative.id }, status: "PAUSED" } });
    const href = "https://www.facebook.com/adsmanager/manage/campaigns?act=" + act + "&selected_campaign_ids=" + campaign.id;
    box.innerHTML = '<div class="ok">הקמפיין נוצר במצב מושהה (מזהה ' + campaign.id + '). <a href="' + href + '" target="_blank" rel="noopener">פתיחה ב Ads Manager</a></div>';
  } catch (e) { box.innerHTML = '<div class="err">' + e.message + "</div>"; }
};

renderMeta();
renderContinents();
renderBudget();
