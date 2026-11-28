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

    if (items.some(item =>
      !item.thumbAvif || !item.thumbWebp || !item.preview
    )) {
      throw new Error("Run the media generator to create previews.");
    }

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
    let nearbyImages = [];

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
      if (thumbnail) {
        const picture = document.createElement("picture");
        const source = document.createElement("source");
        const image = document.createElement("img");

        picture.setAttribute("aria-hidden", "true");
        picture.append(source, image);

        source.type = "image/avif";
        source.srcset = new URL(item.thumbAvif, folder).href;

        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        image.src = new URL(item.thumbWebp, folder).href;

        return picture;
      }

      const isVideo = item.type === "video";
      const element = document.createElement(isVideo ? "video" : "img");

      if (isVideo) {
        element.controls = true;
        element.playsInline = true;
        element.preload = "none";
        element.poster = new URL(item.preview, folder).href;
        element.setAttribute("aria-label", item.title);
        element.src = new URL(item.src, folder).href;
      } else {
        element.alt = item.title;
        element.decoding = "async";
        element.fetchPriority = "high";
        element.src = new URL(item.preview, folder).href;
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

      // Prepare adjacent images/posters, never video files.
      nearbyImages = [-1, 1].map(offset => {
        const next = (selectedIndex + offset + items.length) % items.length;
        const image = new Image();

        image.fetchPriority = "low";
        image.src = new URL(items[next].preview, folder).href;

        return image;
      });
    }

    dialog.querySelector("[data-previous]").addEventListener("click", () => {
      show(selectedIndex - 1);
    });

    dialog.querySelector("[data-next]").addEventListener("click", () => {
      show(selectedIndex + 1);
    });

    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener("close", () => {
      clearViewer();
      nearbyImages = [];
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