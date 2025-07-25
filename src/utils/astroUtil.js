import { planetposition, solar } from "astronomia";
import * as THREE from "three";
import earthData from "astronomia/data/vsop87Bearth";
import { moonposition } from "astronomia";

//scales earth distance to 15 screen units from sun
const SCALE = 400;
const KM_TO_AU = 1 / 149597870.7;

// Convert RA/Dec/r to Cartesian (flips x and y to align with our coordinate system)
function sphericalToCartesian(lon, lat, range) {
  const x = range * Math.cos(lat) * Math.cos(lon);
  const y = range * Math.cos(lat) * Math.sin(lon);
  const z = range * Math.sin(lat);
  return [x, y, z];
}

// Get Earth's position for Julian date
function getEarthPositionJD(jd) {
  const earth = new planetposition.Planet(earthData);
  const coords = earth.position2000(jd); // {lon, lat, range (AU)}
  return sphericalToCartesian(coords.lon, coords.lat, coords.range).map(n => n * SCALE);
}

function getSublunarLatLon(jd) {
  // Get Moon's geocentric apparent position (lon, lat in ecliptic coords)
  const moonEcl = moonposition.position(jd); // { lon, lat, range }
  const rangeAU = moonEcl.range * KM_TO_AU * 3000;

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

export {
  sphericalToCartesian,
  getEarthPositionJD,
  getSublunarLatLon,
  latLonToVector3,
  getSubsolarLatLon,
  getGMST
};
