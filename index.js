import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { OBJLoader } from "three/addons/loaders/OBJLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"

let bunny


const audioInput = document.getElementById("song");
audioInput.addEventListener("change", setAudio, false);

const materialInput = document.getElementById("material-select")
materialInput.addEventListener("change", e => onMaterialChange(e.target.options.selectedIndex))
function onMaterialChange(selectedIndex = 0) {
    const name = materialInput.options[selectedIndex].value
    if (name === "wireframe")
        bunny.material = new THREE.MeshLambertMaterial({ color: "#ffffff", wireframe: true })
    else if (name === "normals")
        bunny.material = new THREE.MeshNormalMaterial({ flatShading: true })
}

let noise = new SimplexNoise();
const mainCanvas = document.getElementById("canvas");
const label = document.getElementById("label");

let audio = new Audio("resources/Nightmares On Wax - You Wish.mp3");

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
        console.log(sec)

        audio.currentTime = sec

        console.log(audio)

        // Once a song is imported, render the scene
        main()
        audio.play()
        document.getElementById('playpause').innerHTML = 'Pause'
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


document.getElementById('playpause').addEventListener('click', () => {
    console.log(audio)
    if (audio.paused) {

        if (firstClick ==1) {
            const queryString = window.location.href;
            const url = new URL(queryString);
            var sec = url.searchParams.get("starttime");
            console.log(sec)

            audio.currentTime = sec

            console.log(audio)

            // Once a song is imported, render the scene
            main()
            audio.play()
            firstClick = 0;
            document.getElementById('playpause').innerHTML = 'Pause'
        } else{

            audio.play()
            document.getElementById('playpause').innerHTML = 'Pause'
            //label.style.display = "none"
        }
    } else {
        audio.pause()
        document.getElementById('playpause').innerHTML = 'Play'
        //label.style.display = "flex"
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

    const fov = 35
    const aspect = 2  // the canvas default
    const near = 0.1
    const far = 100
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    camera.position.set(0, 20, 35)

    const controls = new OrbitControls(camera, canvas)
    controls.target.set(0, 0, 0)
    controls.update()

    const wireframeMaterial = new THREE.MeshLambertMaterial({
        color: "#ffffff",
        wireframe: true
    });

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("hsl(200, 15%, 20%)")

    let originalVertexPositions;



    // lighting goes here

    {
        const skyColor = new THREE.Color("hsl(200, 15%, 20%)") //0xB1E1FF  // light blue
        const groundColor = 0xB97A20  // brownish orange
        const intensity = 0.5
        const light = new THREE.HemisphereLight(skyColor, groundColor, intensity)
        scene.add(light)
    }
    {
        const color = 0xFFFFFF
        const intensity = 0.1
        const light = new THREE.DirectionalLight(color, intensity)
        light.position.set(50, 50, 50)
        light.target.position.set(0, 0, 0)
        scene.add(light)
        scene.add(light.target)
    }
    {
        const ambientLight = new THREE.AmbientLight( 0xcccccc, 0.1 );
        scene.add( ambientLight );
    }
    {
        const pointLight = new THREE.PointLight( 0xffffff, 0.5 );
        camera.add( pointLight );
        scene.add( camera );
    }



    {
        bunny = await new Promise((resolve, reject) => {
            try {
                const loader = new OBJLoader()
                loader.load('resources/sphere5.obj', root => { // bunny.obj
                    // actually get the mesh
                    const bunny = root.children[0]
                    // transform since the original is tiny

                    bunny.scale.set(1, 1, 1)
                    bunny.position.y = 0
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
                    const mesh = new THREE.Mesh(merged) //wireframeMaterial
                    mesh.geometry.computeVertexNormals()

                    resolve(mesh)
                })
            } catch (error) {
                reject(error)
            }
        })

        onMaterialChange()
        scene.add(bunny)

    }

    {
        const normal = bunny.geometry.attributes.normal.array
        const position = bunny.geometry.attributes.position.array

        var meanx = 0;
        var meany = 0;
        var meanz = 0;

        for (let i = 0; i < normal.length; i += 3) {
            const [x, y, z] = position.slice(i, i + 3)
            meanx += x
            meany += y
            meanz += z
            const [dx, dy, dz] = normal.slice(i, i + 3)
            const origin = new THREE.Vector3(x, y, z)
            const direction = new THREE.Vector3(dx, dy, dz).normalize()
            const arrow = new THREE.ArrowHelper(direction, origin, 2, 0xffff00)
            // offset in the direction of the normal vector
            position[i] = x + direction.x/100
            position[i + 1] = y + direction.y/100
            position[i + 2] = z + direction.z/100
            // scene.add(arrow)
        }

        meanx = meanx / normal.length;
        meany = meany / normal.length;
        meanz = meanz / normal.length;

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

        //console.log(lowMaxFreq, midMaxFreq, upperMaxFreq)
        
        let eqOutput = ''; 
        for (let i = 0; i < dataArray.length; i++) {
            const freq = Math.min(1, dataArray[i] / 255); 
            eqOutput += '='.repeat(freq * 1000 * ((i**1.1+50)/255) ) + '<br/>';
        }
        
        document.getElementById('eqoutput').innerHTML = eqOutput;

        
        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement
            camera.aspect = canvas.clientWidth / canvas.clientHeight
            camera.updateProjectionMatrix()
        }

        //bunny.rotation.y += 0.001

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
    
        const time = window.performance.now()* 0.0001 * highFreq;
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

            


            //spherical harmonics formulas adapted from https://patapom.com/blog/SHPortal/

            function factorial(n, r = 1) {
              while (n > 0) r *= n--;
              return r;
            }

            function K( l, m ) {
                var temp = ((2.0*l+1.0)*factorial(l-m)) / (4.0*Math.PI*factorial(l+m));   // Here, you can use a precomputed table for factorials
                return (temp)**0.5;
             }

            function P( l, m, cosTheta ) {
                var pmm = 1.0;

                if ( m > 0 ) {
                    var somx2 = ((1.0-cosTheta)*(1.0+cosTheta))**0.5;
                    var fact = 1.0;
                    for ( var iter=1; iter<=m; iter++ ) {
                        pmm *= (-fact) * somx2;
                        fact += 2.0;
                    }
                }

                if( l == m ) {
                    return pmm;
                }

                var pmmp1 = cosTheta * (2.0*m+1.0) * pmm;

                if ( l == m+1 ) {
                    return pmmp1;
                }

                var pll = 0.0;
                for ( var ll=m+2; ll<=l; ll++ ) {
                    pll = ( (2.0*ll-1.0)*cosTheta*pmmp1-(ll+m-1.0)*pmm ) / (ll-m);
                    pmm = pmmp1;
                    pmmp1 = pll;
                }

                return pll;
             }


            function SH( l, m, theta, phi ) {
                const sqrt2 = (2.0)**0.5;
                if( m == 0 ) {       
                    return K(l,0)*P(l,m,Math.cos(theta))
                } else if( m > 0 ) {
                    return sqrt2*K(l,m)*Math.cos(m*phi)*P(l,m,Math.cos(theta))
                } else {
                    return sqrt2*K(l,-m)*Math.sin(-m*phi)*P(l,-m,Math.cos(theta))
                }
             }

            var tempx = (x - meanx) ;
            var tempy = (y - meany) ;
            var tempz = (z - meanz) ;
            var r = (tempx**2+(tempy-5)**2+tempz**2)**0.5;
            var phi = Math.atan((tempy-5)/tempx);
            var theta = Math.acos(tempz/r);
            
            var m = parseFloat(document.getElementById('m').value);
            var l = parseFloat(document.getElementById('l').value);
            document.getElementById("m").max = l;
            document.getElementById("mlabel").innerHTML = "m: ".concat(m);
            document.getElementById("llabel").innerHTML = "l: ".concat(l);

            var harmonic =  (SH( l, m, theta, phi ))*(r**0.5);

            /*
            positions[i] = x + normal.x  * (lowFactor * lowDistInv + midFactor * midDistInv + highFactor * highDistInv) ;
            positions[i + 1] = y + normal.y * (lowFactor * lowDistInv + midFactor * midDistInv + highFactor * highDistInv) ;
            positions[i + 2] = z + normal.z * (lowFactor * lowDistInv + midFactor * midDistInv + highFactor * highDistInv) ;
            */
            positions[i] = x + normal.x  * (midFactor * harmonic) ;
            positions[i + 1] = y + normal.y * (midFactor * harmonic) ;
            positions[i + 2] = z + normal.z * (midFactor * harmonic) ;

        }
        
        mesh.geometry.attributes.position.needsUpdate = true;

        mesh.geometry.computeVertexNormals();
    }
    
    
      

    requestAnimationFrame(render)
}

// main()