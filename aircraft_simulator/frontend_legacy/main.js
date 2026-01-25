import * as THREE from "three";

// --- Websocket ---
let ws = null;
let connected = false;

function setConnStatus(ok) {
  const el = document.getElementById("connStatus");
  if (ok) {
    el.textContent = "CONNECTED";
    el.classList.add("ok");
    el.classList.remove("bad");
  } else {
    el.textContent = "DISCONNECTED";
    el.classList.remove("ok");
    el.classList.add("bad");
  }
}

function wsUrl() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws`;
}

function send(obj) {
  if (ws && connected) ws.send(JSON.stringify(obj));
}

// --- Three.js: simple aircraft proxy (no external model) ---
const container = document.getElementById("threeContainer");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1220);

const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 2000);
camera.position.set(0, 6, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio || 1);
container.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(10, 20, 10);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

// horizon grid
const grid = new THREE.GridHelper(200, 40, 0x223055, 0x223055);
grid.position.y = -2;
scene.add(grid);

// aircraft proxy: fuselage + wing
const aircraft = new THREE.Group();
const fus = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.35, 3.2, 6, 14),
  new THREE.MeshStandardMaterial({ color: 0x5eead4, metalness: 0.2, roughness: 0.25 })
);
fus.rotation.z = Math.PI / 2;
aircraft.add(fus);

const wing = new THREE.Mesh(
  new THREE.BoxGeometry(5.0, 0.12, 1.0),
  new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.1, roughness: 0.35 })
);
wing.position.set(0, 0, 0);
aircraft.add(wing);

const tail = new THREE.Mesh(
  new THREE.BoxGeometry(1.4, 0.1, 0.6),
  new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.1, roughness: 0.35 })
);
tail.position.set(-1.8, 0, 0);
aircraft.add(tail);

scene.add(aircraft);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

function setAttitude(phi, theta, psi) {
  // Map NED aircraft Euler to Three.js:
  // We'll treat aircraft local axes: +X forward, +Y up, +Z out of screen (right-handed).
  // Our sim uses body z down, so invert pitch/roll accordingly for visualization feel.
  aircraft.rotation.set(-theta, -psi, -phi, "XYZ");
}

// --- Charts ---
const maxPoints = 240;

function makeChart(canvasId, label, color) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{ label, data: [], borderColor: color, borderWidth: 2, pointRadius: 0, tension: 0.2 }],
    },
    options: {
      animation: false,
      responsive: true,
      plugins: { legend: { labels: { color: "rgba(255,255,255,0.8)" } } },
      scales: {
        x: { ticks: { color: "rgba(255,255,255,0.55)" }, grid: { color: "rgba(255,255,255,0.06)" } },
        y: { ticks: { color: "rgba(255,255,255,0.55)" }, grid: { color: "rgba(255,255,255,0.06)" } },
      },
    },
  });
}

const chartAlt = makeChart("chartAlt", "Altitude (m)", "#60a5fa");
const chartV = makeChart("chartV", "Airspeed (m/s)", "#34d399");
const chartHdg = makeChart("chartHdg", "Heading (deg)", "#fbbf24");

function pushPoint(chart, t, y) {
  chart.data.labels.push(t.toFixed(2));
  chart.data.datasets[0].data.push(y);
  if (chart.data.labels.length > maxPoints) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update("none");
}

function setHud(t, alt, V, hdgDeg) {
  document.getElementById("hud_t").textContent = t.toFixed(2);
  document.getElementById("hud_alt").textContent = alt.toFixed(0);
  document.getElementById("hud_v").textContent = V.toFixed(1);
  document.getElementById("hud_hdg").textContent = hdgDeg.toFixed(0);
}

// --- UI bindings ---
document.getElementById("btnConnect").onclick = () => {
  if (ws) ws.close();
  ws = new WebSocket(wsUrl());
  ws.onopen = () => {
    connected = true;
    setConnStatus(true);
  };
  ws.onclose = () => {
    connected = false;
    setConnStatus(false);
  };
  ws.onmessage = (ev) => {
    const pkt = JSON.parse(ev.data);
    const t = pkt.t;
    const truth = pkt.truth;
    const meas = pkt.meas;

    const alt = truth.altitude_m;
    const V = meas.airspeed_mps ?? 0.0;
    const hdgDeg = (truth.psi * 180) / Math.PI;

    setAttitude(truth.phi, truth.theta, truth.psi);
    setHud(t, alt, V, hdgDeg);

    pushPoint(chartAlt, t, alt);
    pushPoint(chartV, t, V);
    pushPoint(chartHdg, t, ((hdgDeg % 360) + 360) % 360);
  };
};

document.getElementById("btnDisconnect").onclick = () => {
  if (ws) ws.close();
};

document.getElementById("apEnabled").onchange = (e) => {
  send({ type: "set_autopilot", enabled: e.target.checked });
};

document.getElementById("btnSetTargets").onclick = () => {
  const V = parseFloat(document.getElementById("tgtV").value);
  const alt = parseFloat(document.getElementById("tgtAlt").value);
  const hdg_deg = parseFloat(document.getElementById("tgtHdg").value);
  send({ type: "set_targets", V, alt, hdg_deg });
};

document.getElementById("btnSetWind").onclick = () => {
  const n = parseFloat(document.getElementById("windN").value);
  const e = parseFloat(document.getElementById("windE").value);
  const d = parseFloat(document.getElementById("windD").value);
  send({ type: "set_wind", n, e, d });
};

setConnStatus(false);



