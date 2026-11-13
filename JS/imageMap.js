export function drawText(canvas, text, visibleLength = text.length) {
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "bold 180px Arial";
    context.fillStyle = "black";
    context.textAlign = "left";
    context.textBaseline = "middle";

    const lines = text.split("\n");
    const visibleLines = text.slice(0, visibleLength).split("\n");
    const lineHeight = 100;
    const firstY = (canvas.height - (lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, index) => {
        const x = (canvas.width - context.measureText(line).width) / 2;
        context.fillText(visibleLines[index] ?? "", x, firstY + index * lineHeight);
    });
}
export function sampleTextPoints(canvas, text, count) {
    drawText(canvas, text);

    const { width, height } = canvas;
    const { data } = canvas.getContext("2d").getImageData(0, 0, width, height);
    const points = [];

    for (let y = 0; y < height; y += 3) {
        for (let x = 0; x < width; x += 3) {
            if (data[(y * width + x) * 4 + 3] > 128) {
                points.push([x, y]);
            }
        }
    }

    if (points.length === 0) return [];

    return Array.from({ length: count }, (_, i) =>
        points[Math.floor((i + 0.5) * points.length / count)]
    );
}