import * as faceapi from 'face-api.js';

let video = document.getElementById('video');
let startButton = document.getElementById('startBtn');
let labels = [];

Promise.all([
    faceapi.loadSsdMobilenetv1Model('./models'),
    faceapi.loadFaceLandmarkModel('./models'),
    faceapi.loadFaceRecognitionModel('./models'),
    faceapi.loadFaceExpressionModel('./models')
]).then(setupVideo)

video.addEventListener('play', () => {
    detectFace();
})

startButton.addEventListener('click', () => {
    video.play();
})

function setupVideo() {
    navigator.getUserMedia(
        { video: {} },
        stream => video.srcObject = stream,
        err => console.error(err)
    )
    setupReference();
}

let labeledFaceDescriptors;

async function setupReference() {
    if (labels.size > 1) {
        labeledFaceDescriptors = await Promise.all(
            labels.map(async label => {
                let imgUrl = `./reference_images/${label}.jpg`;
                let faceDescriptors = [];
                let img = await faceapi.fetchImage(imgUr);
                let fullFaceDescription = await faceapi.detectSingleFace(img).
                                                        withFaceLandmarks().
                                                        withFaceDescriptor();
                if (!fullFaceDescription) {
                    throw new Error(`No face detected for ${label}`);
                }
                faceDescriptors.push(fullFaceDescription.descriptor)
                startButton.disabled = false;
                return new faceapi.LabeledFaceDescriptors(label, faceDescriptors);
            })
        )
    } else {
        alert('No data available')
    }
}

function detectFace() {
    let canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);
    let displaySize = {
        width: video.width,
        height: video.height
    }
    faceapi.matchDimensions(canvas, displaySize);
    setInterval(async () => {
        let fullFaceDescriptions = await faceapi.detectAllFaces(video).withFaceLandmarks().
                                                                        withFaceDescriptors();
        fullFaceDescriptions = faceapi.resizeResults(fullFaceDescriptions, displaySize);
        let ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let maxDescriptorDistance = 0.6;
        let faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, maxDescriptorDistance);
        let results = fullFaceDescriptions.map(fd => faceMatcher.findBestMatch(fd.descriptor));

        results.forEach((bestMatch, i) => {
            let box = fullFaceDescriptions[i].detection.box;
            let text = bestMatch.toString();
            let drawBox = new faceapi.draw.DrawBox(box, { label: text });
            drawBox.draw(canvas);
        })
    }, 1000 * 1);
}
