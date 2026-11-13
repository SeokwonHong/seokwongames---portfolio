export default {
    fetch(request) {
        if (new URL(request.url).pathname !== "/api/country") {
            return new Response("Not found", { status: 404 });
        }

        const code = request.cf?.country;
       

        const displayCodes = { 
            GB: "UK",
            AE: "UAE",
            KR: "KOREA",
            JP: "JAPAN",
            CN: "CHINA",
            IN: "INDIA",
            BR: "BRAZIL",
            RU: "RUSSIA",
            PK: "PAKISTAN",
            NG: "NIGERIA",
            MX: "MEXICO",};

        const country = /^[A-Z]{2}$/.test(code ?? "") && code !== "XX"
            ? (displayCodes[code] ?? code)
            : null;
      
        return Response.json({ country }, {
            headers: { "Cache-Control": "no-store" },
        });
    },
};