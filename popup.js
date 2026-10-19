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
  toggleButton.disabled = !pageAvailable;
  toggleButton.textContent = applied ? "Put it back" : "Make it a little off";
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
  const wasEnabled = Boolean(document.getElementById(styleId));
  document.querySelectorAll("[data-almost-aligned]").forEach((element) => {
    element.removeAttribute("data-almost-aligned");
    element.style.removeProperty("--almost-aligned-x");
    element.style.removeProperty("--almost-aligned-y");
    element.style.removeProperty("--almost-aligned-angle");
  });
  document.getElementById(styleId)?.remove();
  document.getElementById(cameoId)?.remove();

  if (!enabled) return false;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `[data-almost-aligned] {
    translate: var(--almost-aligned-x) var(--almost-aligned-y) !important;
    rotate: var(--almost-aligned-angle) !important;
  }`;
  document.documentElement.append(style);

  const maxPixels = Math.max(1, Math.min(5, Number(amount) || 2));
  const maxAngle = Math.min(0.4, maxPixels * 0.08);
  const targets = document.querySelectorAll("h1,h2,h3,p,li,a,button,input,img,blockquote,td,th");
  for (const element of targets) {
    if (Math.random() < 0.58) continue;
    const bounds = element.getBoundingClientRect();
    if (bounds.width < 8 || bounds.height < 8) continue;

    const offset = () => `${((Math.random() * 2 - 1) * maxPixels).toFixed(1)}px`;
    const angle = `${((Math.random() * 2 - 1) * maxAngle).toFixed(2)}deg`;
    element.style.setProperty("--almost-aligned-x", offset());
    element.style.setProperty("--almost-aligned-y", offset());
    element.style.setProperty("--almost-aligned-angle", angle);
    element.setAttribute("data-almost-aligned", "");
  }

  if (!wasEnabled && Math.random() < 0.01) {
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

intensity.addEventListener("input", () => {
  intensityValue.value = `${intensity.value} px`;
});

intensity.addEventListener("change", async () => {
  if (tabId === undefined || !applied) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: setAlmostAligned,
      args: [true, Number(intensity.value)]
    });
  } catch {
    statusText.textContent = "Could not update this page. Try refreshing it.";
  }
});

const savedIntensity = Number(localStorage.getItem("almost-aligned-intensity"));
if (savedIntensity >= 1 && savedIntensity <= 5) intensity.value = String(savedIntensity);
intensityValue.value = `${intensity.value} px`;
intensity.addEventListener("change", () => localStorage.setItem("almost-aligned-intensity", intensity.value));

configureMonetization();
readPageState().then(() => {
  if (pageAvailable && !applied) statusText.textContent = "Only affects the current tab.";
});
