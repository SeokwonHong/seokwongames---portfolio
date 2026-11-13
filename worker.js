
function getDistanceKm(cf) {
    const { latitude, longitude } = cf ?? {};
    if (latitude == null || longitude == null || latitude === "" || longitude === "") {
        return null;
    }

    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
        Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        return null;
    }

    const radians = Math.PI / 180;
    const londonLat = 51.5074;
    const londonLon = -0.1278;
    const a = Math.sin((lat - londonLat) * radians / 2) ** 2
        + Math.cos(londonLat * radians) * Math.cos(lat * radians)
        * Math.sin((lon - londonLon) * radians / 2) ** 2;

    const km = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
    return Math.round(km / 100) * 100;
}

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
      
        const distanceKm = country ? getDistanceKm(request.cf) : null;
return Response.json({ country, distanceKm }, {
            headers: { "Cache-Control": "no-store" },
        });
    },
};

