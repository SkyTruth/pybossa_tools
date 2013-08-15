var map;

drawStyle = 'new';

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
  var guide = new OpenLayers.Layer.Vector("Guide");
  guide.id = "guide";

  map.addLayers([guide, drillpads]);

  if (drawStyle == 'new')
    drillpads.mod = new OpenLayers.Control.DrawFeature(drillpads, OpenLayers.Handler.Polygon);
  else
    drillpads.mod = new OpenLayers.Control.ModifyFeature(drillpads);
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

function clearData () {
  var drillpads = map.getLayer('drillpads');

  drillpads.mod.deactivate();
  drillpads.removeAllFeatures();
  drillpads.mod.activate();

  if (drawStyle == 'new') return;
  
  var info = drillpads.taskinfo;

  var center = new OpenLayers.LonLat(info.position);

  var bbox = new OpenLayers.Bounds();
  var radius = 250;

  bbox.extend(OpenLayers.Util.destinationVincenty(center, 0, radius));
  bbox.extend(OpenLayers.Util.destinationVincenty(center, 90, radius));
  bbox.extend(OpenLayers.Util.destinationVincenty(center, 180, radius));
  bbox.extend(OpenLayers.Util.destinationVincenty(center, 270, radius));

  var feature = new OpenLayers.Feature.Vector(
    bbox.toGeometry(),
    null,
    {
      strokeColor: "#ff0000",
      strokeWidth: 3,
      fillOpacity: 0.1,
      fillColor: "#ff0000"
    }
  );
  drillpads.addFeatures([feature]);
  drillpads.mod.selectFeature(feature);
}

function updateMap(info) {
  map.getLayer('drillpads').taskinfo = info;

  if (map.getLayer('imagery')) map.removeLayer(map.getLayer('imagery'));
  var imagery = new OpenLayers.Layer.WMS(
    "Imagery",
    info.url,
    info.options);
  imagery.id = 'imagery';
  map.addLayer(imagery);
  map.setLayerIndex(imagery, 0);
  map.setBaseLayer(imagery);

  clearData();

  var center = new OpenLayers.LonLat(info.position);

  if (drawStyle == 'new') {
    var radius = Math.abs(center.lon - OpenLayers.Util.destinationVincenty(center, 90, 250).lon);
    var guide = map.getLayer('guide');
    guide.removeAllFeatures();

    guide.addFeatures([new OpenLayers.Feature.Vector(
      OpenLayers.Geometry.Polygon.createRegularPolygon(new OpenLayers.Geometry.Point(center.lon, center.lat), radius, 20, 0),
      null,
      {
        strokeColor: "#000000",
        strokeWidth: 3,
        strokeOpacity: 0.5,
        fillOpacity: 0.1,
        fillColor: "#000000"
      }
    )]);
  }

  var bboxradius = 500;
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
