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
            NG: "NIGERIA",
            MX: "MEXICO",};

       const countryNames = new Intl.DisplayNames(["en"], {
    type: "region",
    fallback: "none",
        });

        let country = null;
        if (/^[A-Z]{2}$/.test(code ?? "") && code !== "XX") {
            const name = countryNames.of(code);
            const label = name && name.length <= 7
            ? name.toUpperCase()
            : code;
            country = displayCodes[code] ?? label;
}
      
        return Response.json({ country }, {
            headers: { "Cache-Control": "no-store" },
        });
    },
};