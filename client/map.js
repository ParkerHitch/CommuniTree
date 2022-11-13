import * as THREE from "three";

let userDataDict = {};
let camDestination = null;

const mapSize = 50;

export function loadMap(clientUsername, userData) {
    // Convert userData to a saved dictionary
    for (let user of userData) {
        userDataDict[user.name] = user;
    }

    // Scene and constant setup
    const canvas = document.getElementById("map");
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
    })
    const loader = new THREE.TextureLoader();

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.setZ(20);
    camera.position.setY(5);
    camera.rotation.x = -1.0

    // Lighting setup
    const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
    scene.add(directionalLight);

    // Map setup
    const mapTexture = loader.load("mn-map.png");
    const mapMaterial = new THREE.MeshBasicMaterial({
        map: mapTexture,
    });

    const mapGeometry = new THREE.PlaneGeometry(mapSize, mapSize)
    const map = new THREE.Mesh(mapGeometry, mapMaterial);
    scene.add(map);

    map.rotation.x = - 3.141592 / 2

    // User markers
    // const markerMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const markerGeometry = new THREE.PlaneGeometry(0.8, 1.0)
    const markerHeight = 1.5;

    const colSphereGeometry = new THREE.SphereGeometry(0.8);
    const colSphereMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0
    })
    
    let markerParent = new THREE.Object3D();
    scene.add(markerParent);

    for (let user of userData) {
        if (user.imagePosted[user.imagePosted.length - 1]) {
            // user already posted today
        }

        let userCoords = new THREE.Vector2(user.location[1], user.location[0]) // reverse lat and long so x comes first
        let markerPos = coordsToWorld(userCoords);

        let collider = new THREE.Mesh(colSphereGeometry, colSphereMaterial);
        collider.position.set(markerPos.x, markerHeight, markerPos.y);
        markerParent.add(collider);

        collider.targetScale = 1;
        collider.currentScale = 1;
        collider.targetRotSpeed = 0.7;
        collider.currentRotSpeed = 0.7;
        collider.hovering = false;

        collider.clicked = false;
        collider.defaultPos = new THREE.Vector3(markerPos.x, markerHeight, markerPos.y);

        const tex = loader.load("api/images/" + user.lastImage)
        let mat = new THREE.MeshBasicMaterial({
            map: tex,
            side: THREE.DoubleSide,
        });
        let marker = new THREE.Mesh(markerGeometry, mat);
        collider.add(marker);
    }

    // User input
    let leftHeld = false;
    let rightHeld = false;
    let upHeld = false;
    let downHeld = false;

    const camSpeed = 0.1;
    const maxPos = new THREE.Vector3(9, 5, 24);
    const minPos = new THREE.Vector3(-9, 5, -10);

    document.addEventListener("keydown", keyDownHandler, false);
    function keyDownHandler(e) {
        if (e.key === "Right" || e.key === "ArrowRight")
            rightHeld = true;
        if (e.key === "Left" || e.key === "ArrowLeft")
            leftHeld = true;
        if (e.key === "Up" || e.key === "ArrowUp")
            upHeld = true;
        if (e.key === "Down" || e.key === "ArrowDown")
            downHeld = true;
        camDestination = null;
    }

    document.addEventListener("keyup", keyUpHandler, false);
    function keyUpHandler(e) {
        if (e.key === "Right" || e.key === "ArrowRight")
            rightHeld = false;
        if (e.key === "Left" || e.key === "ArrowLeft")
            leftHeld = false;
        if (e.key === "Up" || e.key === "ArrowUp")
            upHeld = false;
        if (e.key === "Down" || e.key === "ArrowDown")
            downHeld = false;
    }

    // Raycasting to see if the user is hovering over/clicking an image
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    function onPointerMove( event ) {
        // calculate pointer position in normalized device coordinates (-1 to +1) for both components
        pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    }
    let anyMarkerClicked = false;
    function onClick(event) {
        const intersects = raycaster.intersectObjects( markerParent.children ).map(x => x.object);
        for (let interCol of intersects) {
            if (!interCol.clicked) {
                if (!anyMarkerClicked) {
                    interCol.clicked = true;
                    anyMarkerClicked = true;
                }
            } else {
                interCol.clicked = false;
                anyMarkerClicked = false;
            }
        }
    }
    window.addEventListener( 'pointermove', onPointerMove );
    window.addEventListener('click', onClick)

    // Animation loop
    let lastFrameTime = window.performance.now() / 1000;

    function animate() {
        requestAnimationFrame(animate)

        let t = window.performance.now() / 1000;
        let delta = t - lastFrameTime;
        lastFrameTime = t;

        if (camDestination) {
            let dest3D = new THREE.Vector3(camDestination.x, camera.position.y, camDestination.y)
            let direction = dest3D.clone().sub(camera.position);
            camera.position.add(direction.clone().multiplyScalar(0.05));
            if (direction.length() < 0.1)
                camDestination = null;
        }

        let markerCols = markerParent.children;
        for (let i = 0; i < markerCols.length; i++) {
            let markerCol = markerCols[i];

            if (markerCol.clicked) {
                markerCol.currentRotSpeed = 0;
                markerCol.targetRotSpeed = 0;
                markerCol.rotation.y = 0;
                markerCol.rotation.x = -1;
                let p = new THREE.Vector3(0, -3, -2).add(camera.position);
                markerCol.position.set(p.x, p.y, p.z);
            } else {
                markerCol.rotation.x = 0;
                markerCol.targetRotSpeed = 0.7;

                markerCol.rotation.y += delta * markerCol.currentRotSpeed;
                markerCol.position.set(
                    markerCol.defaultPos.x,
                    markerHeight + Math.sin(t * 1.3 + i) * 0.3,
                    markerCol.defaultPos.z,
                )

                // Smooth toward target rotation speed
                let r = markerCol.currentRotSpeed
                let tr = markerCol.targetRotSpeed;
                if (Math.abs(tr - r) > 0.05) {
                    let newRotSpeed = r + (tr - r) * 0.04;
                    markerCol.currentRotSpeed = newRotSpeed;
                }
            }
            // Smooth toward target scale
            let s = markerCol.currentScale;
            let ts = markerCol.targetScale;
            if (Math.abs(ts - s) > 0.05) {
                let newScale = s + (ts - s) * 0.04;
                markerCol.currentScale = newScale;
                markerCol.scale.set(newScale, newScale, newScale);
            }
        }

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight
            camera.updateProjectionMatrix();
        }

        if (!anyMarkerClicked) {
            let velocity = new THREE.Vector3(
                rightHeld - leftHeld,
                0,
                downHeld - upHeld,
            ).normalize()
            velocity = velocity.multiplyScalar(camSpeed)
            camera.position.add(velocity)
            camera.position.clamp(minPos, maxPos);
        }

        raycaster.setFromCamera( pointer, camera );
        canvas.parentElement.style.cursor = "auto";
        const intersects = raycaster.intersectObjects( markerCols ).map(x => x.object);
        for (let interCol of intersects) {
            if (!interCol.hovering) {
                interCol.hovering = true
                interCol.currentRotSpeed = 15;
            }
            interCol.targetScale = interCol.clicked ? 3 : 2;
            canvas.parentElement.style.cursor = "pointer";
        }

        let nonIntersects = markerCols.filter( function( el ) {
            return !intersects.includes( el );
        } );
        for (let nonInterCol of nonIntersects) {
            nonInterCol.hovering = false;
            nonInterCol.targetScale = nonInterCol.clicked ? 3 : 1;
        }

        renderer.render(scene, camera);
    }
    animate();
}

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;

    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

// Conversion between map and world space
const mapBottomLeftCoords = new THREE.Vector2(-94.3114733, 44.4980742); // longitude, latitude
const mapTopRightCoords = new THREE.Vector2(-92.9541209, 45.4943424);

function coordsToWorld(coords) {
    let hRange = mapTopRightCoords.x - mapBottomLeftCoords.x;
    let vRange = mapTopRightCoords.y - mapBottomLeftCoords.y;
    let hVal = mapTopRightCoords.x - coords.x;
    let vVal = mapTopRightCoords.y - coords.y;

    return new THREE.Vector2(
        (hVal / hRange - 0.5) * -mapSize,
        (vVal / vRange - 0.5) * mapSize,
    )
}

export function setCamDestination(username) {
    let user = userDataDict[username];
    let userCoords = new THREE.Vector2(user.location[1], user.location[0]);
    camDestination = coordsToWorld(userCoords).add(new THREE.Vector2(0, 3));
}

function vecToString(v) {
    return v.x + ", " + v.y + ", " + v.z;
}

