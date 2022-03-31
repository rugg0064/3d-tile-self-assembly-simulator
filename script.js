
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
        setPos.multiplyScalar(1);
        setPos.add(position);

        scene.add( mesh );
        mesh.position.x = setPos.x;
        mesh.position.y = setPos.y;
        mesh.position.z = setPos.z;
        console.log(setPos);
        objects.push(mesh)
    });
    var key = convertXYZToKey(x, y, z);
    objectMap[key] = objects;
}

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true } );

const CUBE_COUNT = 50;

var objectMap = {}; //An (int, int, int) -> cube dictionary. Each entry is a 
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

function 

function spawnTile(tileIndex, x, y, z)
{
    if(objectMap[convertXYZToKey(x,y,z)])
    {
        addTileMeshArrayToScene(scene, generateMeshesFromObject(tiles[0]), x, y, z);
        availableSpaces.remove([x,y,z]);
    }
    else
    {
        return false;
    }
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
    addTileMeshArrayToScene(scene, generateMeshesFromObject(tiles[0]), 0, 0, 0);
});