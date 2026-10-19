import { SUPPORT_URL, SPONSOR } from "./config.js";

const toggleButton = document.querySelector("#toggle");
const statusText = document.querySelector("#status");
const intensity = document.querySelector("#intensity");
const intensityValue = document.querySelector("#intensity-value");
const textDrift = document.querySelector("#text-drift");
const supportLink = document.querySelector("#support-link");
const sponsorCard = document.querySelector("#sponsor-card");
let tabId;
let effectActive = false;
let pageAvailable = false;
let effectRevision = 0;
let pendingEffect = null;
let syncingEffect = false;

function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function configureMonetization() {
  const supportUrl = httpsUrl(SUPPORT_URL);
  if (supportUrl) {
    supportLink.href = supportUrl.href;
    supportLink.hidden = false;
  }

  const sponsorUrl = httpsUrl(SPONSOR.url);
  if (sponsorUrl && SPONSOR.headline && SPONSOR.description) {
    document.querySelector("#sponsor-headline").textContent = SPONSOR.headline;
    document.querySelector("#sponsor-description").textContent = SPONSOR.description;
    document.querySelector("#sponsor-link").href = sponsorUrl.href;
    sponsorCard.hidden = false;
  }
}

function updateButton() {
  const intensityIsZero = Number(intensity.value) === 0;
  toggleButton.disabled = !pageAvailable || (!effectActive && intensityIsZero);
  toggleButton.textContent = "Apply";
  toggleButton.classList.toggle("is-active", effectActive);
}

async function readPageState() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id;
  if (tabId === undefined) return false;

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => Boolean(document.getElementById("__almost_aligned_style__"))
    });
    effectActive = Boolean(result?.result);
    pageAvailable = true;
  } catch {
    effectActive = false;
    pageAvailable = false;
    statusText.textContent = "Chrome does not allow extensions on this page.";
  }
  updateButton();
}

function setAlmostAligned(amount, shiftText) {
  const styleId = "__almost_aligned_style__";
  const cameoId = "__almost_aligned_cameo__";
  const alreadyEnabled = Boolean(document.getElementById(styleId));
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `[data-almost-aligned] {
    translate: calc(var(--almost-aligned-x) + var(--almost-aligned-text-x, 0px)) var(--almost-aligned-y) !important;
    rotate: var(--almost-aligned-angle) !important;
  }`;
    document.documentElement.append(style);
  }

  const requestedPixels = Number(amount);
  const maxPixels = Number.isFinite(requestedPixels)
    ? Math.max(0, Math.min(15, requestedPixels))
    : 2;
  const maxAngle = Math.min(0.4, maxPixels * 0.04);
  const targets = document.querySelectorAll("h1,h2,h3,p,li,a,button,input,img,blockquote,td,th");
  const textTargets = new Set(document.querySelectorAll("h1,h2,h3,p,li,a,button,blockquote,td,th"));

  if (!alreadyEnabled) {
    for (const element of targets) {
      if (Math.random() < 0.4) continue;
      const bounds = element.getBoundingClientRect();
      if (bounds.width < 8 || bounds.height < 8) continue;
      element.dataset.almostAlignedFactorX = String(Math.random() * 2 - 1);
      element.dataset.almostAlignedFactorY = String(Math.random() * 2 - 1);
      element.dataset.almostAlignedFactorAngle = String(Math.random() * 2 - 1);
      if (textTargets.has(element)) {
        element.dataset.almostAlignedFactorTextX = String(Math.random() * 2 - 1);
      }
      element.setAttribute("data-almost-aligned", "");
    }
  }

  document.querySelectorAll("[data-almost-aligned]").forEach((element) => {
    if (element.dataset.almostAlignedFactorX === undefined) {
      element.dataset.almostAlignedFactorX = String(Math.random() * 2 - 1);
      element.dataset.almostAlignedFactorY = String(Math.random() * 2 - 1);
      element.dataset.almostAlignedFactorAngle = String(Math.random() * 2 - 1);
    }
    if (element.dataset.almostAlignedFactorTextX === undefined && textTargets.has(element)) {
      element.dataset.almostAlignedFactorTextX = String(Math.random() * 2 - 1);
    }
    element.style.setProperty("--almost-aligned-x", `${Number(element.dataset.almostAlignedFactorX) * maxPixels}px`);
    element.style.setProperty("--almost-aligned-y", `${Number(element.dataset.almostAlignedFactorY) * maxPixels}px`);
    element.style.setProperty("--almost-aligned-angle", `${Number(element.dataset.almostAlignedFactorAngle) * maxAngle}deg`);
    const textOffset = shiftText && element.dataset.almostAlignedFactorTextX !== undefined
      ? Number(element.dataset.almostAlignedFactorTextX) * maxPixels * 0.75
      : 0;
    element.style.setProperty("--almost-aligned-text-x", `${textOffset}px`);
  });

  if (!alreadyEnabled && maxPixels > 0 && Math.random() < 0.01) {
    const cameo = document.createElement("div");
    cameo.id = cameoId;
    cameo.setAttribute("role", "status");
    cameo.setAttribute("aria-live", "polite");
    cameo.textContent = "AND HIS NAME IS JOHN CENA!\nYOU CAN'T SEE ME 👋";
    Object.assign(cameo.style, {
      position: "fixed",
      top: "16px",
      left: "50%",
      zIndex: "2147483647",
      maxWidth: "calc(100vw - 32px)",
      padding: "16px 22px",
      border: "3px solid #f7f1e6",
      borderRadius: "12px",
      background: "#e53b56",
      boxShadow: "0 8px 32px #0008",
      color: "white",
      fontFamily: "system-ui, sans-serif",
      fontSize: "clamp(18px, 5vw, 32px)",
      fontWeight: "900",
      lineHeight: "1.3",
      textAlign: "center",
      whiteSpace: "pre-line",
      pointerEvents: "none",
      transform: "translateX(-50%)",
      transition: "opacity .3s ease"
    });
    document.documentElement.append(cameo);
    setTimeout(() => {
      cameo.style.opacity = "0";
      setTimeout(() => cameo.remove(), 350);
    }, 3000);
  }

  return true;
}

function queueEffect(amount, shiftText) {
  pendingEffect = { amount, shiftText, revision: ++effectRevision };
  if (!syncingEffect) void flushEffectQueue();
}

async function flushEffectQueue() {
  syncingEffect = true;
  while (pendingEffect) {
    const request = pendingEffect;
    pendingEffect = null;
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: setAlmostAligned,
        args: [request.amount, request.shiftText]
      });
      if (request.revision !== effectRevision) continue;
      effectActive = Boolean(result?.result);
      updateButton();
      statusText.textContent = Number(request.amount) === 0
        ? "At 0 px, the page looks normal. Increase the slider to preview."
        : "Live preview on this tab.";
    } catch {
      if (request.revision !== effectRevision) continue;
      pageAvailable = false;
      effectActive = false;
      updateButton();
      statusText.textContent = "Could not update this page. Try refreshing it.";
    }
  }
  syncingEffect = false;
}

toggleButton.addEventListener("click", () => {
  if (tabId === undefined || !pageAvailable) return;
  effectActive = true;
  updateButton();
  statusText.textContent = "Applying effect…";
  queueEffect(Number(intensity.value), textDrift.checked);
});

intensity.addEventListener("input", () => {
  intensityValue.value = `${Number(intensity.value).toFixed(1)} px`;
  updateButton();
  if (!pageAvailable) return;
  if (!effectActive) {
    statusText.textContent = "Only affects the current tab.";
    return;
  }
  statusText.textContent = "Updating live preview…";
  queueEffect(Number(intensity.value), textDrift.checked);
});

textDrift.addEventListener("change", () => {
  localStorage.setItem("almost-aligned-text-drift", String(textDrift.checked));
  if (effectActive) {
    statusText.textContent = "Updating live preview…";
    queueEffect(Number(intensity.value), textDrift.checked);
  }
});

const savedIntensityText = localStorage.getItem("almost-aligned-intensity");
const savedIntensity = Number(savedIntensityText);
if (savedIntensityText !== null && Number.isFinite(savedIntensity) && savedIntensity >= 0 && savedIntensity <= 15) {
  intensity.value = String(savedIntensity);
}
textDrift.checked = localStorage.getItem("almost-aligned-text-drift") === "true";
intensityValue.value = `${Number(intensity.value).toFixed(1)} px`;
intensity.addEventListener("change", () => localStorage.setItem("almost-aligned-intensity", intensity.value));

configureMonetization();
readPageState().then(() => {
  if (pageAvailable) statusText.textContent = effectActive
    ? "Live preview on this tab."
    : "Only affects the current tab.";
});
