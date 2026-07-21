import {createInput} from "./input.js";
import {loadImageMap} from "./imageMap.js";


async function main()
{
    const input = createInput();

    console.log("Input loaded:" , input);

    let previousTime = null;

    function update(currentTime){
        if(previousTime===null){
            previousTime=currentTime;
        }

        let deltaTime = (currentTime - previousTime)/1000;
        previousTime=currentTime;

        //prevent huge jumps
        deltaTime = Math.min(deltaTime, 0.033);

        console.log("Delta time:", deltaTime);


        requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

main().catch((error)=>
{
    console.error(error);
})