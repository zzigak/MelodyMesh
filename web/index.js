import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { OBJLoader } from "three/addons/loaders/OBJLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"

let bunny

const audioInput = document.getElementById("song");
audioInput.addEventListener("change", setAudio, false);

let noise = new SimplexNoise();
const mainCanvas = document.getElementById("canvas");
const label = document.getElementById("label");

let audio = new Audio("resources/upbeat_percussion.mp3");

function setAudio() {
    audio.pause()
    const audioFile = this.files[0];
    if (audioFile.name.includes(".mp3")) {
        const audioURL = URL.createObjectURL(audioFile);
        audio = new Audio(audioURL);
        console.log(audio)

        // Once a song is imported, render the scene
        main()
    } else {
        alert("Invalid File Type!")
    }

}

// Helper
function mapRange(val, inMin, inMax, outMin, outMax) {
    // Sample: mapRange(25, 10, 50, 0, 100);  
    // Returns 50 - maps 25 from 10-50 range to 0-100
    var fr = (val - inMin) / (inMax - inMin);
    var delta = outMax - outMin;
    return outMin + (fr * delta); 
  }


mainCanvas.addEventListener('click', () => {
    console.log(audio)
    if (audio.paused) {
        audio.play()
        label.style.display = "none"
    } else {
        audio.pause()
        label.style.display = "flex"
    }
})


async function main() {
    const audioContext = new AudioContext();
    const audioSrc = audioContext.createMediaElementSource(audio);
    const audioAnalyzer = audioContext.createAnalyser();

    audioSrc.connect(audioAnalyzer);
    audioAnalyzer.connect(audioContext.destination);
    audioAnalyzer.fftSize = 1024;
    const bufferLength = audioAnalyzer.frequencyBinCount;

    const dataArray = new Uint8Array(bufferLength);

    const canvas = document.querySelector('#canvas')
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setSize(window.innerWidth, window.innerHeight)

    const fov = 45
    const aspect = 2  // the canvas default
    const near = 0.1
    const far = 100
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    camera.position.set(0, 10, 35)

    const controls = new OrbitControls(camera, canvas)
    controls.target.set(0, 5, 0)
    controls.update()

    const wireframeMaterial = new THREE.MeshLambertMaterial({
        color: "#696969",
        wireframe: true
    });

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('white')

    let originalVertexPositions;


    {
        const planeSize = 40

        const loader = new THREE.TextureLoader()
        const texture = loader.load('https://threejs.org/manual/examples/resources/images/checker.png')
        texture.colorSpace = THREE.SRGBColorSpace
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.magFilter = THREE.NearestFilter
        const repeats = planeSize / 2
        texture.repeat.set(repeats, repeats)

        const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize)
        const planeMat = new THREE.MeshPhongMaterial({
            map: texture,
            side: THREE.DoubleSide,
        })
        const mesh = new THREE.Mesh(planeGeo, planeMat)
        mesh.rotation.x = Math.PI * -.5
        scene.add(mesh)
    }

    {
        const skyColor = 0xB1E1FF  // light blue
        const groundColor = 0xB97A20  // brownish orange
        const intensity = 0.6
        const light = new THREE.HemisphereLight(skyColor, groundColor, intensity)
        scene.add(light)
    }

    {
        const color = 0xFFFFFF
        const intensity = 0.8
        const light = new THREE.DirectionalLight(color, intensity)
        light.position.set(0, 10, 0)
        light.target.position.set(-5, 0, 0)
        scene.add(light)
        scene.add(light.target)
    }

    {
        bunny = await new Promise((resolve, reject) => {
            try {
                const loader = new OBJLoader()
                loader.load('resources/bunny.obj', root => {
                    // actually get the mesh
                    const bunny = root.children[0]
                    // transform since the original is tiny
                    bunny.scale.set(100, 100, 100)
                    bunny.position.y = -2
                    // apply the transform and then reset
                    bunny.updateMatrix()
                    bunny.geometry.applyMatrix4(bunny.matrix)
                    bunny.position.set(0, 0, 0)
                    bunny.rotation.set(0, 0, 0)
                    bunny.scale.set(1, 1, 1)
                    bunny.updateMatrix()
                    // merge redundant vertices
                    const old = bunny.geometry
                    // the merge function only merges vertices if they share 
                    // all the same attributes, but the normals are different
                    // (that's what we want to fix). Remove the normals first, 
                    // and then recalculate them later
                    delete old.attributes.normal
                    const merged = BufferGeometryUtils.mergeVertices(old)
                    old.dispose()

                    console.log(bunny.material)
                    const mesh = new THREE.Mesh(merged, new THREE.MeshNormalMaterial({ flatShading: true }))
                    mesh.geometry.computeVertexNormals()

                    resolve(mesh)
                })
            } catch (error) {
                reject(error)
            }
        })

        scene.add(bunny)
    }

    {
        const normal = bunny.geometry.attributes.normal.array
        const position = bunny.geometry.attributes.position.array

        for (let i = 0; i < normal.length; i += 3) {
            const [x, y, z] = position.slice(i, i + 3)
            const [dx, dy, dz] = normal.slice(i, i + 3)
            const origin = new THREE.Vector3(x, y, z)
            const direction = new THREE.Vector3(dx, dy, dz).normalize()
            const arrow = new THREE.ArrowHelper(direction, origin, 2, 0xffff00)
            // offset in the direction of the normal vector
            position[i] = x + direction.x
            position[i + 1] = y + direction.y
            position[i + 2] = z + direction.z
            // scene.add(arrow)
        }

        // mark as dirty so that the positions get re-rendered
        bunny.geometry.attributes.position.needsUpdate = true
    }

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement
        const width = canvas.clientWidth
        const height = canvas.clientHeight
        const needResize = canvas.width !== width || canvas.height !== height
        if (needResize) {
            renderer.setSize(width, height, false)
        }
        return needResize
    }

    function render() {
        audioAnalyzer.getByteFrequencyData(dataArray);

        // split the frequency data into 3 segments

        const third = Math.floor(dataArray.length / 3)
        const twoThird = Math.floor(dataArray.length * 2 / 3)

        let lowRange = third
        let midRange = twoThird
        let highRange = dataArray.length

        // For edge case when we have 1 or 2 extra bins in the last range. 
        // So we increment midRange and decrement highRange to account for that.
        // Now the ranges will always split evenly and cover all bins.
        if (dataArray.length % 3 > 0) {
            midRange++
            highRange--
        }

        // loudest frequency in the low range
        const lowMax = dataArray.slice(0, lowRange).reduce((a, b) => Math.max(a, b));

        // avg frequency in the middle range
        const midAvg = dataArray.slice(lowRange, midRange).reduce((a, b) => a + b) / (midRange - lowRange);
        const midMax = dataArray.slice(lowRange,midRange).reduce((a,b)=> Math.max(a,b));
        // loudest frequency in the upper range
        const uppMax = dataArray.slice(midRange, highRange).reduce((a, b) => Math.max(a, b));
 
        const lowMaxFreq = lowMax  // / lowRange
       // const midAvgFreq = midAvg
        const midMaxFreq = midMax
        const upperMaxFreq = uppMax // / (highRange - midRange)

        console.log(lowMaxFreq, midMaxFreq, upperMaxFreq)
        
        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement
            camera.aspect = canvas.clientWidth / canvas.clientHeight
            camera.updateProjectionMatrix()
        }

        //bunny.rotation.y += 0.01

        // TODO: map the frequency values to the desired output ranges? (see sample below)
       //deformMeshWithAudio(bunny, lowMaxFreq, midAvgFreq, upperMaxFreq)
       deformMeshWithAudio(bunny, 
            mapRange(lowMaxFreq, 0, 255, 0, 10), 
            //mapRange(midAvgFreq, 0, 255, 0, 10),
            mapRange(midMax,0,255,0,10),
            mapRange(upperMaxFreq, 0, 255, 0, 10)
        )

        renderer.render(scene, camera)

        requestAnimationFrame(render)
    }

    function deformMeshWithAudio(mesh, lowFreq, midFreq, highFreq) {
        const geometry = mesh.geometry;
    
        if (!geometry.attributes.position.array) {
          return;
        }
    
        if (!originalVertexPositions) {
            // Store the original positions of the vertices so we can restore them later
            originalVertexPositions = mesh.geometry.attributes.position.array.slice();
        }
    
        const positions = mesh.geometry.attributes.position.array;
    
        const time = window.performance.now() * 0.0001 * highFreq;
        const rf = 0.00001;
        //const freqFactor = lowFreq * 0.1 * (1 + midFreq * 0.1); // Incorporate mid-frequency to adjust scaling
        const highFactor = highFreq *0.05;
        const midFactor = midFreq *0.05;
        const lowFactor = lowFreq * 0.05;

        for (let i = 0; i < positions.length; i += 3) {
            const x = originalVertexPositions[i];
            const y = originalVertexPositions[i + 1];
            const z = originalVertexPositions[i + 2];
    
            // Calculate the warp value with noise and frequency factor
            //let warp = Math.abs(noise.noise3D(x * rf * 4, y * rf * 6, z * rf * 7 + time) * freqFactor);
    
            // Limit the warp value to a reasonable range?? TODO: play around with these nums
            //warp = Math.min(Math.max(warp, -5), 5); // Adjust the range as needed to prevent triangles from exploding


            let warpX = Math.abs(noise.noise2D(x*rf+time, lowFactor));
            let warpY = Math.abs(noise.noise2D(y*rf+time, midFactor));
            let warpZ = Math.abs(noise.noise2D(z*rf+time, highFactor));
    
            const normal = new THREE.Vector3(
                mesh.geometry.attributes.normal.array[i],
                mesh.geometry.attributes.normal.array[i + 1],
                mesh.geometry.attributes.normal.array[i + 2]
            );
    
            positions[i] = x + normal.x * warpX;
            positions[i + 1] = y + normal.y * warpY;
            positions[i + 2] = z + normal.z * warpZ;
        }
    
        mesh.geometry.attributes.position.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
    }
    
    
      

    requestAnimationFrame(render)
}

// main()
