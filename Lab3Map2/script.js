// The value for 'accessToken' begins with 'pk...'
mapboxgl.accessToken = "pk.eyJ1IjoibWF4d2VsbGZyZXlyZSIsImEiOiJjbWtjZ2tnanEwMHBpM2ZzOTMwNDg1c2lrIn0.dc7ZFGxZ4-WvoulrtczC8Q";
const style_2024 = "mapbox://styles/maxwellfreyre/cmkwk31hq000l01r48lghchh8";
const style_2025 = "mapbox://styles/maxwellfreyre/cmkwku55c000p01qx6q02480s";

const map = new mapboxgl.Map({
 container: "map", // container ID
 style: style_2025,
 center: [-0.089932, 51.514441],
 zoom: 14
});

const layerList = document.getElementById("menu");
const inputs = layerList.getElementsByTagName("input");
//On click the radio button, toggle the style of the map.
for (const input of inputs) {
 input.onclick = (layer) => {
 if (layer.target.id == "style_2025") {
 map.setStyle(style_2025);
 }
 if (layer.target.id == "style_2024") {
 map.setStyle(style_2024);
 }
 };
}