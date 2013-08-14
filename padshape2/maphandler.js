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

  var drillpads = new OpenLayers.Layer.Vector("Drill pads");
  drillpads.id = "drillpads";

  map.addLayers([drillpads]);

  drillpads.mod = new OpenLayers.Control.DrawFeature(drillpads, OpenLayers.Handler.Polygon);
  map.addControls([
    new OpenLayers.Control.Navigation(),
    new OpenLayers.Control.Attribution(),
    new OpenLayers.Control.PanZoomBar(),
    drillpads.mod
  ]);
  drillpads.mod.activate();

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

  var center = new OpenLayers.LonLat(info.position);

  var bboxradius = 2500;

  map.getLayer('drillpads').removeAllFeatures();

  bbox = new OpenLayers.Bounds();
  bbox.extend(OpenLayers.Util.destinationVincenty(center, 0, bboxradius));
  bbox.extend(OpenLayers.Util.destinationVincenty(center, 90, bboxradius));
  bbox.extend(OpenLayers.Util.destinationVincenty(center, 180, bboxradius));
  bbox.extend(OpenLayers.Util.destinationVincenty(center, 270, bboxradius));

  var bbox = bbox.transform(
    new OpenLayers.Projection("EPSG:4326"),
    map.getProjection());

  map.zoomToExtent(bbox);
}

function getTaskData() {
  var geojson = new OpenLayers.Format.GeoJSON();
  var drillpads = map.getLayer('drillpads');
  drillpads.mod.deactivate();
  var res = {shape: JSON.parse(geojson.write(drillpads.features[0].geometry))};
  drillpads.mod.activate();
  return res;
}
