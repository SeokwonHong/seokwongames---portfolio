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
    //can be 2d but finna make webgpu
    const context = canvas.getContext("webgpu");

    if(!context){
        throw new Error("Could not create WebGPU context");
    }

    //pixel format and or rgb preference
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

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

    const particleCount = 100000;
    const floatsPerParticle = 4;

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

    device.queue.writeBuffer(
        particleBuffer,
        0,
        particleData
    );
    ///
    
    



    function render(){
    const commandEncoder = device.createCommandEncoder();

    const textureView = context
        .getCurrentTexture()
        .createView();
    const renderPass = commandEncoder.beginRenderPass({
        colorAttachments:[
            {
                view: textureView,
                clearValue:{
                    r:0,
                    g:0,
                    b:0,
                    a:1,
                },
                loadOp: "clear",
                storeOp: "store",
            },
        ],
    });


    renderPass.end();
    device.queue.submit([
        commandEncoder.finish(),
    ]);
}

requestAnimationFrame(update);
}


main().catch((error)=>
{
    console.error(error);
});


////////////