export default {
    fetch(request) {
        if (new URL(request.url).pathname !== "/api/country") {
            return new Response("Not found", { status: 404 });
        }

        const code = request.cf?.country;
        const country = /^[A-Z]{2}$/.test(code ?? "") && code !== "XX"
            ? (code === "GB" ? "UK" : code)
            : null;

        return Response.json({ country }, {
            headers: { "Cache-Control": "no-store" },
        });
    },
};