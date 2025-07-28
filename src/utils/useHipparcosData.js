import { useEffect, useState } from "react";

export default function useHipparcosData() {
  const [stars, setStars] = useState([]);
  const [constellations, setConstellations] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const starsRes = await fetch("/data/hipparcos_catalog_6_ecliptic.json");
      const hipData = await starsRes.json();
      setStars(hipData);

      const constellationsRes = await fetch("/data/constellation_lines.json");
      const constellationData = await constellationsRes.json();
      setConstellations(constellationData);
    };

    fetchData();
  }, []);

  return { stars, constellations };
}
