let deferredInstallPrompt = null;
const installButtons = [document.getElementById("installApp"), document.getElementById("installAppLogin")].filter(Boolean);

function showInstallButtons(show) {
  installButtons.forEach((button) => { button.hidden = !show; });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallButtons(true);
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  showInstallButtons(false);
});

installButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    showInstallButtons(false);
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("MyPOS service worker registration failed:", error);
    });
  });
}
