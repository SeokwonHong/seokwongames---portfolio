export function drawText(canvas, text, visibleLength = text.length) {
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "bold 180px Arial";
    context.fillStyle = "black";
    context.textAlign = "left";
    
    context.textBaseline = "middle";

    const lines = text.split("\n");
    const lineHeight = 100;
    const firstY = (canvas.height - (lines.length - 1) * lineHeight) / 2;

    const visibleLines = text.slice(0, visibleLength).split("\n");

lines.forEach((line, index) => {
    const x = (canvas.width - context.measureText(line).width) / 2;
    const y = firstY + index * lineHeight;
    context.fillText(visibleLines[index] ?? "", x, y);
});
}