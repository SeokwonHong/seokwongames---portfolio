import {createInput} from "./input.js";
import {loadImageMap} from "./imageMap.js";


async function main()
{
    const input = createInput();

    //find.gameobject.go name 
    const canvas = document.querySelector("#gpuCanvas");

    if(!canvas){
        throw new Error("Canvas not found");
    }

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

    function resizeCanvas() {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth / 2));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight / 2));
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

        render();

        requestAnimationFrame(update);
    }
    
    //particles making initilization

    const particleCount = 3000;
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
                topology: "point-list",
            },
        });



        const particleBindGroup = device.createBindGroup({
        layout: particleRendererPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: particleBuffer } },
        ],
    });

    function render() {
        const encoder = device.createCommandEncoder();
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
        renderPass.draw(particleCount);
        renderPass.end();
        device.queue.submit([encoder.finish()]);
    }

    requestAnimationFrame(update);
}


main().catch((error)=>
{
    console.error(error);
});


////////////