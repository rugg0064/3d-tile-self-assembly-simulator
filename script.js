
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );

const deg2rad = Math.PI/180;

let canvas = document.getElementById("mainCanvas");
const renderer = new THREE.WebGLRenderer( { 
    canvas: canvas 
});
renderer.setSize( canvas.parentElement.offsetHeight, canvas.parentElement.offsetHeight );
//renderer.setSize( 500, 500 );

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
    const sensitivity = 0.10;

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

    //camera.position.add(newRight.multiplyScalar(forwardAmount).multiplyScalar(sensitivity));

}

//let canvas = document.getElementById("canvasHolder").appendChild( renderer.domElement );

skyboxGeo = new THREE.BoxGeometry(10000, 10000, 10000);
const skyboxTexture = new THREE.TextureLoader().load("./skybox.png");
const skyboxMaterial = new THREE.MeshBasicMaterial( { map: skyboxTexture } );
skybox = new THREE.Mesh(skyboxGeo, skyboxMaterial);
scene.add(skybox);

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true } );

const CUBE_COUNT = 50;

let cubes = [];
for(let i = 0; i < CUBE_COUNT; i++)
{
    var cube = new THREE.Mesh( geometry, material );
    cube.position.x = i;
    scene.add( cube );
    cubes.push(cube);
}

camera.position.z = 5;

function animate() {
    requestAnimationFrame( animate );
    renderer.render( scene, camera );
}
animate();

setInterval(function(){
    for(let i = 0; i < CUBE_COUNT; i++)
    {
        cubes[i].rotation.x += 0.01 * i;
        //cubes[i].rotation.y += 0.01;
    }
}, 5);