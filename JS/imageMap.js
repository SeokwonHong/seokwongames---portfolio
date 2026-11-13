
export function drawText(canvas, text, visibleLength = text.length) {
    
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = 'bold 180px "Arial", monospace';
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
    return sampleCanvasPoints(canvas, count, false);
}

export async function sampleImagePoints(
    source, imageUrl, count, { size = 0.78, offsetX = 0, offsetY=0 } = {}
) {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;

    const scale = Math.min(
        canvas.width / image.naturalWidth,
        canvas.height / image.naturalHeight
    ) * size;

    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;

    canvas.getContext("2d").drawImage(
        image,
        (canvas.width - width) / 2 + offsetX,
        (canvas.height - height) / 2+offsetY,
        width,
        height
    );

    return sampleCanvasPoints(canvas, count, true);
}

function sampleCanvasPoints(canvas, count, darkOnly) {
    const { width, height } = canvas;
    const { data } = canvas.getContext("2d").getImageData(0, 0, width, height);
    const points = [];

    for (let y = 0; y < height; y += 3) {
        for (let x = 0; x < width; x += 3) {
            const i = (y * width + x) * 4;
            const dark = data[i] + data[i + 1] + data[i + 2] < 384;

            if (data[i + 3] > 128 && (!darkOnly || dark)) {
                points.push([x, y]);
            }
        }
    }

    if (points.length === 0) return [];

    return Array.from({ length: count }, (_, i) =>
        points[Math.floor((i + 0.5) * points.length / count)]
    );
}


