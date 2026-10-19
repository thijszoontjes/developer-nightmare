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
  toggleButton.textContent = effectActive ? "Reset" : "Apply";
  toggleButton.classList.toggle("is-active", effectActive);
  toggleButton.setAttribute("aria-pressed", String(effectActive));
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

function setAlmostAligned(enabled, amount, shiftText) {
  const styleId = "__almost_aligned_style__";
  const cameoId = "__almost_aligned_cameo__";
  const alreadyEnabled = Boolean(document.getElementById(styleId));
  if (!enabled) {
    document.querySelectorAll("[data-almost-aligned]").forEach((element) => {
      element.removeAttribute("data-almost-aligned");
      element.style.removeProperty("--almost-aligned-x");
      element.style.removeProperty("--almost-aligned-y");
      element.style.removeProperty("--almost-aligned-angle");
      element.style.removeProperty("--almost-aligned-text-x");
      delete element.dataset.almostAlignedFactorX;
      delete element.dataset.almostAlignedFactorY;
      delete element.dataset.almostAlignedFactorAngle;
      delete element.dataset.almostAlignedFactorTextX;
    });
    document.getElementById(styleId)?.remove();
    document.getElementById(cameoId)?.remove();
    return false;
  }

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

function queueEffect(enabled, amount, shiftText) {
  pendingEffect = { enabled, amount, shiftText, revision: ++effectRevision };
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
        args: [request.enabled, request.amount, request.shiftText]
      });
      if (request.revision !== effectRevision) continue;
      effectActive = Boolean(result?.result);
      updateButton();
      statusText.textContent = effectActive
        ? Number(request.amount) === 0
          ? "At 0 px, the page looks normal. Increase the slider to preview."
          : "Live preview on this tab."
        : "Page restored.";
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
  effectActive = !effectActive;
  updateButton();
  statusText.textContent = effectActive ? "Applying effect…" : "Restoring page…";
  queueEffect(effectActive, Number(intensity.value), textDrift.checked);
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
  queueEffect(true, Number(intensity.value), textDrift.checked);
});

textDrift.addEventListener("change", () => {
  localStorage.setItem("almost-aligned-text-drift", String(textDrift.checked));
  if (effectActive) {
    statusText.textContent = "Updating live preview…";
    queueEffect(true, Number(intensity.value), textDrift.checked);
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
  if (pageAvailable && !effectActive) statusText.textContent = "Only affects the current tab.";
});
