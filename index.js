import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { OBJLoader } from "three/addons/loaders/OBJLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"

let bunny
var m1 = 3;
var m2 = 6;
var m3 = 8;
var l1 = 9;
var l2 = 18;
var l3 = 24;
var lowmag = 0.25;
var midmag = 0.25;
var highmag = 0.25;

var phiPhase = 0;
var thetaPhase = 0;

//spherical harmonics formulas adapted from https://patapom.com/blog/SHPortal/

function K( l, m ) {
    var temp = ((2.0*l+1.0)*factorial(l-m)) / (4.0*Math.PI*factorial(l+m));   // Here, you can use a precomputed table for factorials
    return (temp)**0.5;
    //return K_values[l][m];
 }


function P( l, m, cosTheta ) {
    // TODO: consier quantize cosTheta if performance is an issue

    if (cachedLegendrePolynomials[l] && cachedLegendrePolynomials[l][m] && cachedLegendrePolynomials[l][m][cosTheta] !== undefined) {
        //console.log("cache hit!!!");
        return cachedLegendrePolynomials[l][m][cosTheta];
    }
    else {
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

        if (!cachedLegendrePolynomials[l]) {
            cachedLegendrePolynomials[l] = {};
        }
        if (!cachedLegendrePolynomials[l][m]) {
            cachedLegendrePolynomials[l][m] = {};
        }
        cachedLegendrePolynomials[l][m][cosTheta] = pll;
        //console.log("cache miss!!!: ", "l= ", l, "m= ", m, "cosTheta= ", cosTheta, "result: ", cachedLegendrePolynomials[l][m][cosTheta]);
        return pll;
    }
 }

function SH(l, m, theta, phi) {
    // TODO: consider quantize theta and phi if performance is an issue

    const key = `${l}_${m}_${theta}_${phi}`;

    if (cachedSH[key] !== undefined) {
        //console.log("SH cache hit!!!");
        return cachedSH[key];
    }

    const sqrt2 = Math.sqrt(2.0);
    let result;

    if (m === 0) {
        result = K(l, 0) * P(l, m, Math.cos(theta));
    } else if (m > 0) {
        result = sqrt2 * K(l, m) * Math.cos(m * phi) * P(l, m, Math.cos(theta));
    } else {
        result = sqrt2 * K(l, -m) * Math.sin(-m * phi) * P(l, -m, Math.cos(theta));
    }

    //console.log("cached miss: ", theta, phi, result)

    cachedSH[key] = result;
    return result;
}


function updateSliders () {
    m1 = parseInt(document.getElementById('m1').value);
    l1 = parseInt(document.getElementById('l1').value);
    document.getElementById("m1").max = l1;
    document.getElementById("m1label").innerHTML = "Low Degree: ".concat(m1);
    document.getElementById("l1label").innerHTML = "Low Order: ".concat(l1);

    m2 = parseInt(document.getElementById('m2').value);
    l2 = parseInt(document.getElementById('l2').value);
    document.getElementById("m2").max = l2;
    document.getElementById("m2label").innerHTML = "Mid Degree: ".concat(m2);
    document.getElementById("l2label").innerHTML = "Mid Order: ".concat(l2);

    m3 = parseInt(document.getElementById('m3').value);
    l3 = parseInt(document.getElementById('l3').value);
    document.getElementById("m3").max = l3;
    document.getElementById("m3label").innerHTML = "High Degree: ".concat(m3);
    document.getElementById("l3label").innerHTML = "High Order: ".concat(l3);

    lowmag = parseFloat(document.getElementById('lowmag').value);
    document.getElementById("lowmaglabel").innerHTML = "Low Magnitude: ".concat(lowmag);

    midmag = parseFloat(document.getElementById('midmag').value);
    document.getElementById("midmaglabel").innerHTML = "Mid Magnitude: ".concat(midmag);

    highmag = parseFloat(document.getElementById('highmag').value);
    document.getElementById("highmaglabel").innerHTML = "High Magnitude: ".concat(highmag);

    thetaPhase = parseFloat(document.getElementById('thetaPhase').value);
    document.getElementById("thetaphaselabel").innerHTML = "Theta Phase: ".concat(thetaPhase);

    phiPhase = parseFloat(document.getElementById('phiPhase').value);
    document.getElementById("phiphaselabel").innerHTML = "Phi Phase: ".concat(phiPhase);

};

document.getElementById("m1").addEventListener("input", function (h){
    updateSliders();
});
document.getElementById("m2").addEventListener("input", function (h){
    updateSliders();
});
document.getElementById("m3").addEventListener("input", function (h){
    updateSliders();
});
document.getElementById("l1").addEventListener("input", function (h){
    updateSliders();
});
document.getElementById("l2").addEventListener("input", function (h){
    updateSliders();
});
document.getElementById("l3").addEventListener("input", function (h){
    updateSliders();
});
document.getElementById("lowmag").addEventListener("input", function (h){
    updateSliders();
});
document.getElementById("midmag").addEventListener("input", function (h){
    updateSliders();
});
document.getElementById("highmag").addEventListener("input", function (h){
    updateSliders();
});
document.getElementById("thetaPhase").addEventListener("input", function (h){
    updateSliders();
});
document.getElementById("phiPhase").addEventListener("input", function (h){
    updateSliders();
});



let cachedSH = {}; // memorization to speed up the process of computing SH values
const cachedLegendrePolynomials = {}; // memorization to speed up the process of computing LegendrePolynomials

// cached factorials to speed up the process of computing factorials
const factorials = [
    1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600, 6227020800, 87178291200, 1307674368000, 20922789888000, 355687428096000, 6402373705728000, 121645100408832000, 2432902008176640000, 51090942171709440000, 1124000727777607680000, 25852016738884976640000, 620448401733239439360000, 15511210043330985984000000, 403291461126605635584000000, 10888869450418352160768000000, 304888344611713860501504000000, 8841761993739701954543616000000, 265252859812191058636308480000000, 8222838654177922817725562880000000, 263130836933693530167218012160000000, 8683317618811886495518194401280000000, 295232799039604140847618609643520000000];

function factorial(n, r = 1) {
       while (n > 0) r *= n--;

       //console.log("R: ", r);
       return r;
        //return factorials[n];
    }

// Attempt to speed up the process of computing K
function generatePrecomputedK(maxL) {
    const K_values = new Array(maxL + 1);
    
    for (let l = 0; l <= maxL; l++) {
        K_values[l] = new Array(l + 1);
        for (let m = 0; m <= l; m++) {
            var lMinusM = l - m;
            var lPlusM = l + m;
            var temp = (2 * l + 1) * factorial(lMinusM) / (4 * Math.PI * factorial(lPlusM));
            K_values[l][m] = Math.sqrt(temp);
        }
    }
    
    return K_values;
    }

const maxL = 40;
// Precompute K values we don't have to do it every frame!!!
const K_values = generatePrecomputedK(maxL);

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
        //console.log(sec)

        audio.currentTime = sec

        //console.log(audio)

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
    //console.log(audio)
    if (audio.paused) {

        if (firstClick ==1) {
            const queryString = window.location.href;
            const url = new URL(queryString);
            var sec = url.searchParams.get("starttime");
            //console.log(sec)

            audio.currentTime = sec

            //console.log(audio)

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
    camera.position.set(-30, 0, 30)

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
                loader.load('resources/bunny2.obj', root => { // bunny.obj
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

                    //console.log(bunny.material)
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

        meanx = meanx / (normal.length / 3);
        meany = meany / (normal.length / 3);
        meanz = meanz / (normal.length / 3);

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
        const highFactor = highFreq *0.03;
        const midFactor = midFreq *0.03;
        const lowFactor = lowFreq * 0.03;    
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = originalVertexPositions[i];
            const y = originalVertexPositions[i + 1];
            const z = originalVertexPositions[i + 2];
    
            const normal = new THREE.Vector3(
                mesh.geometry.attributes.normal.array[i],
                mesh.geometry.attributes.normal.array[i + 1],
                mesh.geometry.attributes.normal.array[i + 2]
            );

            var tempx = (x - meanx);
            var tempy = (y - meany);
            var tempz = (z - meanz);
            var r = (tempx**2 + tempy**2 + tempz**2)**0.5;
            // var phi = Math.atan2(tempy, tempx);
            // var theta = Math.acos(tempz / r);

            

            var phi = Math.atan2(tempy, tempx) + phiPhase
            var theta = Math.acos(tempz / r) + thetaPhase;

            var lowharmonic = (SH( l1, m1, theta, phi ))*(r**lowmag);
            var midharmonic = (SH( l2, m2, theta, phi ))*(r**midmag);
            var highharmonic = (SH( l3, m3, theta, phi ))*(r**highmag);

            //test spherical harmonic forms here
            // positions[i] = SH( l1, m1, theta, phi ) * Math.sin(theta) * Math.cos(phi);
            // positions[i + 1] = SH( l1, m1, theta, phi ) * Math.sin(theta) * Math.sin(phi);
            // positions[i + 2] = SH( l1, m1, theta, phi ) * Math.cos(theta);
            
            positions[i] = x + normal.x  * (lowFactor * lowharmonic + midFactor * midharmonic + highFactor * highharmonic);
            positions[i + 1] = y + normal.y * (lowFactor * lowharmonic + midFactor * midharmonic + highFactor * highharmonic);
            positions[i + 2] = z + normal.z * (lowFactor * lowharmonic + midFactor * midharmonic + highFactor * highharmonic);
        }
        
        mesh.geometry.attributes.position.needsUpdate = true;

        mesh.geometry.computeVertexNormals();
    }
    
    
      

    requestAnimationFrame(render)
}

// main()
