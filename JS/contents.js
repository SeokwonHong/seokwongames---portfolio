const article = document.querySelector(".project-page");

if (article) {
  const headings = article.querySelectorAll("h2");

  if (headings.length) {
    const layout = document.createElement("div");
    layout.className = "article-layout";

    const contents = document.createElement("nav");
    contents.className = "article-contents";
    contents.setAttribute("aria-label", "Table of contents");

    headings.forEach((heading, index) => {
      // Give each heading a unique link target.
      if (!heading.id) {
        let id = `section-${index + 1}`;

        while (document.getElementById(id)) {
          id += "-";
        }

        heading.id = id;
      }

      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      contents.appendChild(link);
    });

    // Place the sidebar beside the existing article.
    article.before(layout);
    layout.append(contents, article);
  }
}