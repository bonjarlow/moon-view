import { planetposition, solar } from "astronomia";
import * as THREE from "three";
import earthData from "astronomia/data/vsop87Bearth";

//scales earth distance to 15 screen units from sun
const SCALE = 15;

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
  const coords = earth.position2000(jd);
  return sphericalToCartesian(coords.lon, coords.lat, coords.range).map(n => n * SCALE);
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
  latLonToVector3,
  getSubsolarLatLon,
  getGMST
};
