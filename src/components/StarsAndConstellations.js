import { useMemo } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import * as astro from "../utils/astroUtil";

function StarsAndConstellations({ stars, constellations }) {
  const starSCALE = 100000;

  const starMeshes = useMemo(() => {
    const positions = [];
    const sizes = [];
    const colors = [];

    stars.forEach(star => {
      const [x, y, z] = star.ecl_cartesian.map(coord => coord * starSCALE);
      positions.push(x, y, z);

      const size = THREE.MathUtils.clamp(10 - star.Vmag, 1, 4);
      sizes.push(size);

      const color = astro.bvToRGB(star["B-V"]);
      colors.push(color.r, color.g, color.b);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('starColor', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      vertexColors: true,
      vertexShader: `
        attribute float size;
        attribute vec3 starColor;
        varying vec3 vColor;
        void main() {
          vColor = starColor;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          gl_FragColor = vec4(vColor, 1.0);
        }
      `,
      transparent: true,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });

    return <points geometry={geometry} material={material} />;
  }, [stars]);

  const constellationLines = useMemo(() => {
    const lines = [];

    Object.entries(constellations).forEach(([name, segments]) => {
      segments.forEach(segment => {
        const positions = [];

        segment.forEach(hip => {
          const star = stars.find(s => s.hip === hip);
          if (star?.ecl_cartesian) {
            const [x, y, z] = star.ecl_cartesian.map(v => v * starSCALE);
            positions.push(x, y, z);
          }
        });

        if (positions.length >= 6) {
          const geometry = new LineGeometry();
          geometry.setPositions(positions);

          const material = new LineMaterial({
            color: 0x87ceeb, // skyblue
            linewidth: 1, // in world units (not pixels!)
            transparent: true,
            opacity: 0.8,
            depthTest: true,
          });

          const line = new Line2(geometry, material);
          line.computeLineDistances();
          line.scale.set(1, 1, 1);
          lines.push(<primitive key={`${name}-${segment.join("-")}`} object={line} />);
        }
      });
    });

    return lines;
  }, [stars, constellations]);

  return (
    <>
      {starMeshes}
      {constellationLines}
    </>
  );
}

export default StarsAndConstellations;
