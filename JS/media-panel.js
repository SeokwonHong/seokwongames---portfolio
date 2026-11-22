document.querySelectorAll("[data-media-panel]").forEach(panel => {
  const viewer = panel.querySelector("[data-media-viewer]");
  const cards = panel.querySelectorAll(".media-card");

  cards.forEach(card => {
    card.addEventListener("click", () => {
      if (card.getAttribute("aria-pressed") === "true") return;

      // Stop the previous video before changing media.
      viewer.querySelector("video")?.pause();

      const isVideo = card.dataset.type === "video";
      const media = document.createElement(isVideo ? "video" : "img");

      media.src = card.dataset.src;

      if (isVideo) {
        media.controls = true;
        media.playsInline = true;
        media.preload = "metadata";
        media.setAttribute("aria-label", card.dataset.title);
      } else {
        media.alt = card.dataset.title;
      }

      viewer.replaceChildren(media);

      cards.forEach(button => {
        button.setAttribute(
          "aria-pressed",
          String(button === card)
        );
      });
    });
  });
});