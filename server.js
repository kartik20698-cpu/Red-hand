// Red Hand: a tiny chat website that uses Google's free Gemini API.
// No dependencies, just Node 18 or newer. The API key stays on the server.
// Edit the page look inside PAGE below, and the personality in SYSTEM_PROMPT.

const http = require("http");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
// If this model name stops working, copy a current one from https://aistudio.google.com
const MODEL = process.env.MODEL || "gemini-3.5-flash-lite";

const PAGE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<title>Red Hand</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Figtree:wght@400;500;600&display=swap">
<style>
:root {
  color-scheme: dark;
  --bg: #0a0507;
  --panel: rgba(26, 11, 15, 0.58);
  --fg: #f7eceb;
  --muted: #bd9d9d;
  --line: rgba(255, 255, 255, 0.13);
  --accent: #e0222f;
  --accent-deep: #a4121d;
  --accent-fg: #ffffff;
  --danger: #ff9a9a;
  --font-display: "Bricolage Grotesque", "Avenir Next", "Segoe UI", sans-serif;
  --font-body: "Figtree", "Segoe UI", system-ui, sans-serif;
}
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  background-color: var(--bg);
  background-image:
    radial-gradient(52% 42% at 50% 22%, rgba(224, 34, 47, 0.30), transparent 70%),
    radial-gradient(60% 40% at 0% 100%, rgba(120, 10, 20, 0.40), transparent 70%);
  color: var(--fg);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.5;
  overflow: hidden;
}
@media (min-width: 900px) and (min-aspect-ratio: 23/20) {
  body {
    background-image:
      radial-gradient(40% 55% at 76% 48%, rgba(224, 34, 47, 0.32), transparent 70%),
      radial-gradient(50% 40% at 0% 100%, rgba(120, 10, 20, 0.40), transparent 70%);
  }
}
#stage {
  position: fixed; inset: 0; width: 100%; height: 100%; display: block;
  z-index: 0; pointer-events: none; opacity: 0; transition: opacity 1.2s ease;
}
#stage.on { opacity: 1; }

.app {
  position: relative; z-index: 1; height: 100%;
  display: flex; flex-direction: column;
  padding-top: max(12px, env(safe-area-inset-top, 0px));
  padding-bottom: max(12px, env(safe-area-inset-bottom, 0px));
  padding-left: max(12px, env(safe-area-inset-left, 0px));
  padding-right: max(12px, env(safe-area-inset-right, 0px));
}
.panel {
  flex: 1; min-height: 0; margin-top: clamp(80px, 24vh, 240px);
  display: flex; flex-direction: column; gap: 12px;
  width: 100%; max-width: 720px; margin-left: auto; margin-right: auto;
  padding: 14px;
  background: var(--panel);
  -webkit-backdrop-filter: blur(18px) saturate(1.25);
  backdrop-filter: blur(18px) saturate(1.25);
  border: 1px solid var(--line);
  border-radius: 26px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.10);
}
@media (min-width: 900px) and (min-aspect-ratio: 23/20) {
  .app { padding: 20px 0; }
  .panel { margin-top: 0; margin-left: 6vw; margin-right: 0; width: min(640px, 46vw); max-width: none; }
}
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.mark {
  width: 28px; height: 28px; border-radius: 50%; flex: none;
  background: radial-gradient(circle at 32% 26%, #ffb3b8 0%, #f0303d 34%, #8f0d17 72%, #4a050b 100%);
  box-shadow: 0 4px 14px rgba(224, 34, 47, 0.55);
}
h1 { font-family: var(--font-display); font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
.ghost {
  font: inherit; font-size: 14px; font-weight: 500; color: var(--muted);
  background: rgba(255, 255, 255, 0.05); border: 1px solid var(--line);
  border-radius: 999px; padding: 6px 14px; cursor: pointer;
}
.ghost:hover { color: var(--fg); border-color: rgba(255, 255, 255, 0.3); }
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

#thread { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 4px 2px; scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.2) transparent; }
.welcome { margin: auto 0; display: flex; flex-direction: column; gap: 14px; }
.welcome h2 { font-family: var(--font-display); font-size: 28px; line-height: 1.15; margin: 0; text-wrap: balance; letter-spacing: -0.02em; }
.welcome p { margin: 0; color: var(--muted); max-width: 46ch; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  font: inherit; font-size: 14px; color: var(--fg); background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--line); border-radius: 999px; padding: 8px 14px; cursor: pointer; text-align: left;
}
.chip:hover { border-color: var(--accent); background: rgba(224, 34, 47, 0.14); }

.msg { max-width: 88%; padding: 10px 14px; border-radius: 18px; white-space: pre-wrap; overflow-wrap: anywhere; min-width: 0; }
.msg.user {
  align-self: flex-end; color: var(--accent-fg); border-bottom-right-radius: 5px;
  background: linear-gradient(145deg, var(--accent), var(--accent-deep));
  box-shadow: 0 8px 22px rgba(164, 18, 29, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
.msg.bot {
  align-self: flex-start; border-bottom-left-radius: 5px;
  background: rgba(255, 255, 255, 0.07); border: 1px solid var(--line);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.msg.bot.pending { color: var(--muted); }
.note { align-self: center; font-size: 13px; color: var(--danger); text-align: center; }

form {
  display: flex; align-items: flex-end; gap: 8px;
  background: rgba(0, 0, 0, 0.38); border: 1px solid var(--line);
  border-radius: 22px; padding: 6px 6px 6px 16px;
}
form:focus-within { border-color: var(--accent); }
textarea {
  flex: 1; min-width: 0; resize: none; border: 0; outline: 0; background: transparent; color: var(--fg);
  font: inherit; line-height: 1.4; padding: 8px 0; max-height: 140px;
}
textarea::placeholder { color: var(--muted); }
#send {
  flex: none; font: inherit; font-weight: 600; font-size: 15px; border: 0; cursor: pointer;
  color: var(--accent-fg); border-radius: 999px; padding: 9px 18px;
  background: linear-gradient(145deg, var(--accent), var(--accent-deep));
  box-shadow: 0 6px 16px rgba(164, 18, 29, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
#send.stop { background: #f7eceb; color: #1a0a0e; box-shadow: none; }
@media (prefers-reduced-motion: no-preference) {
  .pending::after { content: ""; display: inline-block; width: 6px; height: 6px; margin-left: 6px; border-radius: 50%; background: var(--muted); animation: pulse 1s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
}
</style>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
  }
}
</script>
</head>
<body>
<canvas id="stage" aria-hidden="true"></canvas>
<div class="app">
  <div class="panel">
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
    if (window.redHandOrb) window.redHandOrb.busy(on);
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

<script type="module">
// 3D scene: a glossy red liquid orb with soft particles. If anything fails to load,
// the page keeps working and shows the red glow background instead.
(async function () {
  var canvas = document.getElementById("stage");
  if (!canvas) return;
  var THREE, RoomEnvironment, mergeVertices;
  try {
    THREE = await import("three");
    RoomEnvironment = (await import("three/addons/environments/RoomEnvironment.js")).RoomEnvironment;
    mergeVertices = (await import("three/addons/utils/BufferGeometryUtils.js")).mergeVertices;
  } catch (e) {
    console.warn("3D scene not loaded", e);
    return;
  }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    console.warn("WebGL not available", e);
    return;
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = Math.min(window.innerWidth, window.innerHeight) < 600;
  var wideQuery = window.matchMedia("(min-width: 900px) and (min-aspect-ratio: 23/20)");

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  var key = new THREE.DirectionalLight(0xffd9cc, 2.0);
  key.position.set(3, 4, 5);
  scene.add(key);
  var rim = new THREE.PointLight(0xff3344, 40, 0, 2);
  rim.position.set(-4, 1.5, -2);
  scene.add(rim);

  // Orb: a sphere whose surface moves like thick liquid.
  var geo = new THREE.IcosahedronGeometry(1, small ? 14 : 20);
  geo.deleteAttribute("uv");
  geo.deleteAttribute("normal");
  geo = mergeVertices(geo);
  var posAttr = geo.attributes.position;
  var count = posAttr.count;
  var base = new Float32Array(posAttr.array);
  var mat = new THREE.MeshPhysicalMaterial({
    color: 0xc1121f, metalness: 0.25, roughness: 0.16,
    clearcoat: 1.0, clearcoatRoughness: 0.06, envMapIntensity: 1.25
  });
  var orb = new THREE.Mesh(geo, mat);
  scene.add(orb);

  // Floating dust around the orb.
  var N = small ? 220 : 420;
  var pp = new Float32Array(N * 3);
  for (var i = 0; i < N; i++) {
    var r = 3 + Math.random() * 5;
    var th = Math.random() * Math.PI * 2;
    var ph = Math.acos(2 * Math.random() - 1);
    pp[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pp[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pp[i * 3 + 2] = r * Math.cos(ph) - 2;
  }
  var pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  var pm = new THREE.PointsMaterial({
    color: 0xff6b75, size: 0.035, transparent: true, opacity: 0.65,
    depthWrite: false, blending: THREE.AdditiveBlending
  });
  var dust = new THREE.Points(pg, pm);
  scene.add(dust);

  var home = new THREE.Vector3(0, 0, 0);
  function layout() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    var H = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    var halfW = (H * camera.aspect) / 2;
    var radius;
    if (wideQuery.matches) {
      radius = Math.min(0.27 * H, 0.42 * halfW);
      home.set(halfW * 0.52, 0, 0);
    } else {
      radius = Math.min(0.17 * H, 0.38 * halfW);
      home.set(0, H * 0.27, 0);
    }
    orb.scale.setScalar(radius);
  }

  function field(x, y, z, t) {
    return 0.55 * Math.sin(x * 2.1 + t * 0.9) * Math.cos(y * 1.8 - t * 0.7) +
           0.45 * Math.sin(z * 2.6 + y * 1.4 + t * 1.1);
  }

  var t = 0, amp = 0.09, ampT = 0.09, speed = 1, speedT = 1;
  var tx = 0, ty = 0, cx = 0, cy = 0;
  var arr = posAttr.array;

  function step(dt) {
    if (!reduce) t += dt * speed;
    var k = Math.min(1, dt * 4);
    amp += (ampT - amp) * k;
    speed += (speedT - speed) * Math.min(1, dt * 3);
    cx += (tx - cx) * Math.min(1, dt * 3);
    cy += (ty - cy) * Math.min(1, dt * 3);

    for (var i = 0; i < count; i++) {
      var bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
      var d = 1 + amp * field(bx, by, bz, t);
      arr[i * 3] = bx * d;
      arr[i * 3 + 1] = by * d;
      arr[i * 3 + 2] = bz * d;
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();

    orb.rotation.y = t * 0.25 + cx * 0.8;
    orb.rotation.x = cy * 0.5;
    orb.position.set(home.x + cx * 0.25, home.y - cy * 0.18 + Math.sin(t * 0.8) * 0.06, home.z);
    dust.rotation.y = t * 0.02;
    renderer.render(scene, camera);
  }

  var last = performance.now();
  function loop(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    step(dt);
    requestAnimationFrame(loop);
  }

  window.addEventListener("pointermove", function (e) {
    tx = e.clientX / window.innerWidth - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });
  window.addEventListener("resize", function () {
    layout();
    if (reduce) step(0);
  });

  window.redHandOrb = {
    busy: function (on) {
      ampT = on ? 0.2 : 0.09;
      speedT = on ? 2.6 : 1;
    }
  };

  layout();
  step(0);
  canvas.classList.add("on");
  if (!reduce) requestAnimationFrame(loop);
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
      signal: AbortSignal.timeout(45000),
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
    if (e && e.name === "TimeoutError") {
      return sendJson(res, 504, { error: "The AI took too long to answer. Try again in a moment." });
    }
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
