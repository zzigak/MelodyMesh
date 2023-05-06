import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { OBJLoader } from "three/addons/loaders/OBJLoader.js"

let bunny

const audioInput = document.getElementById("song");
audioInput.addEventListener("change", setAudio, false);

let noise = new SimplexNoise();
const mainCanvas = document.getElementById("canvas");
const label = document.getElementById("label");

let audio = new Audio("breath_of_life_by_florence_and_the_machine.mp3");

function setAudio() {
    audio.pause()
    const audioFile = this.files[0];
    if(audioFile.name.includes(".mp3")) {
      const audioURL = URL.createObjectURL(audioFile);
      audio = new Audio(audioURL);
      console.log(audio)

      // Once a song is imported, render the scene
      main()
    }else{
      alert("Invalid File Type!")
    }
    
  }

mainCanvas.addEventListener('click', () => {
    console.log(audio)
    if(audio.paused) {
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
    audioAnalyzer.fftSize = 512;
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
            const loader = new OBJLoader()
            loader.load('resources/bunny.obj', root => {
                const bunny = root.children[0]
                console.log(root)
                bunny.scale.set(100, 100, 100)
                bunny.position.y = -3
                bunny.material = wireframeMaterial
                resolve(bunny)
            })
        })

        scene.add(bunny)
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
        console.log(dataArray)

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement
            camera.aspect = canvas.clientWidth / canvas.clientHeight
            camera.updateProjectionMatrix()
        }

        bunny.rotation.y += 0.01

        renderer.render(scene, camera)

        requestAnimationFrame(render)
    }

    requestAnimationFrame(render)
}

// main()
