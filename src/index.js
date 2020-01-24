import * as faceapi from 'face-api.js';

let video = document.getElementById('video');
let startButton = document.getElementById('startBtn');
let enterData = document.getElementById('enterData');
let labeledFaceDescriptors;
let labels = ['caesar'];

document.addEventListener('DOMContentLoaded', function(event) {
    setupVideo();
    Promise.all([
        faceapi.loadSsdMobilenetv1Model('./models'),
        faceapi.loadFaceLandmarkModel('./models'),
        faceapi.loadFaceRecognitionModel('./models'),
        faceapi.loadFaceExpressionModel('./models')
    ]).then(() => {
        console.log('Models loaded!');
        startButton.disabled = false;
        // enterData.disabled = false;
    })
})

enterData.addEventListener('click', () => {
    video.play();
    takeSnap();
})

// video.addEventListener('play', () => {
// })

startButton.addEventListener('click', () => {
    setupReference();
})

function setupVideo() {
    navigator.getUserMedia(
        { video: {} },
        stream => video.srcObject = stream,
        err => console.error(err)
    )
}

function takeSnap() {
    let intervalCount = 0;
    let snapTimer = setInterval(() => {
        let detectFace = faceapi.detectSingleFace(video);
        if (detectFace) {
            intervalCount++;
            console.log(intervalCount);
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            downloadImage(canvas, intervalCount)
            if (intervalCount >= 5) {
                console.log('Done!');
                clearInterval(snapTimer);
            }
        } else {
            intervalCount = 0;
        }
    }, 1000 * 3)
}

function downloadImage(canvas, count) {
    let downloadLink = document.createElement('a');
    downloadLink.setAttribute('download', `caesar_${count}.jpg`);
    let dataURL = canvas.toDataURL('image/jpeg');
    let url = dataURL.replace(/^data:image\/jpg/,'data:application/octet-stream');
    downloadLink.setAttribute('href', url);
    downloadLink.click();
}

async function setupReference() {
    if (labels.length > 0) {
        labeledFaceDescriptors = await Promise.all(
            labels.map(async label => {
                let imgUrl = `./reference_images/${label}_1.jpg`;
                let faceDescriptors = [];
                let img = await faceapi.fetchImage(imgUrl);
                let fullFaceDescription = await faceapi.detectSingleFace(img).
                                                        withFaceLandmarks().
                                                        withFaceDescriptor();
                if (!fullFaceDescription) {
                    throw new Error(`No face detected for ${label}`);
                }
                faceDescriptors.push(fullFaceDescription.descriptor)
                video.play();
                return new faceapi.LabeledFaceDescriptors(label, faceDescriptors);
            })
        )
        detectFace();
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

        let maxDescriptorDistance = 0.55;
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
