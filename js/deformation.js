import * as THREE from "three"
import { lowSlider, midSlider, highSlider, phaseSlider } from "./setup.js"

export function deformMeshWithAudio(mesh, lowFreq, midFreq, highFreq) {
    const attributes = mesh.geometry.attributes
    const positions = attributes.position.array
    const normals = attributes.normal.array
    const originalPositions = attributes.originalPosition.array
    const center = new THREE.Vector3(...attributes.center.array)

    // if (!positions) return;

    const highFactor = highFreq * 0.03;
    const midFactor = midFreq * 0.03;
    const lowFactor = lowFreq * 0.03;

    for (let i = 0; i < positions.length; i += 3) {
        const x = originalPositions[i];
        const y = originalPositions[i + 1];
        const z = originalPositions[i + 2];
        const xyz = new THREE.Vector3(x, y, z)

        const normal = new THREE.Vector3(
            normals[i],
            normals[i + 1],
            normals[i + 2]
        );

        const temp = xyz.sub(center)
        const r = temp.length()
        const [thetaPhase, phiPhase] = phaseSlider
        const phi = Math.atan2(temp.y, temp.x) + (phiPhase);
        const theta = Math.acos(temp.z / r) + (thetaPhase);

        const l = Math.floor(lowFreq * 4);
        const m = Math.floor(midFreq * 4) - l;

        const Ylm = SH(l, m, theta, phi);
        const scalingFactor = 1 + highFactor * Ylm;

        const phaseScale = 0.5
        const [l1, m1, lowmag] = lowSlider
        const [l2, m2, midmag] = midSlider
        const [l3, m3, highmag] = highSlider

        var lowharmonic = (SH(l1, m1, theta, phi + (lowFreq * phaseScale))) * (r ** lowmag * 2);
        var midharmonic = (SH(l2, m2, theta, phi + midFreq * phaseScale)) * (r ** midmag * 2);
        var highharmonic = (SH(l3, m3, theta, phi + highFreq * phaseScale)) * (r ** highmag * 2);

        // Modulate the vertex normals using spherical harmonics
        const modulatedNormal = normal.clone().multiplyScalar(scalingFactor);

        const f = 0.01
        positions[i] = x + f * SH(l1, m1, theta, phi) * Math.sin(theta) * Math.cos(phi);
        positions[i + 1] = y + f * SH(l1, m1, theta, phi) * Math.sin(theta) * Math.sin(phi);
        positions[i + 2] = z + f * SH(l1, m1, theta, phi) * Math.cos(theta);
        // positions[i] = x + modulatedNormal.x * (lowFactor * lowharmonic + midFactor * midharmonic + highFactor * highharmonic);
        // positions[i + 1] = y + modulatedNormal.y * (lowFactor * lowharmonic + midFactor * midharmonic + highFactor * highharmonic);
        // positions[i + 2] = z + modulatedNormal.z * (lowFactor * lowharmonic + midFactor * midharmonic + highFactor * highharmonic);
    }

    mesh.geometry.attributes.position.needsUpdate = true
    mesh.geometry.computeVertexNormals()
}

const cachedSH = {}; // memorization to speed up the process of computing SH values
const cachedLegendrePolynomials = {}; // memorization to speed up the process of computing LegendrePolynomials

function K(l, m) {
    var temp = ((2.0 * l + 1.0) * factorial(l - m)) / (4.0 * Math.PI * factorial(l + m));   // Here, you can use a precomputed table for factorials
    return (temp) ** 0.5;
}


function P(l, m, cosTheta) {
    // TODO: consier quantize cosTheta if performance is an issue

    if (cachedLegendrePolynomials[l] && cachedLegendrePolynomials[l][m] && cachedLegendrePolynomials[l][m][cosTheta] !== undefined) {
        return cachedLegendrePolynomials[l][m][cosTheta];
    }
    else {
        var pmm = 1.0;

        if (m > 0) {
            var somx2 = ((1.0 - cosTheta) * (1.0 + cosTheta)) ** 0.5;
            var fact = 1.0;
            for (var iter = 1; iter <= m; iter++) {
                pmm *= (-fact) * somx2;
                fact += 2.0;
            }
        }

        if (l == m) {
            return pmm;
        }

        var pmmp1 = cosTheta * (2.0 * m + 1.0) * pmm;

        if (l == m + 1) {
            return pmmp1;
        }

        var pll = 0.0;
        for (var ll = m + 2; ll <= l; ll++) {
            pll = ((2.0 * ll - 1.0) * cosTheta * pmmp1 - (ll + m - 1.0) * pmm) / (ll - m);
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

    cachedSH[key] = result;
    return result;
}

function factorial(n, r = 1) {
    while (n > 0) r *= n--;
    return r;
}