
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, 1, 0.1, 10000 );

const deg2rad = Math.PI/180;

const canvasContainer = document.getElementById("mainCanvasHolder");
const canvas = document.getElementById("mainCanvas");
const renderer = new THREE.WebGLRenderer( { 
    canvas: canvas,
    antialias: true
});


function resizeCanvas()
{
    let width  = canvas.clientWidth;
    let height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height)
    {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
}

window.addEventListener( 'resize', resizeCanvas);
resizeCanvas();


let enableStart = true;
let mouseDown = false;
keysDown = {
    'w'         : false,
    'a'         : false,
    's'         : false,
    'd'         : false,
    ' '         : false,
    'Shift'     : false,
    'ArrowUp'   : false,
    'ArrowLeft' : false,
    'ArrowDown' : false,
    'ArrowRight': false,
};
lastOffsetX = 0;
lastOffsetY = 0;
canvas.addEventListener('mousedown', (event) => {
    mouseDown = true;
    lastOffsetX = event.offsetX;
    lastOffsetY = event.offsetY;
});

function getVector3FromYawPitch(yaw, pitch)
{
    return new THREE.Vector3( 
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
    );
}

camera.position.z = 500;
let cameraYaw = 0;
let cameraPitch = 0;
const cameraMouseSensitivity = 0.020;
const cameraKeyboardSensitivity = 0.005;
const movementSensitivity = 5;
function updateCamera()
{
    let cameraLookAtOffset = getVector3FromYawPitch(cameraYaw, cameraPitch)
    let tempVector = new THREE.Vector3(0, 0, 0, 'XYZ');
    tempVector.add(camera.position);
    tempVector.add(cameraLookAtOffset);
    camera.lookAt(tempVector);
}

canvas.addEventListener('mousemove', (event) => {
    if(mouseDown)
    {
        cameraYaw   += -(lastOffsetX - event.offsetX) * cameraMouseSensitivity;
        cameraPitch +=  (lastOffsetY - event.offsetY) * cameraMouseSensitivity;
        lastOffsetX = event.offsetX;
        lastOffsetY = event.offsetY;
        updateCamera();
    }
});

canvas.addEventListener('mouseup', (event) => {
    mouseDown = false;
    lastOffsetX = event.offsetX;
    lastOffsetY = event.offsetY;
});
canvas.addEventListener('keydown', (event) => {
    if(!event.repeat)
    {
        keysDown[event.key] = true;
    }
});
canvas.addEventListener('keyup', (event) => {
    keysDown[event.key] = false;
});

//z+ is back
//z- is forward
//x+ is right
//x- is left
//y+ is up
//y- is down

scene.add(new THREE.AmbientLight(0x808080));
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.75)
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);
let lightingDummy = new THREE.Object3D();
lightingDummy.position.set(-1, -1, -1);
scene.add(lightingDummy);
directionalLight.target = lightingDummy;


setInterval(handleMovement, 0.05);
function handleMovement()
{

    let forward = getVector3FromYawPitch(cameraPitch, cameraYaw);
    let newForward = new THREE.Vector3( 
        forward.y,
        0,
        forward.z
    );
    newForward.normalize();
    let forwardAmount = (keysDown['w'] ? 1 : 0) + (keysDown['s'] ? -1 : 0);
    newForward.multiplyScalar(forwardAmount);

    let right = getVector3FromYawPitch(cameraPitch, cameraYaw + (90 * deg2rad));
    let newRight = new THREE.Vector3( 
        right.y,
        0,
        right.z
    );
    newRight.normalize();
    let rightAmount = (keysDown['d'] ? 1 : 0) + (keysDown['a'] ? -1 : 0);
    newRight.multiplyScalar(rightAmount);

    let up = new THREE.Vector3(0, 1, 0);
    let upAmount = (keysDown[' '] ? 1 : 0) + (keysDown['Shift'] ? -1 : 0);
    up.multiplyScalar(upAmount); 

    let finalMoveOffset = new THREE.Vector3(0, 0, 0);
    finalMoveOffset.add(newForward);
    finalMoveOffset.add(newRight);
    finalMoveOffset.add(up);
    finalMoveOffset.normalize();
    finalMoveOffset.multiplyScalar(movementSensitivity);

    camera.position.add(finalMoveOffset);

    cameraYaw   += ( (keysDown['ArrowLeft'] ? -1 : 0) + (keysDown['ArrowRight'] ? 1 : 0) ) * cameraMouseSensitivity;
    cameraPitch += -( (keysDown['ArrowUp'] ? -1 : 0) + (keysDown['ArrowDown'] ? 1 : 0)) * cameraMouseSensitivity;
    updateCamera();
}

let instances;
let materialsToDispose = [];
let geometriesToDispose = [];
let placeCount = 0;
let tiles = [];
const instanceCount = 15000;

//A map of "xxyyzz" keys mapping placed tiles to their index.
let indexMap = {};

// Used to intelligently guess the next available space
// A list of sets, corresponding to where the tile at index I might be allowed to go.
let availableSpaces = [];

// Used to position things and then grab the translation matrix for instance meshes.
let dummy = new THREE.Object3D();

let applyButton = document.getElementById("applyButton");
let jsonText = document.getElementById("jsonText");
let resetButton = document.getElementById("resetButton");
let stepButton = document.getElementById("stepButton");
let startButton = document.getElementById("startButton");
let stopButton = document.getElementById("stopButton");
let delayInput = document.getElementById("delayInput");
let disableTable = [];

const positions = ["x+", "x-", "y+", "y-", "z+", "z-"];
const positionOffsets = {
    "x+": new THREE.Vector3(1, 0, 0),
    "x-": new THREE.Vector3(-1, 0, 0),

    "y+": new THREE.Vector3(0, 1, 0),
    "y-": new THREE.Vector3(0, -1, 0),
    
    "z+": new THREE.Vector3(0, 0, 1),
    "z-": new THREE.Vector3(0, 0, -1),
}

const matchingDirection = [
    "z+",
    "z-",
    "y+",
    "y-",
    "x+",
    "x-"
]
const antiMatchingDirection = [
    "z-",
    "z+",
    "y-",
    "y+",
    "x-",
    "x+"
];
const localPositions = [
    [0,0,1],
    [0,0,-1],
    [0,1,0],
    [0,-1,0],
    [1,0,0],
    [-1,0,0]
];

function convertXYZToKey(x, y, z)
{
    return "x"+x+"y"+y+"z"+z;
}

function convertKeyToXYZ(key)
{
    let xIndex = key.indexOf('x');
    let yIndex = key.indexOf('y');
    let zIndex = key.indexOf('z');

    return [
        Number(key.substring(xIndex + 1, yIndex)),
        Number(key.substring(yIndex + 1, zIndex)),
        Number(key.substring(zIndex + 1))
    ];
}

//Basic skeleton function to keep things rendering
function animate() {
    requestAnimationFrame( animate );
    renderer.render( scene, camera );
}
animate();

function createNewTile()
{
    let object = {};
    object["name"] = "";
    positions.forEach( position => {
        object[position] = [];
    });
    return object;
}

function doColorsMatch(colorList1, colorList2)
{
    if(colorList1.length == 0 || colorList2.length == 0)
    {
        return false;
    }

    let totalColors = new Set();
    let colorCounts1 = new Map();
    let colorCounts2 = new Map();
    [ 
        [colorList1, colorCounts1], 
        [colorList2, colorCounts2] 
    ].forEach(element => {
        let colorList = element[0];
        let colorCount = element[1];
        colorList.forEach(color => {
            totalColors.add(color);
            if(!colorCount.has(color))
            {
                colorCount.set(color, 1);
            }
            else
            {
                colorCount.set(color, colorCount.get(color) + 1);
            }
        });
    });
    let valid = true;
    totalColors.forEach(color => {
        //console.log(color);
        //If one is missing the color
        //console.log(`has colors: ${colorCounts1.has(color)} ${colorCounts2.has(color)}`);
        if(!(colorCounts1.has(color) && colorCounts2.has(color)))
        {
            valid = false;
            return;
        }
        else
        {
            //If they both have the color, but the counts differ
            if(colorCounts1.get(color) != colorCounts2.get(color))
            {
                valid = false;
                return;
            }
        }
    });
    return valid;
}

function buildDisableTable()
{
    //console.log("Building disable table");
    disableTable = [];
    //For each tile
    for(let i = 0; i < tiles.length; i++)
    {
        disableTable.push({});
        let tile = tiles[i];
        for(let j = 0; j < matchingDirection.length; j++)
        {
            let direction = matchingDirection[j];
            disableTable[i][direction] = [];
            let antiDirection = antiMatchingDirection[j];
            let directionColor = tile[direction];
            for(let k = 0; k < tiles.length; k++)
            {
                subTile    = tiles[k];
                otherColor = subTile[antiDirection];
                disableTable[i][direction].push(!doColorsMatch(directionColor, otherColor));
            }
        }
    }
}

function spawnTile(tileIndex, x, y, z, ignoreTemperature)
{
    // Conditions for placing a tile:
    //     No tile is currently there
    //     It is adjact to another tile
    //     The temperature is >=2, overridden by ignoreTemperature
    //     The colors on all adjact tiles matches exactly
    //         If the new tile has colors, and the other is empty, that is invalid.
    //         empty-empty is a valid connection, however.

    // Key for the position we are placing at
    const placingTileKey = convertXYZToKey(x, y, z);
    //console.log(`Attempting to place ${tileIndex} at ${x} ${y} ${z}`);
    //console.log(`${placingTileKey}`);
    // Index of the position in the availableIndex array
    let tileAvailable = availableSpaces[tileIndex].has(placingTileKey);
    
    //console.log(`indexMap[placingTileKey] = ${indexMap[placingTileKey]}`);
    if(indexMap[placingTileKey] == null)
    { // There is no object currently in the position
        //console.log("Location is empty.");
        if(tileAvailable)
        { // The key is in the availableIndex array
            //console.log("Location is available.");
            temperatureSatisfied = false;
            if(!ignoreTemperature)
            { // If not ignoring temperature
                //Calculate temperature
                //console.log("Calculating temperature.");
                let temperature = 0;
                for(let i = 0; i < localPositions.length; i++)
                { // For each integer direction (up down left right forward backward)
                    // The direction of the neighbor, ie "x+"
                    let directionName = matchingDirection[i];
                    // The offset to get to the neighbor, ie [0, 0, 1]
                    let neighborOffset = localPositions[i];
                    let neighborPosition = [x + neighborOffset[0], y + neighborOffset[1], z + neighborOffset[2]];
                    let neighborKey = convertXYZToKey(neighborPosition[0], neighborPosition[1], neighborPosition[2]);
                    //console.log(`Checking direction ${directionName}.`);
                    if(indexMap[neighborKey] != null)
                    { // The neighbor exists
                        //console.log("Neighbor exists.");
                        // Since any connection currently existing must be valid
                        // We can add the number of connection sites this cell has in the direction of the neighbor
                        let connectionCount = tiles[tileIndex][directionName].length;
                        temperature += connectionCount;
                        //console.log(`Adding ${connectionCount}. New temperature = ${temperature}`);
                    }
                }
                //console.log("Final temperature: " + temperature);
                if(temperature >= 2)
                {
                    //console.log("Temperature satisfied.");
                    temperatureSatisfied = true;
                }
                else
                {
                    //console.log("Temperature not satisfied.");
                }
            }
            else
            {
                //console.log("Ignoring Temperature");
                temperatureSatisfied = true;
            }

            if(temperatureSatisfied)
            { // Temperature is satisfied
                let colorMatchSatisfied = true;
                //Now check for color-matches on every side
                //console.log("Checking for color match");
                for(let i = 0; i < localPositions.length; i++)
                { // For each integer direction
                    // Get the offset to the neighbor
                    let neighborOffset = localPositions[i];
                    let neighborPosition = [x + neighborOffset[0], y + neighborOffset[1], z + neighborOffset[2]];
                    let neighborKey = convertXYZToKey(neighborPosition[0], neighborPosition[1], neighborPosition[2]);
                    // Tile index of the neighbor
                    let neighborTileIndex = indexMap[neighborKey];
                    // Name of the direction from placing to neighbor, ie x+
                    let placingTileDirection = matchingDirection[i];
                    //console.log(`Checking direction ${placingTileDirection}.`);
                    if(neighborTileIndex != null)
                    { // If there is actually a tile at this position
                        //console.log("Tile exists");
                        // Name of the direction from neighbor to placing, ie x-
                        let neighborTileDirection = antiMatchingDirection[i];

                        let placingConnectionColors = tiles[tileIndex][placingTileDirection];
                        let neighborConnectionColors = tiles[neighborTileIndex][neighborTileDirection];
                        
                        if(!doColorsMatch(placingConnectionColors, neighborConnectionColors))
                        {
                            colorMatchSatisfied = false;
                        }
                    }
                }

                if(colorMatchSatisfied)
                {
                    //Add an instance of the tile into the scene
                    let instance = instances[tileIndex];
                    for(let i = 0; i < instance.instances.length; i++)
                    {
                        //For each subcube within this tile
                        let offset = instance.offsets[i]; 
                        dummy.position.set((x*16) + offset.x, 
                                           (y*16) + offset.y,
                                           (z*16) + offset.z + 10);
                        dummy.updateMatrix();
                        let instanceMesh = instance.instances[i]; 
                        instanceMesh.setMatrixAt( instance.nextIndex, dummy.matrix );
                        instanceMesh.instanceMatrix.needsUpdate = true;
                        //console.log(dummy.position);
                    }
                    instance.nextIndex++;
                    
                    // Add the index we used into the index map.
                    //console.log("Adding to indexMap");
                    indexMap[placingTileKey] = tileIndex;
                    // Remove the current tile from available spaces, if it was in there.
                    //console.log("Removing placingTileKey from all availableSpaces")
                    availableSpaces.forEach(tileSpecificAvailabilitySet => {
                        tileSpecificAvailabilitySet.delete(placingTileKey);
                    })
                    // For each neighboring position, add it to available spaces
                    //     only if it isn't already available, and there isn't a tile there.
                    localPositions.forEach(neighborOffset => {
                        let neighborPos = [x + neighborOffset[0], y + neighborOffset[1], z + neighborOffset[2]];
                        let neighborKey = convertXYZToKey(neighborPos[0], neighborPos[1], neighborPos[2]);
                        availableSpaces.forEach(tileSpecificAvailabilitySet => {
                            if((!tileSpecificAvailabilitySet.has(neighborKey)) && (indexMap[neighborKey] == null))
                            {
                                tileSpecificAvailabilitySet.add(neighborKey);
                            }
                        })
                    });

                    for(let i = 0; i < matchingDirection.length; i++)
                    {
                        let outgoingDirection = matchingDirection[i];
                        let neighborPos = localPositions[i];
                        let neighborKey = convertXYZToKey(x + neighborPos[0], y + neighborPos[1], z + neighborPos[2]);

                        //True = disable
                        for(let j = 0; j < tiles.length; j++)
                        {
                            if(disableTable[tileIndex][outgoingDirection][j])
                            {
                                availableSpaces[j].delete(neighborKey);
                            }
                        }
                    }

                    return true;
                }
            }
        }
    }
    return false;
}

applyButton.addEventListener("click", event => {
    eraseInstances();
    if(materialsToDispose)
    {
        materialsToDispose.forEach(material => {
            material.dispose();
        });
    }
    if(geometriesToDispose)
    {
        geometriesToDispose.forEach(geometry => {
            geometry.dispose();
        });
    }
    materialsToDispose = [];
    geometriesToDispose = [];

    tiles = [];
    let json = JSON.parse(jsonText.value);
    
    let jsonTileArray = json["tiles"];
    jsonTileArray.forEach(jsonTileObject => {
        newTile = createNewTile();
        newTile["color"] = Number(jsonTileObject["color"]);
        positions.forEach( position => {
            jsonTileObject[position].forEach( colorString => {
                newTile[position].push(Number(colorString));
            });
            //newTile[position] = Number(jsonTileObject[position]);
        });
        tiles.push(newTile);
    });

    instances = []
    availableSpaces = [];
    for(let i = 0; i < tiles.length; i++)
    {
        availableSpaces.push(new Set());
        //Create the object which we will add to the instances array
        let tileInstance = {};
        instances[i] = tileInstance;
        let tile = tiles[i];
        
        tileInstance.nextIndex = 0;
        tileInstance.instances = [];
        tileInstance.offsets = [];
        
        let mainMaterial = new THREE.MeshPhongMaterial( {color: tile.color  } );
        mainMaterial.flatShading = true;
        let mainGeometry  = new THREE.BoxGeometry(12, 12, 12);
        let mainOffset = new THREE.Vector3(0, 0, 0);
        let mainInstanceMesh = new THREE.InstancedMesh(mainGeometry, mainMaterial, instanceCount);

        materialsToDispose.push(mainMaterial);
        geometriesToDispose.push(mainGeometry);

        scene.add(mainInstanceMesh);
        tileInstance.instances.push(mainInstanceMesh);
        tileInstance.offsets.push(mainOffset);
        
        for(let j = 0; j < matchingDirection.length; j++)
        { //For each direction
            direction = matchingDirection[j];
            //Get the colors of the connectors in that direction
            let directionColors = tile[direction];
            for(let k = 0; k < directionColors.length; k++)
            { //For each of those colors, make an instance mesh with offset
                let color = directionColors[k];
                let material = new THREE.MeshPhongMaterial( {color: color} );
                let geometry = new THREE.BoxGeometry(2, 2, 2);
                let offset = positionOffsets[direction].clone();
                offset.multiplyScalar(7);
                let mesh = new THREE.InstancedMesh(geometry, material, instanceCount);
                
                materialsToDispose.push(material);
                geometriesToDispose.push(geometry);
                
                scene.add(mesh);
                tileInstance.instances.push(mesh);
                tileInstance.offsets.push(offset);
            }
        }
    }
    buildDisableTable();
    reset();
    //console.log(instances);
});

function eraseInstances()
{
    if(instances)
    {
        dummy.position.set(-5000000, -5000000, -5000000);
        dummy.updateMatrix();
        instances.forEach(instanceStructure => {
            instanceStructure.instances.forEach(instance => {
                for(let i = 0; i < instanceCount; i++)
                {
                    instance.setMatrixAt(i, dummy.matrix);
                }
                instance.instanceMatrix.needsUpdate = true;
            });
        });
    }
}

function reset()
{
    eraseInstances();

    indexMap = {};
    let originKey = convertXYZToKey(0, 0, 0)
    //availableSpaces = [ originKey ];   
    availableSpaces.forEach(availableSet => {
        availableSet.add(originKey);
    });
    
    spawnTile(0, 0, 0, 0, true);
    
    enableStart = true;
    placeCount = 1;
    applyDisabledButtons();
}

resetButton.addEventListener("click", event => {
    reset();
});

//Returns a random value between [a,b] both inclusive
function randInt(a, b)
{
    return Math.floor((Math.random() * (b + 1)) + a);
}

function step()
{
    let attemptCount = 0;
    let tileIndex;
    let availableSpaceIndex;
    let position;
    let exit = false;
    do {
        attemptCount++;
        
        //tileIndex = randInt(0, tiles.length - 1);
        let sum = 0;
        for(let i = 0; i < tiles.length; i++)
        {
            //console.log(availableSpaces[i].size);
            sum += availableSpaces[i].size;
        }
        //console.log(`Sum ${sum}`);
        let tileIndex = 0;
        let randomNumber = randInt(0, sum-1);
        //console.log(`Searching for ${randomNumber}`);
        sum -= availableSpaces[0].size
        while(sum > randomNumber)
        {
            tileIndex++;
            //console.log(tileIndex);
            sum -= availableSpaces[tileIndex].size;
        }


        //console.log(availableSpaces[tileIndex].size);
        if(availableSpaces[tileIndex].size == 0)
        {
            continue;
        }

        availableSpaceIndex = randInt(0, availableSpaces[tileIndex].size - 1);
        //console.log(availableSpaceIndex);
        //console.log(availableSpaces[tileIndex].size);
        position = convertKeyToXYZ(Array.from(availableSpaces[tileIndex])[availableSpaceIndex]);
        //console.log(position);
        //console.log("Spawning");
        exit = spawnTile(tileIndex, position[0], position[1], position[2], false);
    } while( !exit );
    placeCount++;
    //console.log(`Tried ${attemptCount} times before spawning (${placeCount} tiles now).`);
    //console.log(attemptCount);
}

stepButton.addEventListener("click", step);
let stepTimer;
function applyDisabledButtons()
{
    startButton.disabled = !enableStart;
    stopButton.disabled = enableStart;
    if(stopButton.disabled)
    {
        stopStepTimer();
    }
}

startButton.addEventListener("click", event => {
    if(enableStart)
    {
        let value = parseFloat(delayInput.value);
        if(value)
        {
            stepTimer = setInterval(step, value);
            enableStart = false;
            applyDisabledButtons();
        }
    }
});

function stopStepTimer()
{
    clearInterval(stepTimer);
}

stopButton.addEventListener("click", event => {
    enableStart = true;
    applyDisabledButtons();
});