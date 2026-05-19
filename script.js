const statusEl = document.getElementById("status");
const distanceEl = document.getElementById("distance");
const bearingEl = document.getElementById("bearing");
const headingEl = document.getElementById("heading");
const arrowEl = document.getElementById("arrow");

const addressInput = document.getElementById("addressInput");
const goButton = document.getElementById("goButton");
const sensorButton = document.getElementById("sensorButton");

let userLat = null;
let userLon = null;

let targetLat = null;
let targetLon = null;

let currentHeading = 0;
let targetBearing = 0;

navigator.geolocation.watchPosition(
  (pos) => {
    userLat = pos.coords.latitude;
    userLon = pos.coords.longitude;

    updateDirection();
  },
  (err) => {
    statusEl.textContent = "GPS error: " + err.message;
  },
  {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 10000,
  }
);

sensorButton.addEventListener("click", async () => {
  try {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      const permission = await DeviceOrientationEvent.requestPermission();

      if (permission !== "granted") {
        statusEl.textContent = "Compass permission denied";
        return;
      }
    }

    window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    window.addEventListener("deviceorientation", handleOrientation, true);

    statusEl.textContent = "Compass enabled";

  } catch (e) {
    statusEl.textContent = "Compass error";
  }
});

function handleOrientation(event) {
  let heading;

  if (event.webkitCompassHeading !== undefined) {
    heading = event.webkitCompassHeading;
  }
  else if (event.alpha !== null) {
    heading = 360 - event.alpha;
  }

  if (heading !== undefined) {
    currentHeading = heading;

    headingEl.textContent = `Phone heading: ${heading.toFixed(1)}°`;

    updateArrow();
  }
}

goButton.addEventListener("click", async () => {
  const query = addressInput.value.trim();

  if (!query) return;

  statusEl.textContent = "Searching...";

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.length) {
      statusEl.textContent = "Address not found";
      return;
    }

    targetLat = parseFloat(data[0].lat);
    targetLon = parseFloat(data[0].lon);

    statusEl.textContent = data[0].display_name;

    updateDirection();

  } catch (e) {
    statusEl.textContent = "Search failed";
  }
});

function updateDirection() {
  if (
    userLat === null ||
    userLon === null ||
    targetLat === null ||
    targetLon === null
  ) {
    return;
  }

  targetBearing = calculateBearing(
    userLat,
    userLon,
    targetLat,
    targetLon
  );

  const distance = calculateDistance(
    userLat,
    userLon,
    targetLat,
    targetLon
  );

  bearingEl.textContent = `Target bearing: ${targetBearing.toFixed(1)}°`;

  distanceEl.textContent = `Distance: ${(distance / 1000).toFixed(2)} km`;

  updateArrow();
}

function updateArrow() {
  const relativeAngle = targetBearing - currentHeading;

  arrowEl.style.transform = `rotate(${relativeAngle}deg)`;
}

function toRad(deg) {
  return deg * Math.PI / 180;
}

function toDeg(rad) {
  return rad * 180 / Math.PI;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);

  const λ1 = toRad(lon1);
  const λ2 = toRad(lon2);

  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);

  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);

  let θ = toDeg(Math.atan2(y, x));

  return (θ + 360) % 360;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);

  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
