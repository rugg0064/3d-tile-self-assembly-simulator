
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
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

var mouseDown = false;
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
    const sensitivity = 0.5;

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
    var geometry = new THREE.BoxGeometry(size, size, size);
    var material = new THREE.MeshBasicMaterial( {color: color} );
    var mesh = new THREE.Mesh( geometry, material );
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
    console.log("Registering new tile to: " + key);
}

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true } );

const CUBE_COUNT = 50;

var objectMap = {}; //An (int, int, int) -> cube dictionary. Each entry is a 
var indexMap = {};
var availableSpaces = [];

/*
let cubes = [];
for(let i = 0; i < CUBE_COUNT; i++)
{
    var cube = new THREE.Mesh( geometry, material );
    cube.position.x = i;
    scene.add( cube );
    cubes.push(cube);
    objectMap[convertXYZToKey(i, 0, 0)] = [cube];
}
*/

camera.position.z = 20;

function animate() {
    requestAnimationFrame( animate );
    renderer.render( scene, camera );
    tileEditorRenderer.render( scene, tileEditorCamera );

}
animate();

/*
setInterval(function(){
    for(let i = 0; i < CUBE_COUNT; i++)
    {
        cubes[i].rotation.x += 0.005 * i;
        //cubes[i].rotation.y += 0.01;
    }
}, 5);
*/

let applyButton = document.getElementById("applyButton");
let jsonText = document.getElementById("jsonText");
let resetButton = document.getElementById("resetButton");
let stepButton = document.getElementById("stepButton");
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

function spawnTile(tileIndex, x, y, z, ignoreTemperature)
{
    var availableIndex = findIndex(availableSpaces, convertXYZToKey(x,y,z));
    if(!objectMap[convertXYZToKey(x,y,z)] && availableIndex != -1)
    {
        isValid = true;
        const localPositions = [
            [0,0,1],
            [0,0,-1],
            [0,1,0],
            [0,-1,0],
            [1,0,0],
            [-1,0,0]
        ];

        //If the local position is a vector for x+, returns "x-" to check for matching connectors
        const matchingDirection = [
            "z+",
            "z-",
            "y+",
            "y-",
            "x+",
            "x-"
        ]
        const antiLocalPositionDirection = [
            "z-",
            "z+",
            "y-",
            "y+",
            "x-",
            "x+"
        ];

        var temperature = 0;
        for(var i = 0; i < localPositions.length; i++)
        {
            var position = localPositions[i];
            var direction = matchingDirection[i];
            var newPos = [x + position[0], y + position[1], z + position[2]];
            var newPosName = convertXYZToKey(newPos[0], newPos[1], newPos[2]);
            if(objectMap[newPosName])
            { //if the tile exists
                //console.log("Found a tile at direction: " + direction);
                //console.log("This tile color at dir: ");
                //console.log(tiles[tileIndex][direction]);
                temperature += tiles[tileIndex][direction].length;
                //console.log("new temp: " + temperature);
            }
        }
        for(var i = 0; i < localPositions.length; i++)
        {
            var position = localPositions[i];
            var newPos = [x + position[0], y + position[1], z + position[2]];
            var newPosName = convertXYZToKey(newPos[0], newPos[1], newPos[2]);
            var tile = tiles[indexMap[newPosName]];
            if(tile)
            {
                console.log(tile);
                console.log("Tile exists at: " + matchingDirection[i]);
                var theOtherCellPosition = antiLocalPositionDirection[i];
                var theMainCellPosition = matchingDirection[i];
                console.log(theOtherCellPosition);
                var otherCellColor = tile[theOtherCellPosition];
                console.log(otherCellColor);
                if(otherCellColor)
                {
                    var thisCellColor = tiles[tileIndex][theMainCellPosition];
    
                    totalColors = [];
                    otherCellCounter = {};
                    thisCellCounter = {};
                    otherCellColor.forEach(color => {
                        totalColors.push(color);
                        if(!otherCellCounter[color])
                        {
                            otherCellColor[color] = 1;
                        }
                        else
                        {
                            otherCellColor[color]++;
                        }
                    });
    
                    thisCellColor.forEach(color => {
                        totalColors.push(color);
                        if(!thisCellColor[color])
                        {
                            thisCellColor[color] = 1;
                        }
                        else
                        {
                            thisCellColor[color]++;
                        }
                    });
    
                    totalColors.forEach(color => {
                        console.log("Color: " + color);
                        if(otherCellColor[color] != thisCellColor[color])
                        {
                            valid = false;
                        }
                    });
                }
            }
            else
            { //If tile doesnt exist, doesn't matter

            }
        }
        //console.log("Final temp: " + temperature);
        if(temperature < 2 && !ignoreTemperature)
        {
            //console.log("Bad temperature! Refusing to place");
            isValid = false;
        }
        else
        {
            //console.log("Temperature is okay.");
        }
        if(isValid)
        {
            //console.log("Confirmed valid spawn point");
            var key = convertXYZToKey(x, y, z);
            addTileMeshArrayToScene(scene, generateMeshesFromObject(tiles[tileIndex]), x, y, z);
            indexMap[key] = tileIndex;
            availableSpaces = removeIndex(availableSpaces, availableIndex);
            localPositions.forEach(position => {
                var newPos = [x + position[0], y + position[1], z + position[2]];
                var newPosName = convertXYZToKey(newPos[0], newPos[1], newPos[2]);
                if(findIndex(availableSpaces, newPosName) == -1)
                {
                    availableSpaces.push(newPosName);
                }
            });
            console.log("|-> true");
            return true;
        }
    }
    console.log("|-> false");
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
    availableSpaces = [ convertXYZToKey(0,0,0) ];
    spawnTile(0, 0, 0, 0, true);
    //addTileMeshArrayToScene(scene, generateMeshesFromObject(tiles[0]), 0, 0, 0);
});

//Returns a random value between [a,b] both inclusive
function randInt(a, b)
{
    return Math.floor((Math.random() * (b + 1)) + a);
}

stepButton.addEventListener("click", event => {
    console.log("Clicked");
    do {
        var availableSpaceIndex = randInt(0, availableSpaces.length - 1);
        var tileIndex = randInt(0, tiles.length - 1);
        position = convertKeyToXYZ(availableSpaces[availableSpaceIndex]);
        console.log("Spawning");
    } while( !spawnTile(tileIndex, position[0], position[1], position[2], false) );
});