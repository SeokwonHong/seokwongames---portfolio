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