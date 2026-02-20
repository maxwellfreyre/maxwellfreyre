// Close the welcome window when the button is clicked
document.getElementById("welcome-close").addEventListener("click", () => {
  document.getElementById("welcome-overlay").style.display = "none";
});


let directionsControl = null;
let lockedCategory = null;
let navigationActive = false;
let activePOIs = [];

/************************************************************
 * GLOBAL CONSTANTS
 ************************************************************/
mapboxgl.accessToken =
  "pk.eyJ1IjoibWF4d2VsbGZyZXlyZSIsImEiOiJjbWtjZ2tnanEwMHBpM2ZzOTMwNDg1c2lrIn0.dc7ZFGxZ4-WvoulrtczC8Q";

const MAP_CONTAINER = "map";
const MAP_STYLE = "mapbox://styles/maxwellfreyre/cmli85g0u002k01sk0zsd7fnh";
const INITIAL_CENTER = [-4.2812316, 55.86144386666667];
const INITIAL_ZOOM = 12;

const SUBWAY_LAYER = "final-stations-glasgow-subway";
const POI_LAYER = "final-poi-glasgow-subway";

const hoverPopup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false,
  className: "station-hover-popup"
});

const poiHoverPopup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false,
  className: "poi-hover-popup"
});

let selectedStationName = null;

/************************************************************
 * CATEGORY COLORS FOR DYNAMIC HIGHLIGHT
 ************************************************************/
const CATEGORY_COLORS = {
  "Shopping":  "#0078af",
  "Museum":    "#a39c6d",
  "Outdoors":  "#4f9761",
  "Sport":     "#877ab8",
  "Transport": "#346856",
  "Dining":    "#8c2b39",
  "Culture":   "#d5845f",
  "Religion":  "#7a7a7d"
};

/************************************************************
 * INITIALIZE MAP
 ************************************************************/
function initializeMap() {
  return new mapboxgl.Map({
    container: MAP_CONTAINER,
    style: MAP_STYLE,
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM
  });
}

/************************************************************
 * ADD GEOCODER
 ************************************************************/
function addGeocoder(map) {
  const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    marker: false,
    placeholder: "Search Station, POI, or Legend Category",

    localGeocoder: function(query) {
      const q = query.toLowerCase();
      let results = [];

      results = results.concat(
        window.searchableItems
          .filter(item => item.name.toLowerCase().includes(q))
          .map(item => ({
            center: item.coords,
            place_name: item.name,
            place_type: [item.type],
            geometry: {
              type: "Point",
              coordinates: item.coords
            }
          }))
      );

      const categoryMatches = window.searchableItems.filter(item =>
        item.category &&
        item.category.toLowerCase().includes(q)
      );

      categoryMatches.forEach(item => {
        results.push({
          center: item.coords,
          place_name: `${item.category}: ${item.name}`,
          place_type: ["category"],
          geometry: {
            type: "Point",
            coordinates: item.coords
          }
        });
      });

      return results;
    }
  });

  document.getElementById("header-search").appendChild(geocoder.onAdd(map));
}

/************************************************************
 * ADD MAP CONTROLS
 ************************************************************/
function addControls(map) {
  map.addControl(new mapboxgl.NavigationControl(), "top-right");

  map.addControl(
    new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    }),
    "top-right"
  );

  const scale = new mapboxgl.ScaleControl({
    maxWidth: 150,
    unit: "metric"
  });
  map.addControl(scale, "bottom-right");
}

/************************************************************
 * SUBWAY STATION INTERACTIONS
 ************************************************************/
function addStationInteractions(map, directionsControl) {

  // ⭐ Store original radius EXPRESSION
  const originalRadiusExpression = map.getPaintProperty(SUBWAY_LAYER, "circle-radius");

  map.on("mouseenter", SUBWAY_LAYER, (e) => {
    map.getCanvas().style.cursor = "pointer";

    const hoveredName = e.features[0].properties.DISTNAME;

    // ⭐ Expand ONLY the hovered station
    map.setPaintProperty(SUBWAY_LAYER, "circle-radius", [
      "case",
      ["==", ["get", "DISTNAME"], hoveredName],
      14,                        // expanded radius
      originalRadiusExpression   // normal radius
    ]);

    // Existing highlight logic
    map.setFilter("station-hover-highlight", [
      "==",
      "DISTNAME",
      hoveredName
    ]);

    const coords = e.features[0].geometry.coordinates;

    hoverPopup
      .setLngLat(coords)
      .setHTML(`<strong>${hoveredName}</strong>`)
      .addTo(map);
  });

  map.on("mouseleave", SUBWAY_LAYER, () => {
    map.getCanvas().style.cursor = "";

    // ⭐ Restore original radius expression
    map.setPaintProperty(SUBWAY_LAYER, "circle-radius", originalRadiusExpression);

    map.setFilter("station-hover-highlight", ["==", "DISTNAME", ""]);
    hoverPopup.remove();
  });

  map.on("click", SUBWAY_LAYER, (e) => {
    selectedStationName = e.features[0].properties.DISTNAME;
    const coords = e.features[0].geometry.coordinates;

    // ⭐ Reset navigation when selecting a new station
    directionsControl.removeRoutes();
    navigationActive = false;

    hoverPopup
      .setLngLat(coords)
      .setHTML(`<strong>${selectedStationName}</strong>`)
      .addTo(map);

    map.flyTo({
      center: coords,
      zoom: 15,
      speed: 0.8
    });

    directionsControl.setOrigin(coords);

    map.once("idle", () => {
      if (map.getLayer("directions-origin-label")) {
        map.setLayoutProperty("directions-origin-label", "text-field", "S");
        map.setPaintProperty("directions-origin-label", "text-color", "#ff6200");
        map.setPaintProperty("directions-origin-point", "circle-color", "#ffffff");
        map.setPaintProperty("directions-origin-point", "circle-stroke-color", "#ff6200");
        map.setPaintProperty("directions-origin-point", "circle-radius", 9);
        map.setPaintProperty("directions-origin-point", "circle-stroke-width", 3);
      }
    });

    const poiFeatures = map.queryRenderedFeatures({ layers: [POI_LAYER] });

    activePOIs = poiFeatures.filter(
      f => f.properties.Subway_Station === selectedStationName
    );

    activePOIs.forEach(f => {
      const poiCoords = f.geometry.coordinates;
      const poiName = f.properties.Place_Name;

      new mapboxgl.Popup({ offset: [0, -15], className: "poi-hover-popup" })
        .setLngLat(poiCoords)
        .setHTML(`<h3>${poiName}</h3>`)
        .addTo(map);
    });

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(coords);

    activePOIs.forEach(f => {
      bounds.extend(f.geometry.coordinates);
    });

    map.fitBounds(bounds, {
      padding: 90,
      maxZoom: 16,
      duration: 800
    });

  });
}

/************************************************************
 * POI INTERACTIONS
 ************************************************************/
function addPOIInteractions(map, directionsControl) {

  map.on("mouseenter", POI_LAYER, (e) => {
    map.getCanvas().style.cursor = "pointer";

    const coords = e.features[0].geometry.coordinates;
    const poiName = e.features[0].properties.Place_Name;

    poiHoverPopup
      .setLngLat(coords)
      .setHTML(`<h3>${poiName}</h3>`)
      .addTo(map);
  });

  map.on("mouseleave", POI_LAYER, () => {
    map.getCanvas().style.cursor = "";
    poiHoverPopup.remove();
  });

map.on("click", POI_LAYER, (e) => {

    const props = e.features[0].properties;

    // ⭐ ALWAYS extract the name first, before any branching
    const poiName = props.Place_Name;

    const poiStation = props.Subway_Station;
    const coords = e.features[0].geometry.coordinates;


    if (!window.lockedCategory && !selectedStationName) {
      const stationFeature = map
        .queryRenderedFeatures({ layers: [SUBWAY_LAYER] })
        .find(f => f.properties.DISTNAME === poiStation);

      if (!stationFeature) return;

      const stationCoords = stationFeature.geometry.coordinates;

      directionsControl.setOrigin(stationCoords);
      directionsControl.setDestination(coords);
      navigationActive = true;

      new mapboxgl.Popup({ offset: [0, -15], className: "poi-hover-popup" })
        .setLngLat(coords)
        .setHTML(`<h3>${poiName}</h3>`)
        .addTo(map);

      map.flyTo({
        center: coords,
        zoom: 16,
        speed: 0.8
      });

      return;
    }

    if (window.lockedCategory) {
      const stationFeature = map
        .queryRenderedFeatures({ layers: [SUBWAY_LAYER] })
        .find(f => f.properties.DISTNAME === poiStation);

      if (!stationFeature) return;

      const stationCoords = stationFeature.geometry.coordinates;
      directionsControl.setOrigin(stationCoords);

      directionsControl.setDestination(coords);
      navigationActive = true;

      new mapboxgl.Popup({
        offset: [0, -15],
        className: "poi-hover-popup"
      })
      .setLngLat(coords)
      .setHTML(`<h3>${selectedStationName}</h3>`)
      .addTo(map);

      map.flyTo({
        center: coords,
        zoom: 16,
        speed: 0.8
      });

      return;
    }

    if (poiStation !== selectedStationName) return;

    const isActive = activePOIs.some(
      f => f.properties.Place_Name === poiName
    );
    if (!isActive) return;

    const stationFeature = map
      .queryRenderedFeatures({ layers: [SUBWAY_LAYER] })
      .find(f => f.properties.DISTNAME === selectedStationName);

    if (!stationFeature) return;

    const stationCoords = stationFeature.geometry.coordinates;
    directionsControl.setOrigin(stationCoords);

    directionsControl.setDestination(coords);
    navigationActive = true;

    new mapboxgl.Popup({ offset: [0, -15], className: "poi-hover-popup" })
      .setLngLat(coords)
      .setHTML(`<h3>${poiName}</h3>`)
      .addTo(map);

    map.flyTo({
      center: coords,
      zoom: 16,
      speed: 0.8
    });
  });

}

/************************************************************
 * MAIN MAP LOAD HANDLER
 ************************************************************/
const map = initializeMap();

map.on("load", () => {

  const stations = map.queryRenderedFeatures({ layers: [SUBWAY_LAYER] });
  const pois = map.queryRenderedFeatures({ layers: [POI_LAYER] });

  window.searchableItems = [
    ...stations.map(f => ({
      name: f.properties.DISTNAME,
      coords: f.geometry.coordinates,
      type: "station"
    })),
    ...pois.map(f => ({
      name: f.properties.Place_Name,
      coords: f.geometry.coordinates,
      type: "poi",
      category: f.properties.Place_Type
    }))
  ];

  directionsControl = new MapboxDirections({
    accessToken: mapboxgl.accessToken,
    unit: "metric",
    profile: "mapbox/walking",
    alternatives: false,
    geometries: "geojson",
    interactive: false,
    controls: {
      inputs: false,
      instructions: true,
      profileSwitcher: false
    }
  });

  map.addControl(directionsControl, "top-left");

  // POI highlight layer
  map.addLayer({
    id: "poi-highlight",
    type: "circle",
    source: "composite",
    "source-layer": "FINAL_POI_GLASGOW_SUBWAY",
    paint: {
      "circle-radius": 10,
      "circle-stroke-width": 3,
      "circle-stroke-color": "#ff6200",
      "circle-color": "rgba(0,0,0,0)"
    },
    filter: ["==", "Place_Type", ""]
  }, POI_LAYER);

  /************************************************************
   * ⭐ FIXED SUBWAY HOVER HIGHLIGHT LAYER
   ************************************************************/
  const subwayLayer = map.getLayer(SUBWAY_LAYER);

  map.addLayer({
    id: "station-hover-highlight",
    type: "circle",
    source: subwayLayer.source,
    "source-layer": subwayLayer["source-layer"],
    paint: {
      "circle-radius": 10,
      "circle-color": "#ff6200",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2
    },
    filter: ["==", "DISTNAME", ""]
  }, SUBWAY_LAYER);

  directionsControl.on("route", () => {
    map.setPaintProperty("directions-route-line", "line-color", "#ffffff");
    map.setPaintProperty("directions-route-line", "line-width", 3);

    map.setPaintProperty("directions-route-line-casing", "line-color", "#000000");
    map.setPaintProperty("directions-route-line-casing", "line-width", 8);

    map.setPaintProperty("directions-origin-point", "circle-color", "#ffffff");
    map.setPaintProperty("directions-origin-point", "circle-stroke-color", "#ff6200");

    map.setPaintProperty("directions-destination-point", "circle-color", "#ff6200");
    map.setPaintProperty("directions-destination-point", "circle-stroke-color", "#ffffff");

    map.setLayoutProperty("directions-origin-label", "text-field", "S");
    map.setPaintProperty("directions-origin-label", "text-color", "#FF6200");
    map.setLayoutProperty("directions-destination-label", "text-field", "End");
  });

  map.on("click", (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: [SUBWAY_LAYER, POI_LAYER]
    });

    if (features.length > 0) return;

    directionsControl.removeRoutes();
    selectedStationName = null;
    activePOIs = [];
    navigationActive = false;

    window.lockedCategory = null;
    map.setFilter("poi-highlight", ["==", "Place_Type", ""]);
    map.setPaintProperty("poi-highlight", "circle-stroke-color", "#ff6200");
  });

  addGeocoder(map);
  addControls(map);
  addStationInteractions(map, directionsControl);
  addPOIInteractions(map, directionsControl);

  map.on("idle", () => { buildPOILegend(map); });

});

/************************************************************
 * LEGEND BUILDER
 ************************************************************/
function buildPOILegend(map) {
  const legend = document.getElementById("legend");
  legend.innerHTML = "";

  const CATEGORY_META = {
    "Shopping":  { color: "#0078af", symbol: "blue basket" },
    "Museum":    { color: "#a39c6d", symbol: "brown diamond" },
    "Outdoors":  { color: "#4f9761", symbol: "green triangle" },
    "Sport":     { color: "#877ab8", symbol: "purple circle" },
    "Transport": { color: "#346856", symbol: "dark green bus" },
    "Dining":    { color: "#8c2b39", symbol: "red cutlery" },
    "Culture":   { color: "#d5845f", symbol: "orange star" },
    "Religion":  { color: "#7a7a7d", symbol: "grey square" }
  };

  const CATEGORY_ORDER = [
    "Shopping",
    "Museum",
    "Outdoors",
    "Sport",
    "Transport",
    "Dining",
    "Culture",
    "Religion"
  ];

  const allFeatures = map.querySourceFeatures("composite", {
    sourceLayer: "FINAL_POI_GLASGOW_SUBWAY"
  });

  const visibleFeatures = map.queryRenderedFeatures({
    layers: [POI_LAYER]
  });

  const visibleCategories = new Set(
    visibleFeatures.map(f => f.properties.Place_Type)
  );

  const tabsContainer = document.createElement("div");
  tabsContainer.className = "legend-tabs";

  CATEGORY_ORDER.forEach(type => {
    const meta = CATEGORY_META[type];

    const tab = document.createElement("div");
    tab.className = "legend-tab";
    tab.style.backgroundColor = meta.color;
    tab.innerHTML = `${type}`;

    const tooltip = document.createElement("div");
    tooltip.className = "legend-tab-tooltip";
    tooltip.innerText = `${meta.symbol}`;
    tab.appendChild(tooltip);

    if (!visibleCategories.has(type)) {
      tab.classList.add("faded");
    }

    // HOVER
    tab.addEventListener("mouseenter", () => {
      if (window.lockedCategory) return;
      map.setFilter("poi-highlight", ["==", "Place_Type", type]);
      map.setPaintProperty("poi-highlight", "circle-stroke-color", CATEGORY_COLORS[type]);
    });

    // LEAVE
    tab.addEventListener("mouseleave", () => {
      if (window.lockedCategory) return;
      map.setFilter("poi-highlight", ["==", "Place_Type", ""]);
      map.setPaintProperty("poi-highlight", "circle-stroke-color", "#ff6200");
    });

    // CLICK
    tab.addEventListener("click", () => {
      if (window.lockedCategory === type) {
        window.lockedCategory = null;
        map.setFilter("poi-highlight", ["==", "Place_Type", ""]);
        map.setPaintProperty("poi-highlight", "circle-stroke-color", "#ff6200");

        document.querySelectorAll(".legend-tab").forEach(t =>
          t.classList.remove("active")
        );

        return;
      }

      window.lockedCategory = type;
      map.setFilter("poi-highlight", ["==", "Place_Type", type]);
      map.setPaintProperty("poi-highlight", "circle-stroke-color", CATEGORY_COLORS[type]);

      document.querySelectorAll(".legend-tab").forEach(t =>
        t.classList.remove("active")
      );
      tab.classList.add("active");
    });

    tabsContainer.appendChild(tab);
  });

  legend.appendChild(tabsContainer);
}
// HELP TAB LOGIC — original working version
const welcomeOverlay = document.getElementById("welcome-overlay");
const welcomeClose = document.getElementById("welcome-close");
const helpTab = document.getElementById("help-tab");

// When "Start Exploring" is clicked
welcomeClose.addEventListener("click", () => {
  welcomeOverlay.style.display = "none";
  helpTab.style.display = "block";   // show Help tab
});

// When "Help" is clicked
helpTab.addEventListener("click", () => {
  welcomeOverlay.style.display = "flex";  // reopen welcome box
  helpTab.style.display = "none";         // hide Help tab again
});