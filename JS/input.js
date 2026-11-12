export function createInput(canvas) {
    const input = { mouseX: 0, mouseY: 0, isInsideCanvas: false };

    canvas.addEventListener("pointermove", (event) => {
        const rect = canvas.getBoundingClientRect();
        input.mouseX = 2 * (event.clientX - rect.left) / rect.width - 1;
        input.mouseY = 1 - 2 * (event.clientY - rect.top) / rect.height;
        input.isInsideCanvas = true;
    });

    canvas.addEventListener("pointerleave", () => {
        input.isInsideCanvas = false;
    });

    return input;
}