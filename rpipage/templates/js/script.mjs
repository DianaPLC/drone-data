/**
 * Portions of this code are based on the the Adafruit 3D Model Viewer demo at
 * https://github.com/adafruit/Adafruit_WebSerial_3DModelViewer
 * At time of writing, there is no specific license associated with that code.
 * 
 * Specific sections based on the demo are noted with comments in-line.
 */


'use strict';

import * as THREE from 'three';
import {OBJLoader} from 'objloader';

let orDecoder;
let gpsDecoder;
let orReader;
let gpsReader;

let orientation = {"roll": 0, "pitch": 0, "yaw": 0};
let gpsData = {"lat": 0, "lon": 0, "alt": 0, "climb": 0, "track": 0, "status": 0, "time": 0, "speed": 0}

// Start of code closely based on Adafruit demo
const maxLogLength = 100;
const log = document.getElementById('log');
const canvas = document.querySelector('#canvas');
// End of code closely based on Adafruit demo

const roll = document.getElementById("roll");
const pitch = document.getElementById("pitch");
const yaw = document.getElementById("yaw");
const alt = document.getElementById("alt");
const lat = document.getElementById("lat");
const lon = document.getElementById("lon");
const speed = document.getElementById("speed");
const climb = document.getElementById("climb");
const status = document.getElementById("status");

const elLookup = {
  roll: roll,
  pitch: pitch,
  yaw: yaw,
  alt: alt,
  lat: lat,
  lon: lon,
  speed: speed,
  climb: climb,
  status: status
}

// Start of code closely based on Adafruit demo
fitToContainer(canvas);

function fitToContainer(canvas){
  // Make it visually fill the positioned parent
  canvas.style.width ='100%';
  canvas.style.height='100%';
  // ...then set the internal size to match
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
// End of code closely based on Adafruit demo

document.addEventListener('DOMContentLoaded', async () => {
  await finishDrawing();
  log.innerHTML = "";
  connect("/serial_stream", orReader, orDecoder, false);
  connect("/gps_stream", gpsReader, gpsDecoder, true);
  await render();
});

async function connect(path, reader, decoder, isGps) {
  fetch(path, {
    headers: {
      "Content-Type": "application/json",
    }
  }).then((response) => response.body)
    .then((rb) => {
      reader = rb.getReader();
      decoder = new TextDecoder();
      readLoop(reader, decoder, isGps)
        .catch(async function(error) {
          console.log(error);
        });
    })
}

async function readLoop(reader, decoder, isGps) {
  while (true) {
    const {value, done} = await reader.read();
    if (value) {
      var line = decoder.decode(value).split("}")[0] + "}";
      try {
        logData(line);
        if (isGps) {
          gpsData = JSON.parse(line);
          updateData(gpsData);
        } else {
          orientation = JSON.parse(line);
          updateData(orientation);
        }
      } catch {
        console.log("skipping malformed line: " + line);
      }
    }
    if (done) {
      console.log('[readLoop] DONE', done);
      reader.releaseLock();
      break;
    }
  }
}

function updateData(newData) {
  for (const [key, value] of Object.entries(newData)) {
    try {
      elLookup[key].innerHTML = value;
    } catch (error) {
      console.log(key)
      console.log(error)
    }
  }
}

// ALL REMAINING CODE IN FILE is closely based on Adafruit demo
function logData(line) {
  let d = new Date();
  let timestamp = d.getHours() + ":" + `${d.getMinutes()}`.padStart(2, 0) + ":" +
      `${d.getSeconds()}`.padStart(2, 0) + "." + `${d.getMilliseconds()}`.padStart(3, 0);
  log.innerHTML += '<span class="timestamp">' + timestamp + ' -> </span>';
  d = null;
  log.innerHTML += line+ "<br>";

  // Remove old log content
  if (log.textContent.split("\n").length > maxLogLength + 1) {
    let logLines = log.innerHTML.replace(/(\n)/gm, "").split("<br>");
    log.innerHTML = logLines.splice(-maxLogLength).join("<br>\n");
  }

  log.scrollTop = log.scrollHeight
}

async function finishDrawing() {
  return new Promise(requestAnimationFrame);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let drone;

const renderer = new THREE.WebGLRenderer({canvas: canvas, alpha: true, antialias: true});
renderer.setClearColor(0x000000, 0);

const camera = new THREE.PerspectiveCamera(45, canvas.width/canvas.height, 0.1, 4000);
camera.position.set(0, 100, 2000);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xB1E1FF);
{
  const skyColor = 0xB1E1FF;  // light blue
  const groundColor = 0x32a852;  // green
  const intensity = 0.5;
  const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
  scene.add(light);
}

{
  const color = 0xFFFFFF;
  const intensity = 1;
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(0, 10, 0);
  light.target.position.set(-5, 0, 0);
  scene.add(light);
  scene.add(light.target);
}

let light = new THREE.DirectionalLight(0xffffff, 0.5);
light.position.set(3, 5, 8);
scene.add(light, new THREE.AmbientLight(0xffffff, 0.5));

let ground = new THREE.Mesh(
  new THREE.PlaneGeometry(12000, 12000).rotateX(-Math.PI * 0.5).translate(0,-800,0),
  new THREE.MeshBasicMaterial({color: new THREE.Color(0x32a852).multiplyScalar(1.5)})
);
scene.add(ground);

{
  const objLoader = new OBJLoader();
  objLoader.load("{{ url_for('static', filename='assets/drone.obj') }}", (root) => {
    drone = root;
    scene.add(root);
  });
}

function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

async function render() {
  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  if (drone != undefined) {

    let rotationEuler = new THREE.Euler(
      THREE.MathUtils.degToRad(orientation.pitch),
      THREE.MathUtils.degToRad(orientation.yaw-180),
      THREE.MathUtils.degToRad(-orientation.roll),
      'YZX'
    );
    drone.setRotationFromEuler(rotationEuler);
  }
  renderer.render(scene, camera);
  await sleep(10); // Allow 10ms for UI updates
  await finishDrawing();
  await render();
}
