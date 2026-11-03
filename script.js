const FLOWER_IMAGES = [
  "assets/pink_tulip.png",
  "assets/white_tulip.png"
];

const TULIP_BOUQUET_IMAGE = "assets/tulip_bouquet.png";

const MUSIC_FILE = "assets/always.mp3";
const MUSIC_VOLUME = 0.7;

/* ---------- settings ---------- */
const SETTINGS = {
  firstBurst: 70,        // flowers on the first tap
  spamBurst: 40,         // flowers on every next tap on the envelope
  popupBurst: 60,        // flowers when the bouquet pops up
  waves: 5,              // extra waves after the first tap
  waveEvery: 450,        // ms between waves
  waveSize: 28,
  minSize: 36,           // px
  maxSize: 90,           // px
  maxOnScreen: 400,
};

const envelope = document.getElementById("envelope");
const letter = document.getElementById("letter");
const layer = document.getElementById("flowers");
const hint = document.getElementById("hint");
const popup = document.getElementById("popup");
const bouquetImg = document.getElementById("bouquetImg");
const bouquetFallback = document.getElementById("bouquetFallback");
const EMOJI = ["🌷", "🌸", "🌺", "💮", "🌼"];

let state = "closed";     // closed -> opening -> revealed
let flipLock = false;

const rand = (a, b) => Math.random() * (b - a) + a;
const isPlaceholder = (s) => !s || /^\s*\{\{.*\}\}\s*$/.test(s);

/* ---------- bouquet image setup ---------- */
if (bouquetImg && !isPlaceholder(TULIP_BOUQUET_IMAGE)) {
  bouquetImg.src = TULIP_BOUQUET_IMAGE;
  bouquetImg.hidden = false;
  if (bouquetFallback) bouquetFallback.hidden = true;
}

/* ---------- flowers ---------- */
function makeFlower(i) {
  const size = rand(SETTINGS.minSize, SETTINGS.maxSize);
  const src = FLOWER_IMAGES[Math.floor(Math.random() * FLOWER_IMAGES.length)];
  let el;

  if (isPlaceholder(src)) {
    el = document.createElement("span");
    el.className = "flower fallback";
    el.textContent = EMOJI[i % EMOJI.length];
    el.style.fontSize = size * 0.8 + "px";
  } else {
    el = document.createElement("img");
    el.className = "flower";
    el.src = src;
    el.alt = "";
    el.draggable = false;
  }
  el.style.width = size + "px";
  el.style.height = size + "px";
  return el;
}

function getOrigin() {
  const target = state === "revealed" ? letter : envelope;
  const r = target.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height * 0.4 };
}

function burst(count, origin = getOrigin()) {
  for (let i = 0; i < count; i++) {
    if (layer.childElementCount > SETTINGS.maxOnScreen) break;

    const el = makeFlower(i);
    layer.appendChild(el);

    const size = parseFloat(el.style.width);
    const angle = rand(-Math.PI * 0.95, -Math.PI * 0.05); // upward fan
    const power = rand(120, Math.max(window.innerHeight * 0.75, 260));
    const dx = Math.cos(angle) * power * rand(0.6, 1.4);
    const dy = Math.sin(angle) * power;
    const fall = window.innerHeight - origin.y + size + rand(40, 200);
    const spin = rand(-540, 540);
    const sway = rand(-60, 60);
    const x0 = origin.x - size / 2;
    const y0 = origin.y - size / 2;

    const anim = el.animate(
      [
        { transform: `translate(${x0}px, ${y0}px) scale(.2) rotate(0deg)`, opacity: 0 },
        { transform: `translate(${x0 + dx * 0.55}px, ${y0 + dy}px) scale(1) rotate(${spin * 0.4}deg)`, opacity: 1, offset: 0.32 },
        { transform: `translate(${x0 + dx + sway}px, ${y0 + dy + fall}px) scale(${rand(0.8, 1.1)}) rotate(${spin}deg)`, opacity: 1, offset: 0.92 },
        { transform: `translate(${x0 + dx + sway}px, ${y0 + dy + fall}px) scale(.9) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: rand(1900, 3400), delay: rand(0, 260), easing: "cubic-bezier(.22,.7,.35,1)", fill: "both" }
    );
    anim.onfinish = () => el.remove();
  }
}

function spamWaves() {
  for (let w = 1; w <= SETTINGS.waves; w++) {
    setTimeout(() => burst(SETTINGS.waveSize), w * SETTINGS.waveEvery);
  }
}

/* ---------- auto-fit a long message inside the card ---------- */
function fitMessage() {
  const c = document.querySelector(".front .content");
  if (!c) return;
  let fit = 1;
  c.style.setProperty("--fit", fit);
  while (c.scrollHeight > c.clientHeight + 1 && fit > 0.55) {
    fit -= 0.05;
    c.style.setProperty("--fit", fit.toFixed(2));
  }
}
fitMessage();
window.addEventListener("load", fitMessage);
window.addEventListener("resize", fitMessage);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMessage);

/* ---------- drop the envelope so the big card sits in the middle of the screen ---------- */
function placeEnvelope() {
  const vh = window.innerHeight;
  const r = envelope.getBoundingClientRect();
  const ch = letter.offsetHeight;
  let d = vh / 2 + 0.8 * ch - r.top - 0.94 * r.height;
  const max = vh - 12 - r.height - r.top;   // keep the envelope on screen
  d = Math.max(0, Math.min(d, max));
  envelope.style.translate = `0 ${d}px`;
}

/* ---------- music (safe: never blocks the animation) ---------- */
// uses <audio id="bgm"> if it exists, otherwise creates one
const bgm = document.getElementById("bgm") || new Audio();
bgm.loop = true;
bgm.preload = "auto";

function startMusic() {
  try {
    if (isPlaceholder(MUSIC_FILE)) return;    // no file set yet
    if (!bgm.getAttribute("src")) bgm.src = MUSIC_FILE;
    bgm.volume = MUSIC_VOLUME;
    const p = bgm.play();
    if (p && p.catch) p.catch(() => {});      // ignore if the browser refuses
  } catch (err) {
    console.warn("Music could not start:", err);
  }
}

/* ---------- 1) first tap: shake -> flowers -> card comes out ---------- */
function openSequence() {
  state = "opening";
  hint.textContent = "💗";

  envelope.classList.remove("shake");
  void envelope.offsetWidth;
  envelope.classList.add("shake");

  setTimeout(() => burst(SETTINGS.firstBurst), 250);
  spamWaves();

  setTimeout(() => envelope.classList.remove("shake"), 700);
  setTimeout(() => envelope.classList.add("open"), 700);   // flap opens
  setTimeout(() => envelope.classList.add("pull"), 1300);  // card slides out
  setTimeout(() => {                                       // card in front + big
    placeEnvelope();
    envelope.classList.add("show");
    hint.classList.add("hide");
  }, 2250);
  setTimeout(() => { state = "revealed"; }, 2700);         // card can be tapped

  startMusic();   // last, so a music problem can never block the animation
}

/* ---------- 2) tap card: flip ---------- */
function flipCard() {
  if (flipLock) return;
  flipLock = true;
  envelope.classList.toggle("flipped");
  setTimeout(() => (flipLock = false), 800);
}

/* ---------- 3) tap the back of the card: bouquet pop-up ---------- */
function openPopup() {
  if (!popup) return;
  popup.classList.add("show");
  popup.setAttribute("aria-hidden", "false");
  burst(SETTINGS.popupBurst, { x: window.innerWidth / 2, y: window.innerHeight * 0.5 });
  setTimeout(() => burst(SETTINGS.popupBurst / 2, { x: window.innerWidth / 2, y: window.innerHeight * 0.5 }), 350);
}

function closePopup() {
  if (!popup) return;
  popup.classList.remove("show");
  popup.setAttribute("aria-hidden", "true");
}

/* ---------- click routing ---------- */
envelope.addEventListener("click", (e) => {
  if (state === "opening") return;
  if (state === "closed") return openSequence();

  // revealed
  if (e.target.closest("#letter")) {
    // back of the card is showing -> tap = claim the bouquet
    if (envelope.classList.contains("flipped")) return openPopup();
    return flipCard();
  }
  burst(SETTINGS.spamBurst);   // tapping the envelope = more flowers
});

envelope.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    envelope.click();
  }
});

const popupClose = document.getElementById("popupClose");
const popupBackdrop = document.getElementById("popupBackdrop");
if (popupClose) popupClose.addEventListener("click", closePopup);
if (popupBackdrop) popupBackdrop.addEventListener("click", closePopup);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePopup(); });