import { SUPPORT_URL, SPONSOR } from "./config.js";

const toggleButton = document.querySelector("#toggle");
const statusText = document.querySelector("#status");
const intensity = document.querySelector("#intensity");
const intensityValue = document.querySelector("#intensity-value");
const supportLink = document.querySelector("#support-link");
const sponsorCard = document.querySelector("#sponsor-card");
let tabId;
let applied = false;
let pageAvailable = false;

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
  toggleButton.disabled = !pageAvailable || (!applied && intensityIsZero);
  toggleButton.textContent = applied
    ? "Put it back"
    : intensityIsZero ? "Choose an intensity above 0" : "Make it a little off";
  toggleButton.classList.toggle("is-active", applied);
  toggleButton.setAttribute("aria-pressed", String(applied));
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
    applied = Boolean(result?.result);
    pageAvailable = true;
  } catch {
    applied = false;
    pageAvailable = false;
    statusText.textContent = "Chrome does not allow extensions on this page.";
  }
  updateButton();
}

function setAlmostAligned(enabled, amount) {
  const styleId = "__almost_aligned_style__";
  const cameoId = "__almost_aligned_cameo__";
  const alreadyEnabled = Boolean(document.getElementById(styleId));
  if (!enabled) {
    document.querySelectorAll("[data-almost-aligned]").forEach((element) => {
      element.removeAttribute("data-almost-aligned");
      element.style.removeProperty("--almost-aligned-x");
      element.style.removeProperty("--almost-aligned-y");
      element.style.removeProperty("--almost-aligned-angle");
      delete element.dataset.almostAlignedFactorX;
      delete element.dataset.almostAlignedFactorY;
      delete element.dataset.almostAlignedFactorAngle;
    });
    document.getElementById(styleId)?.remove();
    document.getElementById(cameoId)?.remove();
    return false;
  }

  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `[data-almost-aligned] {
    translate: var(--almost-aligned-x) var(--almost-aligned-y) !important;
    rotate: var(--almost-aligned-angle) !important;
  }`;
    document.documentElement.append(style);
  }

  const requestedPixels = Number(amount);
  const maxPixels = Number.isFinite(requestedPixels)
    ? Math.max(0, Math.min(5, requestedPixels))
    : 2;
  const maxAngle = Math.min(0.15, maxPixels * 0.03);
  const targets = document.querySelectorAll("h1,h2,h3,p,li,a,button,input,img,blockquote,td,th");

  if (!alreadyEnabled) {
    for (const element of targets) {
      if (Math.random() < 0.58) continue;
      const bounds = element.getBoundingClientRect();
      if (bounds.width < 8 || bounds.height < 8) continue;
      element.dataset.almostAlignedFactorX = String(Math.random() * 2 - 1);
      element.dataset.almostAlignedFactorY = String(Math.random() * 2 - 1);
      element.dataset.almostAlignedFactorAngle = String(Math.random() * 2 - 1);
      element.setAttribute("data-almost-aligned", "");
    }
  }

  document.querySelectorAll("[data-almost-aligned]").forEach((element) => {
    if (element.dataset.almostAlignedFactorX === undefined) {
      element.dataset.almostAlignedFactorX = String(Math.random() * 2 - 1);
      element.dataset.almostAlignedFactorY = String(Math.random() * 2 - 1);
      element.dataset.almostAlignedFactorAngle = String(Math.random() * 2 - 1);
    }
    element.style.setProperty("--almost-aligned-x", `${Number(element.dataset.almostAlignedFactorX) * maxPixels}px`);
    element.style.setProperty("--almost-aligned-y", `${Number(element.dataset.almostAlignedFactorY) * maxPixels}px`);
    element.style.setProperty("--almost-aligned-angle", `${Number(element.dataset.almostAlignedFactorAngle) * maxAngle}deg`);
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

toggleButton.addEventListener("click", async () => {
  if (tabId === undefined || !pageAvailable) return;
  toggleButton.disabled = true;
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: setAlmostAligned,
      args: [!applied, Number(intensity.value)]
    });
    applied = Boolean(result?.result);
    statusText.textContent = applied
      ? "Effect active on this tab. Refresh to reset it."
      : "Page restored.";
  } catch {
    pageAvailable = false;
    statusText.textContent = "Could not change this page. Try refreshing it.";
  }
  updateButton();
});

intensity.addEventListener("input", async () => {
  intensityValue.value = `${Number(intensity.value).toFixed(1)} px`;
  updateButton();
  if (!pageAvailable) return;
  if (!applied) {
    statusText.textContent = "Only affects the current tab.";
    return;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: setAlmostAligned,
      args: [true, Number(intensity.value)]
    });
    statusText.textContent = Number(intensity.value) === 0
      ? "At 0 px, the page looks normal. Increase the slider to preview."
      : "Live preview on this tab.";
  } catch {
    pageAvailable = false;
    statusText.textContent = "Could not update this page. Try refreshing it.";
    updateButton();
  }
});

const savedIntensityText = localStorage.getItem("almost-aligned-intensity");
const savedIntensity = Number(savedIntensityText);
if (savedIntensityText !== null && Number.isFinite(savedIntensity) && savedIntensity >= 0 && savedIntensity <= 5) {
  intensity.value = String(savedIntensity);
}
intensityValue.value = `${Number(intensity.value).toFixed(1)} px`;
intensity.addEventListener("change", () => localStorage.setItem("almost-aligned-intensity", intensity.value));

configureMonetization();
readPageState().then(() => {
  if (pageAvailable && !applied) statusText.textContent = "Only affects the current tab.";
});
