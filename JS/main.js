import {createInput} from "./input.js";
import { createCanvas2DRenderer } from "./particles2d.js";
import { drawText, sampleTextPoints, sampleImagePoints } from "./imageMap.js";

async function main()
{


    //find.gameobject.go name 
    const canvas = document.querySelector("#gpuCanvas");

    if(!canvas){
        throw new Error("Canvas not found");
    }

        const input = createInput(canvas);
    let device;
    let gpuContext;

    try {
        const adapter = await navigator.gpu?.requestAdapter();
        if (adapter) {
            device = await adapter.requestDevice();
            gpuContext = canvas.getContext("webgpu");
        }
    } catch (error) {
        console.warn("WebGPU startup failed", error);
    }

    const defaultCount = gpuContext ? 3500 : 2400;
    const count = Number(canvas.dataset.particleCount);
    const size = Number(canvas.dataset.particleSize);

    const particleCount = Number.isSafeInteger(count) && count > 0 ? count : defaultCount;
    const particleDiameter = Number.isFinite(size) && size > 0 ? size : 10;
    const mouseRadiusPx = 180;

    const canvasFormat = gpuContext ? navigator.gpu.getPreferredCanvasFormat() : null;
    const particleSizeBuffer = gpuContext ? device.createBuffer({
        size: 8,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }) : null;

    function resizeCanvas() {
        const width = Math.max(1, canvas.clientWidth);
        const height = Math.max(1, canvas.clientHeight);
        canvas.width = width;
        canvas.height = height;

        if (particleSizeBuffer) {
            device.queue.writeBuffer(particleSizeBuffer, 0, new Float32Array([
                particleDiameter / width,
                particleDiameter / height,
            ]));
        }
    }
    const swimmingPage = document.body.hasAttribute("data-swimming-page");
    const savedParticleCount = 3500;
    const firstChunkPoses = 6;

    async function readSwimmingChunk(part, poseCount) {
        const url = new URL(`../images/swimming/swimming-${part}.bin`, import.meta.url);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${part} download failed (${response.status})`);

        const bytes = await response.arrayBuffer();
        if (bytes.byteLength !== poseCount * savedParticleCount * 4) {
            throw new Error(`Unexpected size for swimming-${part}.bin`);
        }

        return new DataView(bytes);
    }

    let swimmingStart = swimmingPage
        ? readSwimmingChunk("start", firstChunkPoses).catch(error => {
            console.error(error);
            return null;
        })
        : undefined;
    let swimmingRest;

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    gpuContext?.configure({ device, format: canvasFormat, alphaMode: "premultiplied" });

    // deltatime calculation// there's no such time.deltatime.
    let previousTime = null;

    function update(currentTime) {
        if (previousTime === null) {
            previousTime = currentTime;
        }

        let deltaTime = (currentTime - previousTime) / 1000;
        previousTime = currentTime;

        deltaTime = Math.min(deltaTime, 0.033);

        renderer.render(deltaTime);

        requestAnimationFrame(update);
    }
    
    //particles making initilization


    const floatsPerParticle = 4; //two for position(x,y) and two for vector(x,y)

    //set the initial size for array
    const particleData = new Float32Array(particleCount*floatsPerParticle);

    //unlike C# there's no object(class) as array concept.
    for(let i=0; i<particleCount; i++){

        const index = i*floatsPerParticle; //multipy 4 because we need to put 4 values per particles

        //for random positon
        particleData[index] = Math.random() * 2 - 1; //random generate between -1 - 1
        particleData[index+1] = Math.random() * 2 - 1;

        //for velocity
        particleData[index + 2] =0;
        particleData[index + 3]=0;
    }


    const targetData = new Float32Array(particleCount * 4);
 const renderer = gpuContext
     ? await createWebGPURenderer()
     : { render: createCanvas2DRenderer(canvas, input, particleData, targetData, particleDiameter, mouseRadiusPx) };

 async function createWebGPURenderer() {

    const particleBuffer = device.createBuffer({
        size: particleData.byteLength,

        usage:
        GPUBufferUsage.STORAGE | //shaders can read and write this
        GPUBufferUsage.COPY_DST, //recieve copy data from cpu to gpu
    });


    //send data of particleData to particleBuffer.
    device.queue.writeBuffer(
        particleBuffer,
        0, //start from the beginning
        particleData
    );

    //shader load

    //shaderResponse is like employee I tell him what to do in here
    const shaderResponse=
        await fetch("/GPU_Shaders/particleRenderer.wgsl");

    if(!shaderResponse.ok){
        throw new Error(
            'Failed to load particleRenderer.wgsl: ${shaderResponse.status}'
        );
    }
    // get the literal codes texts from particleRenderer and send the text to WebGPU, he will understand it.
    const shaderCode = 
        await shaderResponse.text();

        //this the visual side GPU module I paste the text from particleRenderer into.
    const particleShader = 
        device.createShaderModule({
            label: "Particle renderer shader",
            code: shaderCode,
        });
    
    // this enable me to order what to do in particleRenderer by ordering thorugh the text.
    const particleRendererPipeline=
        device.createRenderPipeline({
            label: "Particle render pipeline",

            layout: "auto",

            vertex: {
                module: particleShader,
                entryPoint: "vertexMain",
            },

            fragment: {
                module: particleShader,
                entryPoint: "fragmentMain",

                targets:[
                    {
                        format: canvasFormat,
                    },
                ],
            },

            primitive:{
                topology: "triangle-strip",
            },
        });



        const particleBindGroup = device.createBindGroup({
        layout: particleRendererPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: particleBuffer } },
    { binding: 1, resource: { buffer: particleSizeBuffer } },
        ],
    });

    const response = await fetch("/GPU_Shaders/particleCompute.wgsl");
if (!response.ok) {
    throw new Error(`Compute shader failed to load: ${response.status}`);
}

const computePipeline = device.createComputePipeline({
    layout: "auto",
    compute: {
        module: device.createShaderModule({ code: await response.text() }),
        entryPoint: "updateParticles",
    },
});

const frameBuffer = device.createBuffer({
    size: 24,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});


const targetBuffer = device.createBuffer({
    size: targetData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

const computeBindGroup = device.createBindGroup({
    layout: computePipeline.getBindGroupLayout(0),
    entries: [
        { binding: 0, resource: { buffer: particleBuffer } },
        { binding: 1, resource: { buffer: frameBuffer } },
        { binding: 2, resource: { buffer: particleSizeBuffer } },
        { binding: 3, resource: { buffer: targetBuffer } },
    ],
});

    function render(deltaTime) {
    device.queue.writeBuffer(frameBuffer, 0, new Float32Array([
    input.mouseX,
    input.mouseY,
    deltaTime,
    canvas.width / canvas.height,
    input.isInsideCanvas ? (2 * mouseRadiusPx) / canvas.height : 0,
]));

    const encoder = device.createCommandEncoder();
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(particleCount / 64));
    computePass.end();

    // Your existing render pass starts here.




        const renderPass = encoder.beginRenderPass({
            colorAttachments: [{
                view: gpuContext.getCurrentTexture().createView(),
                clearValue: { r: 1, g: 1, b: 1, a: 1 },
                loadOp: "clear",
                storeOp: "store",
            }],
        });

        renderPass.setPipeline(particleRendererPipeline);
        renderPass.setBindGroup(0, particleBindGroup);
        renderPass.draw(4, particleCount);
        renderPass.end();
        device.queue.submit([encoder.finish()]);
    }
     return {
         render,
         uploadTargets() {
             device.queue.writeBuffer(targetBuffer, 0, targetData);
         },
     };
 }
const textCanvas = document.querySelector("#textPreview");
const textContext = textCanvas.getContext("2d");

const portraitPointsReady = sampleImagePoints(
    textCanvas,
    new URL("../images/TwoColourMe.png", import.meta.url),
    particleCount
).catch((error) => {
    console.warn("Could not load the particle portrait", error);
    return [];
});
let fingerPoints = [];

sampleImagePoints(
    textCanvas,
    new URL("../images/Pointingfinger.png", import.meta.url),
    Math.round(particleCount * 0.3),
    { size: 0.3, offsetX: -50, offsetY: -330 }
).then((samples) => {
    fingerPoints = samples.map(([x, y]) => [x, y, true]);
}).catch((error) => {
    console.warn("Could not load the pointing finger", error);
});

 let visitorCountry = null;
 let visitorDistanceKm = null;

fetch("/api/country")
    .then((response) => response.ok ? response.json() : null)
    .then((data) => {
        visitorCountry = data?.country ?? null;
        visitorDistanceKm = Number.isFinite(data?.distanceKm) ? data.distanceKm : null;
    })
    .catch(() => {});

    
const phrases = [
    { text: "Hello!", hold: 2000 },
    { text: "I'm Seokwon", hold: 2600 },
    { portrait: true, hold: 3600 },
    { text: "I make COOL stuff", hold: 3000 },
    { text: "Check this out!", finger: true, hold: 2500 },
    { swimming: true },

    //{ text: "btw...", hold: 2200 },
   // { countryGreeting: true, hold: 2800 },
    //{ distanceGreeting: true, hold: 2700 },
  //  { text: "Glad you're here :)", hold: 2700 },
  //  { text: "", hold: 2700 },
    

];

let phraseIndex = 0;
let phrase = "";
let points = [];
let visibleLength = 0;
let showingPortrait = false;


function uploadTargets() {
    const { width, height } = textCanvas;
    let data = null;

    if (!showingPortrait && !canvas.hasAttribute("data-particle-clock")) {
        drawText(textCanvas, phrase, visibleLength);
        data = textContext.getImageData(0, 0, width, height).data;
    }

    const scale = Math.min(1, canvas.width / width, canvas.height / height);
    const alignLeft = canvas.dataset.particleAlign === "left";
const leftmostX = alignLeft
    ? points.reduce((left, [x]) => Math.min(left, x), width)
    : 0;

    points.forEach(([x, y, isFinger], i) => {
    const offset = i * 4;
    const lift = showingPortrait || isFinger ? 20 : 0;

    targetData[offset] = alignLeft
    ? ((2 * (x - leftmostX) + 1) * scale + particleDiameter) / canvas.width - 1
    : (2 * x + 1 - width) * scale / canvas.width;
    targetData[offset + 1] = ((height - 2 * y - 1) * scale + lift) / canvas.height;
    targetData[offset + 2] =
        isFinger || data === null || data[(y * width + x) * 4 + 3] > 128 ? 1 : 0;

});

    renderer.uploadTargets?.();
}
const swimmingFrameCount = 431; // First 2 seconds. Set this to your total PNG count for the full clip.
let swimmingFramesReady;

const swimmingOffsets = [];
const matchRadius = 18;

for (let dy = -matchRadius; dy <= matchRadius; dy += 3) {
    for (let dx = -matchRadius; dx <= matchRadius; dx += 3) {
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared > 0 && distanceSquared <= matchRadius * matchRadius) {
            swimmingOffsets.push({ dx, dy, distanceSquared });
        }
    }
}
swimmingOffsets.sort((a, b) => a.distanceSquared - b.distanceSquared);

function matchSwimmingTargets(previous, current) {
    if (previous.length !== current.length) return current;

    const available = new Map();

    for (const point of current) {
        const [x, y] = point;
        const key = `${x},${y}`;
        if (!available.has(key)) available.set(key, []);
        available.get(key).push(point);
    }

    // Reserve exact matches before looking for nearby targets.
    const matched = previous.map(([x, y]) => available.get(`${x},${y}`)?.pop());
    const unmatched = [];

    for (let i = 0; i < previous.length; i++) {
        if (matched[i]) continue;

        const [x, y] = previous[i];
        for (const { dx, dy } of swimmingOffsets) {
            const point = available.get(`${x + dx},${y + dy}`)?.pop();
            if (point) {
                matched[i] = point;
                break;
            }
        }

        if (!matched[i]) unmatched.push(i);
    }

    const remaining = [...available.values()].flat();

for (const particle of unmatched) {
    const [x, y] = previous[particle];
    let bestIndex = 0;
    let bestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
        const [targetX, targetY] = remaining[i];
        const distance = (targetX - x) ** 2 + (targetY - y) ** 2;

        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
        }
    }

    matched[particle] = remaining[bestIndex];
    remaining[bestIndex] = remaining[remaining.length - 1];
    remaining.pop();
}

    return matched;
}

async function loadSwimmingFrames(count = particleCount){
    const frames = [];

    for (let i = 0; i < swimmingFrameCount; i += 5) {
        const name = `swimming${String(i).padStart(3, "0")}.png`;
        const url = new URL(`../images/swimming/${name}`, import.meta.url);
        const sampled = await sampleImagePoints(textCanvas, url, count, {
            size: 1,
        });
        const previous = frames[frames.length - 1];
        frames.push(previous ? matchSwimmingTargets(previous, sampled) : sampled);
            }

    return frames;
}
let swimmingExportReady;

window.exportSwimming = async function (part) {
    const count = 3500;
    const poses = await (swimmingExportReady ??= loadSwimmingFrames(count));

    if (poses.length !== 87 || poses.some(pose => pose.length !== count)) {
        throw new Error("Expected 87 swimming poses with 3500 points each");
    }

    const selected = part === "start" ? poses.slice(0, 6) : poses.slice(6);
    const bytes = new DataView(new ArrayBuffer(selected.length * count * 4));
    let offset = 0;

    for (const pose of selected) {
        for (const [x, y] of pose) {
            bytes.setUint16(offset, x, true);
            bytes.setUint16(offset + 2, y, true);
            offset += 4;
        }
    }

    const url = URL.createObjectURL(new Blob([bytes.buffer]));
    const link = document.createElement("a");
    link.href = url;
    link.download = `swimming-${part}.bin`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

async function playSwimming() {
    const start = await (swimmingStart ??= readSwimmingChunk("start", firstChunkPoses));
    if (!start) throw new Error("Could not load the first swimming poses");

    let rest = null;
    let restFailed = false;
    (swimmingRest ??= readSwimmingChunk("rest", 81)).then(
        chunk => { rest = chunk; },
        error => {
            console.error(error);
            swimmingRest = undefined;
            restFailed = true;
        }
    );

    let elapsed = 0;
    let previousTime;
    let lastPose = -1;
    showingPortrait = true;

    function nextFrame(now) {
        elapsed += now - (previousTime ?? now);
        previousTime = now;

        if (!rest && elapsed >= 1000) {
            elapsed = 1000;
            if (restFailed) {
                if (!swimmingPage) showNextPhrase();
                return;
            }
        }

        const duration = 431 / 30 * 1000;
        if (elapsed >= duration) {
            if (!swimmingPage) {
                showNextPhrase();
                return;
            }
            elapsed %= duration;
        }

        const pose = Math.min(Math.floor(elapsed * 6 / 1000), rest ? 86 : 5);
        if (pose !== lastPose) {
            lastPose = pose;
            const chunk = pose < firstChunkPoses ? start : rest;
            const localPose = pose < firstChunkPoses ? pose : pose - firstChunkPoses;

            points = Array.from({ length: particleCount }, (_, i) => {
                const id = Math.floor(i * savedParticleCount / particleCount);
                const offset = (localPose * savedParticleCount + id) * 4;
                return [
                    chunk.getUint16(offset, true),
                    chunk.getUint16(offset + 2, true),
                ];
            });
            targetData.fill(0);
            uploadTargets();
        }

        requestAnimationFrame(nextFrame);
    }

    requestAnimationFrame(nextFrame);
}
async function showNextPhrase() {

   


    const step = phrases[phraseIndex];
    phraseIndex = (phraseIndex + 1) % phrases.length;

    if (step.swimming) {
    try {
        await playSwimming();
    } catch (error) {
        swimmingStart = undefined;
        console.warn("Could not load the swimming frames", error);
        showNextPhrase();
    }
    return;
}

        if (step.portrait) {
        const imagePoints = await portraitPointsReady;

        if (imagePoints.length === 0) {
            setTimeout(showNextPhrase, 0);
            return;
        }

        showingPortrait = true;
        points = imagePoints;
        targetData.fill(0);
        uploadTargets();
        setTimeout(showNextPhrase, step.hold);
        return;
    }
    showingPortrait = false;


    if (step.countryGreeting) {
        if (!visitorCountry) return showNextPhrase();
        phrase = `You from ${visitorCountry}?`;
    } else if (step.distanceGreeting) {
        if (visitorDistanceKm === null) return showNextPhrase();

        phrase = visitorDistanceKm === 0
            ? "We’re under 50 km apart"
            : `We’re ${visitorDistanceKm.toLocaleString("en-GB")} km apart`;
    } else {
        phrase = step.text;
    }

    const hand = step.finger ? fingerPoints : [];
    const textPoints = sampleTextPoints(textCanvas, phrase, particleCount - hand.length);
    points = [...textPoints, ...hand];

    visibleLength = 0;
    targetData.fill(0);
    typeNextLetter(step.hold);
}
function typeNextLetter(hold) {
    visibleLength++;
    uploadTargets();

    if (visibleLength < phrase.length) {
        setTimeout(typeNextLetter, 50, hold);
    } else {
        setTimeout(showNextPhrase, hold);
    }
}


       window.addEventListener("resize", uploadTargets);


   if (canvas.hasAttribute("data-particle-clock")) {
    const font = textCanvas.dataset.particleFont;
    if (font) {
        await document.fonts.load(font, "0123456789:").catch(() => {});
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const clock = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    });

    function updateClock() {
    const now = Date.now();
    setTimeout(updateClock, 1000 - (now % 1000));

    const time = clock.format(now);
    phrase = visitorCountry ? `${visitorCountry}   ${time}` : time;
    visibleLength = phrase.length;
    const nextPoints = sampleTextPoints(textCanvas, phrase, particleCount);
    points = matchSwimmingTargets(points, nextPoints);
    targetData.fill(0);
    uploadTargets();
    canvas.setAttribute("aria-label", `Local time ${phrase}`);
}

updateClock();

    updateClock();
} else if (swimmingPage) {
    playSwimming().catch(console.error);
} else {
    showNextPhrase();
}
    requestAnimationFrame(update);
}

main().catch(console.error);

////////////