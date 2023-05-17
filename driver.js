import * as THREE from "three"
import { OBJLoader } from "three/addons/loaders/OBJLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"
import { initializeAudioBuffer, updateAudioBuffer, updateSpectrumBars } from "./js/audio.js"
import { initializeScene, initializeSliders, initializeMaterial, initializePlayer } from "./js/setup.js"
import { deformMeshWithAudio } from "./js/deformation.js"

export async function main() {
    const canvas = document.querySelector('#canvas')
    const camera = new THREE.PerspectiveCamera()
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas })
    const scene = new THREE.Scene()

    initializeScene(renderer, scene, camera)
    initializeSliders()
    initializePlayer()

    const bunny = await loadFromOBJ("resources/sphere5.obj")
    console.log(bunny)
    initializeMaterial(bunny)
    scene.add(bunny)

    const dataArray = await initializeAudioBuffer()

    function render() {
        updateAudioBuffer(dataArray)

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

        const lowMax = dataArray.slice(0, lowRange).reduce((a, b) => Math.max(a, b));
        const midMax = dataArray.slice(lowRange, midRange).reduce((a, b) => Math.max(a, b));
        const uppMax = dataArray.slice(midRange, highRange).reduce((a, b) => Math.max(a, b));


        deformMeshWithAudio(bunny,
            mapRange(lowMax, 0, 255, 0, 10),
            mapRange(midMax, 0, 255, 0, 10),
            mapRange(uppMax, 0, 255, 0, 10)
        )

        updateSpectrumBars(dataArray)
        handleResize(renderer)

        renderer.render(scene, camera)
        requestAnimationFrame(render)
    }

    // start the render loop
    requestAnimationFrame(render)
}


async function loadFromOBJ(filename = "resources/bunny.obj") {
    return new Promise((resolve, reject) => {
        try {
            const loader = new OBJLoader()
            loader.load(filename, root => {
                // actually get the mesh
                const bunny = root.children[0]
                // merge redundant vertices
                const old = bunny.geometry
                // the merge function only merges vertices if they share 
                // all the same attributes, but the normals are different
                // (that's what we want to fix). Remove the normals first, 
                // and then recalculate them later
                delete old.attributes.normal
                const merged = BufferGeometryUtils.mergeVertices(old)
                old.dispose()

                const mesh = new THREE.Mesh(merged)
                mesh.geometry.computeVertexNormals()

                // add original vertex positions as another attribute
                mesh.geometry.setAttribute("originalPosition", mesh.geometry.getAttribute("position").clone())
                // add the center, or mean vertex position too
                const mean = new THREE.Vector3(0, 0, 0)
                const position = mesh.geometry.attributes.position.array
                for (let i = 0; i < position.length; i += 3)
                    mean.add(new THREE.Vector3(...position.slice(i, i + 3)))
                mean.divideScalar(position.length / 3)
                mesh.geometry.setAttribute("center", new THREE.BufferAttribute(new Float32Array(mean.toArray()), 1))

                resolve(mesh)
            })
        } catch (error) {
            reject(error)
        }
    })
}

function handleResize(renderer, camera) {
    const canvas = renderer.domElement
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const needResize = canvas.width !== width || canvas.height !== height
    if (needResize) {
        camera.aspect = canvas.clientWidth / canvas.clientHeight
        camera.updateProjectionMatrix()
    }

    return needResize
}

function mapRange(val, inMin, inMax, outMin, outMax) {
    // Sample: mapRange(25, 10, 50, 0, 100);  
    // Returns 50 - maps 25 from 10-50 range to 0-100
    var fr = (val - inMin) / (inMax - inMin);
    var delta = outMax - outMin;
    return outMin + (fr * delta);
}