document.querySelectorAll("[data-media-panel]").forEach(async panel => {
  const grid = panel.querySelector(".media-grid");

  try {
    const folder = new URL(panel.dataset.mediaFolder, document.baseURI);
    const response = await fetch(new URL("gallery.json", folder));

    if (!response.ok) throw new Error("Media list could not load.");

    const items = await response.json();

    if (!items.length) {
      panel.closest(".project-section").hidden = true;
      return;
    }

    // Each panel gets its own overlay.
    const dialog = document.createElement("dialog");
    dialog.className = "media-lightbox";
    dialog.setAttribute("aria-label", "Media viewer");
    dialog.innerHTML = `
      <div class="lightbox-toolbar">
       <button type="button" data-previous aria-label="Previous media">
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15 6 L9 12 L15 18"/>
  </svg>
</button>

<button type="button" data-next aria-label="Next media">
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 6 L15 12 L9 18"/>
  </svg>
</button>
     
      </div>
      <div class="lightbox-viewer"></div>
    `;
    document.body.append(dialog);

    const viewer = dialog.querySelector(".lightbox-viewer");
    let selectedIndex = 0;
    let previousOverflow = "";

    function clearViewer() {
      const video = viewer.querySelector("video");

      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }

      viewer.replaceChildren();
    }

    function createMedia(item, thumbnail = false) {
      const isVideo = item.type === "video";
      const element = document.createElement(isVideo ? "video" : "img");

      if (isVideo) {
        element.controls = !thumbnail;
        element.muted = thumbnail;
        element.playsInline = true;
        element.preload = "metadata";
        element.setAttribute("aria-label", item.title);
      } else {
        element.alt = thumbnail ? "" : item.title;
        element.loading = thumbnail ? "lazy" : "eager";
        element.decoding = "async";
      }

      const source = new URL(item.src, folder);
      if (isVideo && thumbnail) source.hash = "t=0.1";
      element.src = source.href;

      if (thumbnail) {
        element.setAttribute("aria-hidden", "true");
        element.tabIndex = -1;
      }

      return element;
    }

    function show(index) {
      selectedIndex = (index + items.length) % items.length;

      clearViewer();
      viewer.append(createMedia(items[selectedIndex]));

      if (!dialog.open) {
        previousOverflow = document.documentElement.style.overflow;
        dialog.showModal();
        document.documentElement.style.overflow = "hidden";
      }
    }

    dialog.querySelector("[data-previous]").addEventListener("click", () => {
      show(selectedIndex - 1);
    });

    dialog.querySelector("[data-next]").addEventListener("click", () => {
      show(selectedIndex + 1);
    });

    dialog.addEventListener("click", event => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
    // Escape also closes a native dialog.
    dialog.addEventListener("close", () => {
      clearViewer();
      document.documentElement.style.overflow = previousOverflow;
    });

    grid.replaceChildren();

    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "media-card";
      button.setAttribute("aria-label", `Open ${item.title}`);
      button.setAttribute("aria-haspopup", "dialog");

      const frame = document.createElement("span");
      frame.className = "media-card-frame";
      frame.append(createMedia(item, true));

      button.append(frame);
      button.addEventListener("click", () => show(index));
      grid.append(button);
    });
  } catch (error) {
    console.error(error);
    grid.textContent = "Media could not be loaded.";
  }
});