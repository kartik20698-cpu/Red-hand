// Red Hand: a tiny chat website that uses Google's free Gemini API.
// No dependencies, just Node 18 or newer. The API key stays on the server.
// Edit the page look inside PAGE below, and the personality in SYSTEM_PROMPT.

const http = require("http");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
// If this model name stops working, copy a current one from https://aistudio.google.com
const MODEL = process.env.MODEL || "gemini-2.5-flash";

const PAGE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Red Hand</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Figtree:wght@400;500;600&display=swap">
<style>
:root {
  color-scheme: light;
  --bg: #f2f6f5;
  --surface: #ffffff;
  --fg: #0f1f1e;
  --muted: #5b6d6b;
  --line: #d9e3e1;
  --accent: #0b7a75;
  --accent-fg: #ffffff;
  --danger: #b4321f;
  --font-display: "Bricolage Grotesque", "Avenir Next", "Segoe UI", sans-serif;
  --font-body: "Figtree", "Segoe UI", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --bg: #0c1615; --surface: #142120; --fg: #e7f1ef; --muted: #8fa5a2;
    --line: #243736; --accent: #3cc2b9; --accent-fg: #04201e; --danger: #ff8a75;
  }
}
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body { background: var(--bg); color: var(--fg); font-family: var(--font-body); font-size: 16px; line-height: 1.5; }
.app {
  height: 100%; display: flex; flex-direction: column; gap: 12px;
  max-width: 760px; margin: 0 auto;
  padding-block: max(12px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-bottom, 0px));
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
}
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.brand { display: flex; align-items: center; gap: 10px; }
.mark { width: 28px; height: 28px; border-radius: 50%; background: var(--accent); position: relative; flex: none; }
.mark::after { content: ""; position: absolute; inset: 8px; border-radius: 50%; background: var(--accent-fg); }
h1 { font-family: var(--font-display); font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
.ghost { font: inherit; font-size: 14px; font-weight: 500; color: var(--muted); background: transparent; border: 1px solid var(--line); border-radius: 999px; padding: 6px 14px; cursor: pointer; }
.ghost:hover { color: var(--fg); border-color: var(--muted); }
button:focus-visible, textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
#thread { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
.welcome { margin: auto 0; display: flex; flex-direction: column; gap: 14px; }
.welcome h2 { font-family: var(--font-display); font-size: 28px; line-height: 1.15; margin: 0; text-wrap: balance; letter-spacing: -0.02em; }
.welcome p { margin: 0; color: var(--muted); max-width: 46ch; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { font: inherit; font-size: 14px; color: var(--fg); background: var(--surface); border: 1px solid var(--line); border-radius: 999px; padding: 8px 14px; cursor: pointer; text-align: left; }
.chip:hover { border-color: var(--accent); }
.msg { max-width: 88%; padding: 10px 14px; border-radius: 16px; white-space: pre-wrap; overflow-wrap: anywhere; min-width: 0; }
.msg.user { align-self: flex-end; background: var(--accent); color: var(--accent-fg); border-bottom-right-radius: 4px; }
.msg.bot { align-self: flex-start; background: var(--surface); border: 1px solid var(--line); border-bottom-left-radius: 4px; }
.msg.bot.pending { color: var(--muted); }
.note { align-self: center; font-size: 13px; color: var(--danger); text-align: center; }
form { display: flex; align-items: flex-end; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 22px; padding: 6px 6px 6px 16px; }
form:focus-within { border-color: var(--accent); }
textarea { flex: 1; min-width: 0; resize: none; border: 0; outline: 0; background: transparent; color: var(--fg); font: inherit; line-height: 1.4; padding: 8px 0; max-height: 140px; }
textarea::placeholder { color: var(--muted); }
#send { flex: none; font: inherit; font-weight: 600; font-size: 15px; border: 0; cursor: pointer; background: var(--accent); color: var(--accent-fg); border-radius: 999px; padding: 9px 18px; }
#send.stop { background: var(--fg); color: var(--bg); }
@media (prefers-reduced-motion: no-preference) {
  .pending::after { content: ""; display: inline-block; width: 6px; height: 6px; margin-left: 6px; border-radius: 50%; background: var(--muted); animation: pulse 1s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
}
</style>
</head>
<body>
<div class="app">
  <header>
    <div class="brand"><span class="mark" aria-hidden="true"></span><h1>Red Hand</h1></div>
    <button class="ghost" id="reset" type="button">New chat</button>
  </header>
  <main id="thread" aria-live="polite"></main>
  <form id="composer" autocomplete="off">
    <textarea id="box" rows="1" placeholder="Ask Red Hand anything" aria-label="Message"></textarea>
    <button id="send" type="submit">Send</button>
  </form>
</div>
<script>
(function () {
  var STARTERS = [
    "Explain how AI models like ChatGPT work",
    "Help me plan a study schedule for this week",
    "Write a short email asking for a deadline extension",
    "Give me a startup idea for India"
  ];
  var thread = document.getElementById("thread");
  var form = document.getElementById("composer");
  var box = document.getElementById("box");
  var sendBtn = document.getElementById("send");
  var resetBtn = document.getElementById("reset");
  var turns = [];
  var ctl = null;
  var busy = false;

  function scrollDown() { thread.scrollTop = thread.scrollHeight; }

  function addMsg(kind, text) {
    var el = document.createElement("div");
    el.className = "msg " + kind;
    el.textContent = text;
    thread.appendChild(el);
    scrollDown();
    return el;
  }

  function addNote(text) {
    var el = document.createElement("div");
    el.className = "note";
    el.textContent = text;
    thread.appendChild(el);
    scrollDown();
  }

  function showWelcome() {
    thread.textContent = "";
    var w = document.createElement("div");
    w.className = "welcome";
    var h = document.createElement("h2");
    h.textContent = "What do you want to figure out today?";
    var p = document.createElement("p");
    p.textContent = "Ask a question, draft something, or think through an idea. Try one of these:";
    var chips = document.createElement("div");
    chips.className = "chips";
    STARTERS.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = s;
      b.addEventListener("click", function () { send(s); });
      chips.appendChild(b);
    });
    w.appendChild(h); w.appendChild(p); w.appendChild(chips);
    thread.appendChild(w);
  }

  function setBusy(on) {
    busy = on;
    sendBtn.textContent = on ? "Stop" : "Send";
    sendBtn.classList.toggle("stop", on);
    sendBtn.type = on ? "button" : "submit";
  }

  function fitBox() {
    box.style.height = "auto";
    box.style.height = Math.min(box.scrollHeight, 140) + "px";
  }

  async function send(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    if (!turns.length) thread.textContent = "";
    box.value = "";
    fitBox();
    turns.push({ role: "user", content: text });
    addMsg("user", text);
    var bubble = addMsg("bot pending", "Thinking");
    ctl = new AbortController();
    setBusy(true);
    try {
      var r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: turns.slice(-20) }),
        signal: ctl.signal
      });
      var data = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(data.error || "Something went wrong. Send your message again.");
      bubble.classList.remove("pending");
      bubble.textContent = data.text;
      turns.push({ role: "assistant", content: data.text });
    } catch (e) {
      bubble.remove();
      turns.pop();
      if (e.name !== "AbortError") addNote(e.message || "Something went wrong. Send your message again.");
    } finally {
      ctl = null;
      setBusy(false);
      scrollDown();
      box.focus();
    }
  }

  form.addEventListener("submit", function (ev) { ev.preventDefault(); send(box.value); });
  sendBtn.addEventListener("click", function () { if (busy && ctl) ctl.abort(); });
  box.addEventListener("input", fitBox);
  box.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
      ev.preventDefault();
      send(box.value);
    }
  });
  resetBtn.addEventListener("click", function () {
    if (ctl) ctl.abort();
    turns = [];
    showWelcome();
  });

  showWelcome();
})();
</script>
</body>
</html>
`;

const SYSTEM_PROMPT =
  "You are Red Hand, a friendly and capable AI assistant on a website. " +
  "Answer clearly and concisely. Use plain text only: no markdown headings, bold or tables; short hyphen lists are fine. " +
  "Reply in the same language the user writes in. If you are unsure about something, say so.";

// Limit each visitor to 15 messages per minute so the free quota lasts.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 15;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) {
    if (list.every((t) => now - t >= 60000)) hits.delete(ip);
  }
}, 60000).unref();

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("too_large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// Accept only alternating user/assistant messages that start and end with a user message.
function cleanMessages(input) {
  if (!Array.isArray(input) || input.length === 0) return null;
  const msgs = input.slice(-20).map((m) => ({
    role: m && m.role,
    content: m && typeof m.content === "string" ? m.content.slice(0, 4000) : "",
  }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length) return null;
  for (let i = 0; i < msgs.length; i++) {
    const expected = i % 2 === 0 ? "user" : "assistant";
    if (msgs[i].role !== expected || !msgs[i].content.trim()) return null;
  }
  if (msgs[msgs.length - 1].role !== "user") return null;
  return msgs;
}

async function handleChat(req, res) {
  if (!API_KEY) {
    return sendJson(res, 500, { error: "The server has no API key yet. Set GEMINI_API_KEY and restart." });
  }
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (limited(ip)) {
    return sendJson(res, 429, { error: "You are sending messages too fast. Wait a minute and try again." });
  }

  let body;
  try {
    body = JSON.parse(await readBody(req, 100 * 1024));
  } catch (e) {
    return sendJson(res, 400, { error: "That request could not be read." });
  }
  const messages = cleanMessages(body && body.messages);
  if (!messages) return sendJson(res, 400, { error: "Send a message to start." });

  try {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(MODEL) + ":generateContent";
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 1024 },
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 429) {
      return sendJson(res, 429, { error: "The free daily or per-minute limit was reached. Try again later." });
    }
    if (!r.ok) {
      console.error("API error", r.status, JSON.stringify(data));
      return sendJson(res, 502, { error: "The AI service had a problem. Try again in a moment." });
    }
    const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    const text = parts.map((p) => p.text || "").join("");
    return sendJson(res, 200, { text: text || "I have no answer for that. Try asking in a different way." });
  } catch (e) {
    console.error("Request failed", e);
    return sendJson(res, 502, { error: "Could not reach the AI service. Try again in a moment." });
  }
}

// The page is stored inside this file, so only 2 files are needed: server.js and package.json.
function servePage(req, res) {
  const pathname = new URL(req.url, "http://x").pathname;
  if (pathname !== "/" && pathname !== "/index.html") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(PAGE);
}

http
  .createServer((req, res) => {
    if (req.method === "POST" && req.url === "/api/chat") return handleChat(req, res);
    if (req.method === "GET" || req.method === "HEAD") return servePage(req, res);
    res.writeHead(405);
    res.end("Method not allowed");
  })
  .listen(PORT, () => console.log("Red Hand is running on port " + PORT));
