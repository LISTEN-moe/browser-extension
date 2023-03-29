/* global browser */

browser.storage.local.get(
  {
    enableAutoplay: false,
    enableNotifications: true,
  },
  (items) => {
    document.getElementById("enableAutoplay").checked = items.enableAutoplay;
    document.getElementById("enableNotifications").checked =
      items.enableNotifications;
  }
);

document.querySelectorAll('input[type="checkbox"]').forEach((element) => {
  element.addEventListener("change", function () {
    browser.storage.local.set({ [this.id]: this.checked });
  });
});
