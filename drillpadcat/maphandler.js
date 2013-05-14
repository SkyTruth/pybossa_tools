var map;

function loadMap() {
  map = new OpenLayers.Map({
      div: "map",
      allOverlays: true,
      fractionalZoom: true,
      controls: [],
      minScale: 442943842,
      maxScale: 135
  });

  var guide = new OpenLayers.Layer.Vector("Guide");
  guide.id = "guide";

  map.addLayer(guide);

  map.addControls([
    new OpenLayers.Control.Navigation(),
    new OpenLayers.Control.Attribution(),
    new OpenLayers.Control.PanZoomBar()
  ]);

  map.zoomToMaxExtent();
}

function setProgress(data) {
  var pct = Math.round((data.done*100)/data.total);
  $("#progress").css("width", pct.toString() +"%");
  $("#progress").attr("title", pct.toString() + "% completed!");
  $("#progress").tooltip({'placement': 'left'}); 
  $("#total").text(data.total);
  $("#done").text(data.done);
}

function updateMap(info) {
  if (map.getLayer('imagery')) map.removeLayer(map.getLayer('imagery'));
  var imagery = new OpenLayers.Layer.WMS(
    "Imagery",
    info.url,
    info.options);
  imagery.id = 'imagery';
  map.addLayer(imagery);
  map.setLayerIndex(imagery, 0);
  map.setBaseLayer(imagery);
  var bbox = OpenLayers.Bounds.fromString(info.bbox).transform(
    new OpenLayers.Projection("EPSG:4326"),
    map.getProjection());

  map.getLayer('guide').removeAllFeatures();
  map.getLayer('guide').addFeatures([
    new OpenLayers.Feature.Vector(
      bbox.toGeometry(),
      null,
      {
        strokeColor: "#ff0000",
        strokeWidth: 3,
        fillOpacity: 0.1,
        fillColor: "#ff0000"
      }
    )
  ]);

  map.zoomToExtent(bbox);
}
