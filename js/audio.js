import { audio } from "./setup.js"

const spectrumOutputElement = document.getElementById("eqoutput")

let audioContext, audioSrc, audioAnalyzer

// prep the audio stuff and return data array
export async function initializeAudioBuffer() {
    // wait until user interaction. Fuck you chrome
    // await new Promise((resolve, _) => {
    //     window.addEventListener("click", function oneshot() {
    //         window.removeEventListener("click", oneshot)
    //         resolve()
    //     })
    // })

    audioContext = new AudioContext();
    audioSrc = audioContext.createMediaElementSource(audio);
    audioAnalyzer = audioContext.createAnalyser();

    audioSrc.connect(audioAnalyzer);
    audioAnalyzer.connect(audioContext.destination);
    audioAnalyzer.fftSize = 1024;
    const bufferLength = audioAnalyzer.frequencyBinCount;
    return new Uint8Array(bufferLength)
}

export function updateAudioBuffer(buffer) {
    audioAnalyzer.getByteFrequencyData(buffer)
}

// for the power spectrum visualization
export function updateSpectrumBars(buffer) {
    let output = '';
    for (let i = 0; i < buffer.length; i++) {
        const frequency = Math.min(1, buffer[i] / 255);
        output += '='.repeat(frequency * 1000 * ((i ** 1.1 + 50) / 255)) + '<br/>';
    }

    spectrumOutputElement.innerHTML = output;
}