import { planetposition, solar } from "astronomia";
import * as THREE from "three";
import earthData from "astronomia/data/vsop87Bearth";
import { moonposition } from "astronomia";

//if Earth orbits at 1 AU, has radius of unit 1 in onscreen units then
//scales earth distance to 27,000 screen units from sun
//const SCALE = 27000;
//onst SCALE = 500;

// Convert RA/Dec/r to Cartesian (flips x and y to align with our coordinate system)
function sphericalToCartesian(lon, lat, range) {
  const x = range * Math.cos(lat) * Math.cos(lon);
  const y = range * Math.cos(lat) * Math.sin(lon);
  const z = range * Math.sin(lat);
  return [x, y, z];
}

// Get Earth's position for Julian date
function getEarthPositionJD(jd, SCALE) {
  const earth = new planetposition.Planet(earthData);
  const coords = earth.position2000(jd); // {lon, lat, range (AU)}
  return sphericalToCartesian(coords.lon, coords.lat, coords.range).map(n => n * SCALE);
}

function getSublunarLatLon(jd) {
  // Get Moon's geocentric apparent position (lon, lat in ecliptic coords)
  const moonEcl = moonposition.position(jd); // { lon, lat, range (km) }
  const rangeAU = moonEcl.range / 6371;

  // Convert ecliptic to equatorial coordinates
  const ε = 23.43928 * (Math.PI / 180); // obliquity of the ecliptic in radians
  const λ = moonEcl.lon;
  const β = moonEcl.lat;

  // Equatorial coordinates (right ascension and declination)
  const sinDec = Math.sin(β) * Math.cos(ε) + Math.cos(β) * Math.sin(ε) * Math.sin(λ);
  const dec = Math.asin(sinDec); // δ

  const y = Math.sin(λ) * Math.cos(ε) - Math.tan(β) * Math.sin(ε);
  const x = Math.cos(λ);
  const ra = Math.atan2(y, x); // α

  // Normalize RA to [0, 2π]
  const raNormalized = (ra + 2 * Math.PI) % (2 * Math.PI);

  // Get Greenwich Mean Sidereal Time (GMST) in radians
  const gmst = getGMST(jd); // radians

  // Longitude of sublunar point = GMST - RA
  let lon = gmst - raNormalized;

  // Normalize to [-π, π]
  lon = ((lon + Math.PI) % (2 * Math.PI)) - Math.PI;

  return {
    lat: dec, // declination ≈ sublunar latitude
    lon,      // computed sublunar longitude
    rangeAU
  };
}

function getGMST(jd) {
  // Julian centuries since J2000.0
  const T = (jd - 2451545.0) / 36525.0;

  // GMST in seconds (IAU 1982 convention)
  const gmstSeconds =
    67310.54841 +
    (876600 * 3600 + 8640184.812866) * T +
    0.093104 * T * T -
    6.2e-6 * T * T * T;

  // Convert seconds to degrees
  const gmstDeg = (gmstSeconds / 240.0) % 360;
  // Normalize and convert to radians
  return THREE.MathUtils.degToRad((gmstDeg + 360) % 360);
}

function getSubsolarLatLon(jd) {
  const sunEq = solar.apparentEquatorial(jd); // { ra (rad), dec (rad) }
  const gmst = getGMST(jd); // in radians

  const subsolarLat = sunEq.dec;

  // Subsolar longitude = GMST - RA (in radians)
  let subsolarLon = gmst - sunEq.ra;

  // Normalize longitude to [-π, π]
  subsolarLon = (subsolarLon % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

  return {
    subsolarLat: subsolarLat, // radians
    subsolarLon: subsolarLon  // radians
  };
}

function latLonToVector3(lat, lon, radius = 1) {
  const phi = (90 - THREE.MathUtils.radToDeg(lat)) * (Math.PI / 180); // latitude to polar
  const theta = (180 - THREE.MathUtils.radToDeg(lon)) * (Math.PI / 180); // longitude to azimuth

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y =  radius * Math.cos(phi);
  const z =  radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

function bvToRGB(bv) {
  bv = Math.max(-0.4, Math.min(2.0, bv));
  let r = 1, g = 1, b = 1;

  if (bv < 0.0) {
    r = 0.64; g = 0.79; b = 1.00;
  } else if (bv < 0.4) {
    const t = (bv + 0.4) / 0.8;
    r = 0.70 + 0.30 * t;
    g = 0.70 + 0.15 * t;
    b = 1.00;
  } else if (bv < 1.5) {
    const t = (bv - 0.4) / 1.1;
    r = 1.00;
    g = 0.85 - 0.30 * t;
    b = 1.00 - 0.70 * t;
  } else {
    r = 1.00; g = 0.50; b = 0.30;
  }

  return new THREE.Color(r, g, b);
}

function computeEarthQuat(jdNow, earthPos) {
  const textureFixQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    Math.PI / 2
  );
  const tiltQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    THREE.MathUtils.degToRad(-23.44)
  );
  const baseQuat = textureFixQuat.clone().multiply(tiltQuat);
  const spinAxisWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(baseQuat).normalize();

  const subsolar = getSubsolarLatLon(jdNow);
  const subsolarLocal = latLonToVector3(subsolar.subsolarLat, subsolar.subsolarLon).normalize();
  const subsolarWorld = subsolarLocal.clone().applyQuaternion(baseQuat);

  const sunDir = new THREE.Vector3(...earthPos).normalize().negate();
  const projectedSubsolar = subsolarWorld.clone().projectOnPlane(spinAxisWorld).normalize();
  const projectedSun = sunDir.clone().projectOnPlane(spinAxisWorld).normalize();

  let spinAngle = projectedSubsolar.angleTo(projectedSun);
  const cross = projectedSubsolar.clone().cross(projectedSun);
  if (cross.dot(spinAxisWorld) < 0) spinAngle = -spinAngle;

  const spinQuat = new THREE.Quaternion().setFromAxisAngle(spinAxisWorld, spinAngle);
  return spinQuat.multiply(baseQuat);
}

export {
  computeEarthQuat,
  sphericalToCartesian,
  getEarthPositionJD,
  getSublunarLatLon,
  latLonToVector3,
  getSubsolarLatLon,
  getGMST,
  bvToRGB
};
