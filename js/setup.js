import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

// scene stuff
export function initializeScene(renderer, scene, camera) {
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setSize(window.innerWidth, window.innerHeight)

    camera.fov = 35
    camera.aspect = 2  // the canvas default
    camera.near = 0.1
    camera.far = 100
    camera.position.set(-30, 0, 30)

    const controls = new OrbitControls(camera, canvas)
    controls.target.set(0, 0, 0)
    controls.update()

    scene.background = new THREE.Color("hsl(200, 15%, 20%)")

    // lighting
    const skyColor = new THREE.Color("hsl(200, 15%, 20%)") //0xB1E1FF  // light blue
    const groundColor = 0xB97A20  // brownish orange
    const intensity = 0.5
    const light = new THREE.HemisphereLight(skyColor, groundColor, intensity)
    scene.add(light)

    const color = 0xFFFFFF
    const directionalLight = new THREE.DirectionalLight(color, 0.1)
    directionalLight.position.set(50, 50, 50)
    directionalLight.target.position.set(0, 0, 0)
    scene.add(directionalLight)
    scene.add(directionalLight.target)

    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.1);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    camera.add(pointLight);
    scene.add(camera);
}

// dynamic material stuffs
export function initializeMaterial(mesh) {
    const materialInput = document.getElementById("material-select")

    function updateMaterial(selectedIndex = 0) {
        const name = materialInput.options[selectedIndex].value
        if (name === "wireframe")
            mesh.material = new THREE.MeshLambertMaterial({ color: "#ffffff", wireframe: true })
        else if (name === "normals")
            mesh.material = new THREE.MeshNormalMaterial({ flatShading: true })
    }

    materialInput.addEventListener("change", e => updateMaterial(e.target.options.selectedIndex))
    updateMaterial()
}

export let audio = new Audio("resources/epic.mp3")
// audio player and pause 
export function initializePlayer() {
    const pauseButton = document.getElementById('playpause')

    // TODO for debugging purposes, start out by playing audio on click
    window.addEventListener("click", function oneshot() {
        audio.play()
        pauseButton.innerHTML = 'Pause'
        window.removeEventListener("click", oneshot)
    })

    const audioInput = document.getElementById("song");
    audioInput.addEventListener("change", setAudio, false);

    var firstClick = 1;

    function setAudio() {
        audio.pause()
        const audioFile = this.files[0];
        if (audioFile.name.includes(".mp3")) {
            const audioURL = URL.createObjectURL(audioFile);
            audio = new Audio(audioURL);

            const queryString = window.location.href;
            const url = new URL(queryString);
            var sec = url.searchParams.get("starttime");

            audio.currentTime = sec

            audio.play()
            pauseButton.innerHTML = 'Pause'
        } else {
            alert("Invalid File Type!")
        }

    }

    pauseButton.addEventListener('click', () => {
        if (audio.paused) {

            if (firstClick == 1) {
                const queryString = window.location.href;
                const url = new URL(queryString);
                var sec = url.searchParams.get("starttime");

                audio.currentTime = sec

                audio.play()
                firstClick = 0;
                pauseButton.innerHTML = 'Pause'
            } else {

                audio.play()
                pauseButton.innerHTML = 'Pause'
            }
        } else {
            audio.pause()
            pauseButton.innerHTML = 'Play'
        }
    })
}


// sliders and state
class BinSlider {
    constructor(degree, order, magnitude) {
        this.deg = degree
        this.ord = order
        this.mag = magnitude
    }

    // allow for quick value extraction
    *[Symbol.iterator]() {
        yield this.deg
        yield this.ord
        yield this.mag
    }
}

class PhaseSlider {
    constructor(theta, phi) {
        this.theta = theta
        this.phi = phi
    }

    // allow for quick value extraction
    *[Symbol.iterator]() {
        yield this.theta
        yield this.phi
    }
}

export const lowSlider = new BinSlider(3, 9, 0.25)
export const midSlider = new BinSlider(6, 18, 0.25)
export const highSlider = new BinSlider(8, 24, 0.25)
export const phaseSlider = new PhaseSlider(0, 0)

export function initializeSliders() {
    new Array("m1", "m2", "m3", "l1", "l2", "l3", "lowmag", "midmag", "highmag", "thetaPhase", "phiPhase").forEach(id => {
        document.getElementById(id).addEventListener("input", () => updateSliders())
    })

}

function updateSliders() {
    const m1 = parseInt(document.getElementById("m1").value);
    const l1 = parseInt(document.getElementById("l1").value);
    document.getElementById("m1").max = l1;
    document.getElementById("m1label").innerHTML = "Low Degree: ".concat(m1);
    document.getElementById("l1label").innerHTML = "Low Order: ".concat(l1);
    lowSlider.deg = m1
    lowSlider.ord = l1

    const m2 = parseInt(document.getElementById("m2").value);
    const l2 = parseInt(document.getElementById("l2").value);
    document.getElementById("m2").max = l2;
    document.getElementById("m2label").innerHTML = "Mid Degree: ".concat(m2);
    document.getElementById("l2label").innerHTML = "Mid Order: ".concat(l2);
    midSlider.deg = m2
    midSlider.ord = l2

    const m3 = parseInt(document.getElementById("m3").value);
    const l3 = parseInt(document.getElementById("l3").value);
    document.getElementById("m3").max = l3;
    document.getElementById("m3label").innerHTML = "High Degree: ".concat(m3);
    document.getElementById("l3label").innerHTML = "High Order: ".concat(l3);
    highSlider.deg = m3
    highSlider.ord = l3

    const lowmag = parseFloat(document.getElementById("lowmag").value);
    document.getElementById("lowmaglabel").innerHTML = "Low Magnitude: ".concat(lowmag);
    lowSlider.mag = lowmag

    const midmag = parseFloat(document.getElementById("midmag").value);
    document.getElementById("midmaglabel").innerHTML = "Mid Magnitude: ".concat(midmag);
    midSlider.mag = midmag

    const highmag = parseFloat(document.getElementById("highmag").value);
    document.getElementById("highmaglabel").innerHTML = "High Magnitude: ".concat(highmag);
    highSlider.mag = highmag

    const thetaPhase = parseFloat(document.getElementById("thetaPhase").value);
    document.getElementById("thetaphaselabel").innerHTML = "Theta Phase: ".concat(thetaPhase);
    phaseSlider.theta = thetaPhase

    const phiPhase = parseFloat(document.getElementById("phiPhase").value);
    document.getElementById("phiphaselabel").innerHTML = "Phi Phase: ".concat(phiPhase);
    phaseSlider.phi = phiPhase
}

