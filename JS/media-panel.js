document.querySelectorAll("[data-media-panel]").forEach(async panel => {
  const viewer = panel.querySelector("[data-media-viewer]");
  const grid = panel.querySelector(".media-grid");

  try {
    const folder = new URL(panel.dataset.mediaFolder, document.baseURI);
    const response = await fetch(new URL("gallery.json", folder));

    if (!response.ok) {
      throw new Error(`Media list could not load: ${response.status}`);
    }

    const items = await response.json();

    if (!items.length) {
      panel.closest(".project-section").hidden = true;
      return;
    }

    function createMedia(item, thumbnail = false) {
      const isVideo = item.type === "video";
      const element = document.createElement(isVideo ? "video" : "img");

      element.src = new URL(item.src, folder).href;

      if (isVideo) {
        element.controls = !thumbnail;
        element.muted = thumbnail;
        element.playsInline = true;
        element.preload = "metadata";

        if (thumbnail) {
          element.src += "#t=0.1";
        } else {
          element.setAttribute("aria-label", item.title);
        }
      } else {
        element.alt = thumbnail ? "" : item.title;
        element.loading = thumbnail ? "lazy" : "eager";
      }

      if (thumbnail) {
        element.setAttribute("aria-hidden", "true");
        element.tabIndex = -1;
      }

      return element;
    }

    const buttons = [];

    function select(item, button) {
      if (button.getAttribute("aria-pressed") === "true") return;

      viewer.querySelector("video")?.pause();
      viewer.replaceChildren(createMedia(item));

      buttons.forEach(other => {
        other.setAttribute("aria-pressed", String(other === button));
      });
    }

    grid.replaceChildren();

    items.forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "media-card";
      button.setAttribute("aria-label", item.title);
      button.setAttribute("aria-pressed", "false");

      const frame = document.createElement("span");
      frame.className = "media-card-frame";
      frame.append(createMedia(item, true));

      button.append(frame);
      button.addEventListener("click", () => select(item, button));

      buttons.push(button);
      grid.append(button);
    });

    select(items[0], buttons[0]);
  } catch (error) {
    console.error(error);
    viewer.textContent = "Media could not be loaded.";
    viewer.style.color = "#fff";
  }
});