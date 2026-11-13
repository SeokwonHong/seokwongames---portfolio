import {createInput} from "./input.js";
import { drawText, sampleTextPoints, sampleImagePoints } from "./imageMap.js";

async function main()
{


    //find.gameobject.go name 
    const canvas = document.querySelector("#gpuCanvas");

    if(!canvas){
        throw new Error("Canvas not found");
    }
    const input = createInput(canvas);

    if(!navigator.gpu){
        throw new Error("WebGPU is not supported in this browser");
    }

    
    const adapter = await navigator.gpu.requestAdapter();

    if(!adapter){
        throw new Error("No suitable GPU adapter found");
    }




    //reference to the graphic card
    const device = await adapter.requestDevice();
    //can be 2d but finna make webgpu, more like software toolbox
    const context = canvas.getContext("webgpu");

    if(!context){
        throw new Error("Could not create WebGPU context");
    }

    //pixel format and or rgb preference
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

     const particleDiameter = 10;
const particleSizeBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

function resizeCanvas() {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);

    canvas.width = width;
    canvas.height = height;

    device.queue.writeBuffer(particleSizeBuffer, 0, new Float32Array([
        particleDiameter / width,
        particleDiameter / height,
    ]));
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

    context.configure({
        device: device,
        format: canvasFormat,
        alphaMode: "premultiplied",
    });


    

    console.log("Input loaded:" , input);
    console.log("webGPU device:", device);

    // deltatime calculation// there's no such time.deltatime.
    let previousTime = null;

    function update(currentTime) {
        if (previousTime === null) {
            previousTime = currentTime;
        }

        let deltaTime = (currentTime - previousTime) / 1000;
        previousTime = currentTime;

        deltaTime = Math.min(deltaTime, 0.033);

        render(deltaTime);

        requestAnimationFrame(update);
    }
    
    //particles making initilization

    const particleCount = 3500;
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
        await fetch("./GPU_Shaders/particleRenderer.wgsl");

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

    const response = await fetch("./GPU_Shaders/particleCompute.wgsl");
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
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const targetData = new Float32Array(particleCount * 4);
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
        input.isInsideCanvas ? input.mouseY : 2, // Put the mouse outside the canvas.
        deltaTime,
        canvas.width / canvas.height,
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
                view: context.getCurrentTexture().createView(),
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

const phrases = [
    { text: "Hello!", hold: 2500 },
    { text: "I'm Seokwon", hold: 3000 },
    { portrait: true, hold: 4000 },
    { text: "What's your name?", hold: 3500 },
];

let phraseIndex = 0;
let phrase = "";
let points = [];
let visibleLength = 0;
let showingPortrait = false;

function uploadTargets() {
    const { width, height } = textCanvas;
    let data = null;

    if (!showingPortrait) {
        drawText(textCanvas, phrase, visibleLength);
        data = textContext.getImageData(0, 0, width, height).data;
    }

    const scale = Math.min(1, canvas.width / width, canvas.height / height);

    points.forEach(([x, y], i) => {
        const offset = i * 4;
        targetData[offset] = (2 * x + 1 - width) * scale / canvas.width;
        targetData[offset + 1] =
    ((height - 2 * y - 1) * scale + (showingPortrait ? 20 : 0)) / canvas.height;
        targetData[offset + 2] =
            data === null || data[(y * width + x) * 4 + 3] > 128 ? 1 : 0;
    });

    device.queue.writeBuffer(targetBuffer, 0, targetData);
}

async function showNextPhrase() {
    const step = phrases[phraseIndex];
    phraseIndex = (phraseIndex + 1) % phrases.length;

    if (step.portrait) {
        const portraitPoints = await portraitPointsReady;

        if (portraitPoints.length === 0) {
            setTimeout(showNextPhrase, 0);
            return;
        }

        showingPortrait = true;
        points = portraitPoints;
        targetData.fill(0);
        uploadTargets();
        setTimeout(showNextPhrase, step.hold);
        return;
    }

    showingPortrait = false;
    phrase = step.text;
    points = sampleTextPoints(textCanvas, phrase, particleCount);
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
    showNextPhrase();
    requestAnimationFrame(update);
}

main().catch((error) => {
    console.error(error);
});


////////////