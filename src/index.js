import * as faceapi from 'face-api.js';

let video = document.getElementById('video');
Promise.all([
    faceapi.loadSsdMobilenetv1Model('./models'),
    faceapi.loadFaceLandmarkModel('./models'),
    faceapi.loadFaceRecognitionModel('./models'),
    faceapi.loadFaceExpressionModel('./models')
]).then(startVideo)

function startVideo() {
    navigator.getUserMedia(
        { video: {} },
        stream => video.srcObject = stream,
        err => console.error(err)
    )
}

video.addEventListener('play', () => {
    execute();
})

let labeledFaceDescriptors;

async function execute() {
    let labels = ['caesar'];
    labeledFaceDescriptors = await Promise.all(
        labels.map(async label => {
            let imgUrl = `./reference_images/${label}`;
            // let img = await faceapi.fetchImage(imgUrl);
            let faceDescriptors = [];
            for (let i = 1; i <= 3; i++) {
                let img = await faceapi.fetchImage(imgUrl + `_${i}.jpg`);
                let fullFaceDescription = await faceapi.detectSingleFace(img).
                                                        withFaceLandmarks().
                                                        withFaceDescriptor();
                if (!fullFaceDescription) {
                    throw new Error(`No face detected for ${label}`);
                }
                faceDescriptors.push(fullFaceDescription.descriptor)
            }
            return new faceapi.LabeledFaceDescriptors(label, faceDescriptors);
        })
    )
    detectFace();
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
                                                                        // withFaceExpressions();
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
        // faceapi.draw.drawFaceExpressions(canvas, fullFaceDescriptions);
    }, 1000 * 1);
}
