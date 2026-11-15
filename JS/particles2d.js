export function createCanvas2DRenderer(canvas, input, particles, targets, diameter,mouseRadiusPx) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create Canvas 2D context");

    return function render(deltaTime) {
        const { width, height } = canvas;
        const aspect = width / height;
        const radius = diameter / 2;
        const edgeX = Math.max(0, 1 - diameter / width);
        const edgeY = Math.max(0, 1 - diameter / height);
        const textDamping = Math.exp(-13 * deltaTime);
        const freeDamping = Math.exp(-3 * deltaTime);
        const mouseRadius = (2 * mouseRadiusPx) / height;

        context.clearRect(0, 0, width, height);
        context.fillStyle = "black";
        context.beginPath();

        for (let i = 0; i < particles.length; i += 4) {
            let x = particles[i];
            let y = particles[i + 1];
            let vx = particles[i + 2];
            let vy = particles[i + 3];

            if (input.isInsideCanvas) {
                const dx = x - input.mouseX;
                const dy = y - input.mouseY;
                const distance = Math.hypot(dx * aspect, dy);

                if (distance > 0.0001 && distance < mouseRadius) {
                    const push =  50.5 * (1 - distance / mouseRadius) * deltaTime / distance;
                    vx += dx * push;
                    vy += dy * push;
                }
            }

            const active = targets[i + 2] > 0.5;
            if (active) {
                vx += (targets[i] - x) * 55 * deltaTime;
                vy += (targets[i + 1] - y) * 55 * deltaTime;
            }

            const damping = active ? textDamping : freeDamping;
            vx *= damping;
            vy *= damping;
            x = Math.max(-edgeX, Math.min(edgeX, x + vx * deltaTime));
            y = Math.max(-edgeY, Math.min(edgeY, y + vy * deltaTime));

            particles[i] = x;
            particles[i + 1] = y;
            particles[i + 2] = vx;
            particles[i + 3] = vy;

            const px = (x + 1) * width / 2;
            const py = (1 - y) * height / 2;
            context.moveTo(px + radius, py);
            context.arc(px, py, radius, 0, 2 * Math.PI);
        }

        context.fill();
    };
}