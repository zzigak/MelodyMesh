import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { OBJLoader } from "three/addons/loaders/OBJLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"

let bunny

async function main() {
    const canvas = document.querySelector('#canvas')
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setSize(window.innerWidth, window.innerHeight)

    const fov = 45
    const aspect = 2  // the canvas default
    const near = 0.1
    const far = 100
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    camera.position.set(0, 10, 20)

    const controls = new OrbitControls(camera, canvas)
    controls.target.set(0, 5, 0)
    controls.update()

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

                    const mesh = new THREE.Mesh(merged, bunny.material)
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
            scene.add(arrow)
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

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement
            camera.aspect = canvas.clientWidth / canvas.clientHeight
            camera.updateProjectionMatrix()
        }

        // bunny.rotation.y += 0.01

        renderer.render(scene, camera)

        requestAnimationFrame(render)
    }

    requestAnimationFrame(render)
}

main()
