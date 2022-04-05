
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 10000 );
const tileEditorCamera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );

const deg2rad = Math.PI/180;

let canvas = document.getElementById("mainCanvas");
const renderer = new THREE.WebGLRenderer( { 
    canvas: canvas 
});
renderer.setSize( canvas.parentElement.offsetHeight, canvas.parentElement.offsetHeight );

let tileEditorCanvas = document.getElementById("tileViewerCanvas");
const tileEditorRenderer = new THREE.WebGLRenderer( { 
    canvas: tileEditorCanvas 
});
tileEditorRenderer.setSize( 450, 450 );

window.addEventListener( 'resize', () => {
    renderer.setSize( canvas.parentElement.offsetHeight, canvas.parentElement.offsetHeight );
});

let enableStart = true;
let mouseDown = false;
keysDown = {
    'w': false,
    'a': false,
    's': false,
    'd': false,
    ' ': false,
    'Control': false
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

var cameraYaw = 0;
var cameraPitch = 0;
canvas.addEventListener('mousemove', (event) => {
    if(mouseDown)
    {
        const sensitivity = 0.005;
        cameraYaw +=   -(lastOffsetX - event.offsetX) * sensitivity;
        cameraPitch +=  (lastOffsetY - event.offsetY) * sensitivity;
        lastOffsetX = event.offsetX;
        lastOffsetY = event.offsetY;
        var cameraLookAtOffset = getVector3FromYawPitch(cameraYaw, cameraPitch)
        var tempVector = new THREE.Vector3(0, 0, 0, 'XYZ');
        tempVector.add(camera.position);
        tempVector.add(cameraLookAtOffset);
        camera.lookAt(tempVector);
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

setInterval(handleMovement, 0.05);
function handleMovement()
{
    const sensitivity = 5;

    var forward = getVector3FromYawPitch(cameraPitch, cameraYaw);
    var newForward = new THREE.Vector3( 
        forward.y,
        0,
        forward.z
    );
    newForward.normalize();
    var forwardAmount = (keysDown['w'] ? 1 : 0) + (keysDown['s'] ? -1 : 0);
    newForward.multiplyScalar(forwardAmount);

    var right = getVector3FromYawPitch(cameraPitch, cameraYaw + (90 * deg2rad));
    var newRight = new THREE.Vector3( 
        right.y,
        0,
        right.z
    );
    newRight.normalize();
    var rightAmount = (keysDown['d'] ? 1 : 0) + (keysDown['a'] ? -1 : 0);
    newRight.multiplyScalar(rightAmount);

    var up = new THREE.Vector3(0, 1, 0);
    var upAmount = (keysDown[' '] ? 1 : 0) + (keysDown['Control'] ? -1 : 0);
    up.multiplyScalar(upAmount); 

    var finalMoveOffset = new THREE.Vector3(0, 0, 0);
    finalMoveOffset.add(newForward);
    finalMoveOffset.add(newRight);
    finalMoveOffset.add(up);
    finalMoveOffset.normalize();
    finalMoveOffset.multiplyScalar(sensitivity);

    camera.position.add(finalMoveOffset);
}

let instances;
let placeCount = 0;
function convertXYZToKey(x, y, z)
{
    return "x"+x+"y"+y+"z"+z;
}

function convertKeyToXYZ(key)
{
    var xIndex = key.indexOf('x');
    var yIndex = key.indexOf('y');
    var zIndex = key.indexOf('z');

    return [
        Number(key.substring(xIndex + 1, yIndex)),
        Number(key.substring(yIndex + 1, zIndex)),
        Number(key.substring(zIndex + 1))
    ];
}

function generateCubeMeshOfColorAndSize(color, size)
{
    let geometry = new THREE.BoxGeometry(size, size, size);
    let material = new THREE.MeshBasicMaterial( {color: color} );
    let mesh = new THREE.Mesh( geometry, material );
    return mesh;
}

//Generates a list in the form
// [ [Mesh, Offset], [Mesh, Offset], . . . [Mesh, Offset] ]
//TODO: Position the connector meshes
function generateMeshesFromObject(tileObject)
{
    meshes = [];
    meshes.push([generateCubeMeshOfColorAndSize(tileObject["color"], 12), new THREE.Vector3(0, 0, 0)]);
    
    positions.forEach(position => {
        tileObject[position].forEach(connectorColor => {
            meshes.push( [generateCubeMeshOfColorAndSize(connectorColor, 2), positionOffsets[position].clone().multiplyScalar(7)] );
        });
    });

    return meshes;
}


/*
function addTileMeshArrayToScene(scene, tileMeshArray, x, y, z)
{
    var objects = [];
    tileMeshArray.forEach(pair => {
        mesh = pair[0];
        position = pair[1];

        var setPos = new THREE.Vector3(x, y, z);
        setPos.multiplyScalar(16);
        setPos.add(position);

        scene.add( mesh );
        mesh.position.x = setPos.x;
        mesh.position.y = setPos.y;
        mesh.position.z = setPos.z;
        objects.push(mesh)
    });
    var key = convertXYZToKey(x, y, z);
    objectMap[key] = objects;
    //console.log("Registering new tile to: " + key);
}
*/

var objectMap = {}; //An (int, int, int) -> cube dictionary. Each entry is a 
var indexMap = {};
var availableSpaces = [];
let dummy = new THREE.Object3D();
camera.position.z = 500;

//Basic skeleton function to keep things rendering
function animate() {
    requestAnimationFrame( animate );
    renderer.render( scene, camera );
    tileEditorRenderer.render( scene, tileEditorCamera );
}
animate


let applyButton = document.getElementById("applyButton");
let jsonText = document.getElementById("jsonText");
let resetButton = document.getElementById("resetButton");
let stepButton = document.getElementById("stepButton");
let startButton = document.getElementById("startButton");
let stopButton = document.getElementById("stopButton");
let delayInput = document.getElementById("delayInput");

const positions = ["x+", "x-", "y+", "y-", "z+", "z-"];
const positionOffsets = {
    "x+": new THREE.Vector3(1, 0, 0),
    "x-": new THREE.Vector3(-1, 0, 0),

    "y+": new THREE.Vector3(0, 1, 0),
    "y-": new THREE.Vector3(0, -1, 0),
    
    "z+": new THREE.Vector3(0, 0, 1),
    "z-": new THREE.Vector3(0, 0, -1),
}

function createNewTile()
{
    var object = {};
    object["name"] = "";
    positions.forEach( position => {
        object[position] = [];
    });
    return object;
}

// Yes it linear searches :(
function findIndex(array, value)
{
    for(var i = 0; i < array.length; i++)
    {
        if(array[i] == value)
        {
            return i;
        }
    }
    return -1;
}

//Returns a copy of an array without the element at the specified index
function removeIndex(array, index)
{
    newArr = [];
    for(var i = 0; i < array.length; i++)
    {
        if(i != index)
        {
            newArr.push(array[i]);
        }
    }
    return newArr;
}

//TODO: FIX THE CONSTANTS
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

    // Index of the position in the availableIndex array
    var availableIndex = findIndex(availableSpaces, placingTileKey);
    
    if(!objectMap[placingTileKey])
    { // There is no object currently in the position
        //console.log("Location is empty.");
        if(availableIndex != -1)
        { // The key is in the availableIndex array
            //console.log("Location is available.");
            temperatureSatisfied = false;
            if(!ignoreTemperature)
            { // If not ignoring temperature
                //Calculate temperature
                //console.log("Calculating temperature.");
                var temperature = 0;
                for(var i = 0; i < localPositions.length; i++)
                { // For each integer direction (up down left right forward backward)
                    // The direction of the neighbor, ie "x+"
                    var directionName = matchingDirection[i];
                    // The offset to get to the neighbor, ie [0, 0, 1]
                    var neighborOffset = localPositions[i];
                    var neighborPosition = [x + neighborOffset[0], y + neighborOffset[1], z + neighborOffset[2]];
                    var neighborKey = convertXYZToKey(neighborPosition[0], neighborPosition[1], neighborPosition[2]);
                    //console.log(`Checking direction ${directionName}.`);
                    if(objectMap[neighborKey])
                    {
                        // If the neighbor exists
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
                var colorMatchSatisfied = true;
                //Now check for color-matches on every side
                //console.log("Checking for color match");
                for(var i = 0; i < localPositions.length; i++)
                { // For each integer direction
                    // Get the offset to the neighbor
                    var neighborOffset = localPositions[i];
                    var neighborPosition = [x + neighborOffset[0], y + neighborOffset[1], z + neighborOffset[2]];
                    var neighborKey = convertXYZToKey(neighborPosition[0], neighborPosition[1], neighborPosition[2]);
                    // Tile index of the neighbor
                    var neighborTileIndex = indexMap[neighborKey];
                    // Name of the direction from placing to neighbor, ie x+
                    var placingTileDirection = matchingDirection[i];
                    //console.log(`Checking direction ${placingTileDirection}.`);
                    if(neighborTileIndex != null)
                    { // If there is actually a tile at this position
                        //console.log("Tile exists");
                        // Name of the direction from neighbor to placing, ie x-
                        var neighborTileDirection = antiMatchingDirection[i];

                        var placingConnectionColors = tiles[tileIndex][placingTileDirection];
                        let placingConnectionCounts = {};
                        var neighborTile = tiles[neighborTileIndex];
                        var neighborConnectionColors = tiles[neighborTileIndex][neighborTileDirection];
                        let neighborConnectionCounts = {};

                        totalColors = [];
                        placingConnectionColors.forEach(color => {
                            totalColors.push(color);
                            if(placingConnectionCounts[color] == null)
                            {
                                placingConnectionCounts[color] = 1;
                            }
                            else
                            {
                                placingConnectionCounts[color]++;
                            }
                        });
                        neighborConnectionColors.forEach(color => {
                            totalColors.push(color);
                            if(neighborConnectionCounts[color] == null)
                            {
                                neighborConnectionCounts[color] = 1;
                            }
                            else
                            {
                                neighborConnectionCounts[color]++;
                            }
                        });
                        totalColors.forEach(color => {
                            let placingColorExists = placingConnectionCounts[color] != null;
                            let neighborColorExist = neighborConnectionCounts[color] != null;
                            if(placingColorExists && neighborColorExist)
                            {
                                if(placingConnectionCounts[color] != neighborConnectionCounts[color])
                                {
                                    colorMatchSatisfied = false;
                                }
                            }
                            else
                            {
                                colorMatchSatisfied = false;
                            }
                        });
                    }
                }

                if(colorMatchSatisfied)
                {
                    //console.log("Passed color satisfaction.");
                    // Spawn the scene object, this function also adds the object to objectMap.
                    
                    //Replacing this function
                    //addTileMeshArrayToScene(scene, generateMeshesFromObject(tiles[tileIndex]), x, y, z);
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
                        //Object map must be dealt with
                    }
                    instance.nextIndex++;
                    objectMap[placingTileKey] = true;
                    
                    // Add the index we used into the index map.
                    indexMap[placingTileKey] = tileIndex;
                    // Remove the current tile from available spaces, if it was in there.
                    availableSpaces = removeIndex(availableSpaces, availableIndex);
                    // For each neighboring position, add it to available spaces
                    //     only if it isn't already available, and there isn't a tile there.
                    localPositions.forEach(neighborOffset => {
                        var neighborPos = [x + neighborOffset[0], y + neighborOffset[1], z + neighborOffset[2]];
                        var neighborKey = convertXYZToKey(neighborPos[0], neighborPos[1], neighborPos[2]);
                        if(findIndex(availableSpaces, neighborKey) == -1)
                        {
                            availableSpaces.push(neighborKey);
                        }
                    });
                    return true;
                }
            }
        }
    }
    return false;
}

var tiles = [];
applyButton.addEventListener("click", event => {
    tiles = [];
    var json = JSON.parse(jsonText.value);
    
    var jsonTileArray = json["tiles"];
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
    for(let i = 0; i < tiles.length; i++)
    {
        let tileInstance = {};
        instances[i] = tileInstance;
        let tile = tiles[i];
        
        tileInstance.nextIndex = 0;
        tileInstance.instances = [];
        tileInstance.offsets = [];
        const instanceCount = 2000;
        let mainMaterial = new THREE.MeshBasicMaterial( {color: tile.color} );
        let mainGeometry  = new THREE.BoxGeometry(12, 12, 12);
        let mainPosition = new THREE.Vector3(0, 0, 0);
        
        let mainInstanceMesh = new THREE.InstancedMesh(mainGeometry, mainMaterial, instanceCount);
        scene.add(mainInstanceMesh);
        tileInstance.instances.push(mainInstanceMesh);
        tileInstance.offsets.push(mainPosition);
        
        
        for(let j = 0; j < matchingDirection.length; j++)
        {
            direction = matchingDirection[j];
            let directionColors = tile[direction];
            for(let k = 0; k < directionColors.length; k++)
            {
                let subCubeGeometry = new THREE.BoxGeometry(2, 2, 2);
                let color = directionColors[k];
                let material = new THREE.MeshBasicMaterial( {color: color} );
                let offset = positionOffsets[direction].clone();
                offset.multiplyScalar(7);
                let mesh = new THREE.InstancedMesh(subCubeGeometry, material, instanceCount);
                tileInstance.instances.push(mesh);
                tileInstance.offsets.push(offset);
                scene.add(mesh);
            }
        }
    }
    //console.log(instances);
});

resetButton.addEventListener("click", event => {
    Object.entries(objectMap).forEach( entry => {
        var key = entry[0];
        var value = entry[1];
        value.forEach(object => {
            scene.remove(object);
        })
    });
    objectMap = {};
    indexMap = {};
    availableSpaces = [ convertXYZToKey(0, 0, 0) ];
    spawnTile(0, 0, 0, 0, true);
    enableStart = true;
    placeCount = 1;
    applyDisabledButtons();
    //addTileMeshArrayToScene(scene, generateMeshesFromObject(tiles[0]), 0, 0, 0);
});

//Returns a random value between [a,b] both inclusive
function randInt(a, b)
{
    return Math.floor((Math.random() * (b + 1)) + a);
}

function step()
{
    let attemptCount = 0;
    do {
        attemptCount++;
        var availableSpaceIndex = randInt(0, availableSpaces.length - 1);
        var tileIndex = randInt(0, tiles.length - 1);
        position = convertKeyToXYZ(availableSpaces[availableSpaceIndex]);
        //console.log("Spawning");
    } while( !spawnTile(tileIndex, position[0], position[1], position[2], false) );
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