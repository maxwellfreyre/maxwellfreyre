// The value for 'accessToken' begins with 'pk...'
mapboxgl.accessToken =
  "pk.eyJ1IjoibWF4d2VsbGZyZXlyZSIsImEiOiJjbWtjZ2tnanEwMHBpM2ZzOTMwNDg1c2lrIn0.dc7ZFGxZ4-WvoulrtczC8Q";

//Before map
const beforeMap = new mapboxgl.Map({
  container: "before",
  style: "mapbox://styles/maxwellfreyre/cmkwk31hq000l01r48lghchh8",
  center: [-0.09, 51.514],
  zoom: 13.75
});
//After map
const afterMap = new mapboxgl.Map({
  container: "after",
  style: "mapbox://styles/maxwellfreyre/cmkwku55c000p01qx6q02480s",
  center: [-0.09, 51.514],
  zoom: 13.75
});

const container = "#comparison-container";
const map = new mapboxgl.Compare(beforeMap, afterMap, container, {});