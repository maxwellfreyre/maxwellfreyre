mapboxgl.accessToken = "pk.eyJ1IjoibWF4d2VsbGZyZXlyZSIsImEiOiJjbWtjZ2tnanEwMHBpM2ZzOTMwNDg1c2lrIn0.dc7ZFGxZ4-WvoulrtczC8Q";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/maxwellfreyre/cmkmn8fqi002u01sda7dyghos",
  center: [-4.2518, 55.8642],   // longitude, latitude
  zoom: 10.5                     // adjust as needed
});


map.on("mousemove", (event) => {const dzone = map.queryRenderedFeatures(event.point, {
  layers: ["lab2-4u1bp5"]
});
document.getElementById("pd").innerHTML = dzone.length
?`<h3>${dzone[0].properties.DZName}</h3>
       <p>Rank: <strong>${dzone[0].properties.Percentv2}</strong> %</p>`
    : `<p>Hover over a data zone for specifications.</p>`;
 map.getSource("hover").setData({
 type: "FeatureCollection",
 features: dzone.map(function (f) {
 return { type: "Feature", geometry: f.geometry };
 })
 });
});

map.on("load", () => {
const layers = [
 "<10",
 "20 ",
 "30 ",
 "40 ",
 "50 ",
 "60 ",
 "70 ",
 "80 ",
 "90 ",
 "100"
 ];
 const colors = [
 "#a50026",
 "#d73027",
 "#f46d43",
 "#fdae61",
 "#fee090",
 "#e0f3f8",
 "#abd9e9",
 "#74add1",
 "#4575b4",
 "#313695"
 ];
 // create legend
 const legend = document.getElementById("legend");
layers.forEach((layer, i) => {
 const color = colors[i];
const key = document.createElement("div");
//place holder
  if (i <= 1 || i >= 8) {
 key.style.color = "white";
 }
 key.className = "legend-key";
 key.style.backgroundColor = color;
 key.innerHTML = `${layer}`;
 legend.appendChild(key);
 });
   map.addSource("hover", {
 type: "geojson",
 data: { type: "FeatureCollection", features: [] }
 });
 map.addLayer({
 id: "dz-hover",
 type: "line",
 source: "hover",
 layout: {},
 paint: {
 "line-color": "lime green",
 "line-width": 3.5
}
});
})
 
map.addControl(new mapboxgl.NavigationControl(), "top-left");

map.addControl(
 new mapboxgl.GeolocateControl({
 positionOptions: {
 enableHighAccuracy: true
 },
 trackUserLocation: true,
 showUserHeading: true
 }),
 "top-left"
);

const geocoder = new MapboxGeocoder({
 // Initialize the geocoder
 accessToken: mapboxgl.accessToken, // Set the access token
 mapboxgl: mapboxgl, // Set the mapbox-gl instance
 marker: false, // Do not use the default marker style
 placeholder: "Search for places in Glasgow", // Placeholder text for the search bar
 proximity: {
 longitude: 55.8642,
 latitude: 4.2518
 } // Coordinates of Glasgow center
});
map.addControl(geocoder, "top-left");

