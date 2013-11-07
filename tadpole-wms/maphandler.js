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
  app.answer = undefined;
  app.info = info;
  if (map.getLayer('imagery')) map.removeLayer(map.getLayer('imagery'));
  var imagery = new OpenLayers.Layer.WMS(
    "Imagery",
    info.url,
    info.options);
  imagery.id = 'imagery';
  map.addLayer(imagery);
  map.setLayerIndex(imagery, 0);
  map.setBaseLayer(imagery);

  var guide = map.getLayer('guide');
  guide.removeAllFeatures();

  var p1 = new OpenLayers.LonLat(info.longitude, info.latitude).transform(
    map.getProjectionObject(),
    new OpenLayers.Projection("EPSG:4326"));
  var p2 = p1.add(0, 1.0 / 1852 / 60);
  p1 = p1.transform(new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject());
  p2 = p2.transform(new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject());
  var oneMeter = p2.lat - p1.lat;

  var center = new OpenLayers.Geometry.Point(info.longitude, info.latitude);

  var style = {
    strokeColor: "#000000",
    strokeWidth: 3,
    strokeOpacity: 0.5,
    fillOpacity: 0,
    fillColor: "#000000"
  };

  guide.addFeatures([
    new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.LineString([
        new OpenLayers.Geometry.Point(info.longitude - info.size * oneMeter, info.latitude),
        new OpenLayers.Geometry.Point(info.longitude + info.size * oneMeter, info.latitude)]),
      null, style),
    new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.LineString([
        new OpenLayers.Geometry.Point(info.longitude, info.latitude - info.size * oneMeter),
        new OpenLayers.Geometry.Point(info.longitude, info.latitude + info.size * oneMeter)]),
      null, style)]);

  var circleGeom = OpenLayers.Geometry.Polygon.createRegularPolygon(center, info.size * oneMeter, 20, 0);
  var circle = new OpenLayers.Feature.Vector(
    circleGeom,
    null,
    style
  );
  guide.addFeatures([circle]);

  map.zoomToExtent(circleGeom.getBounds().scale(1.2));
  $("#site_county").html(info.county || "");
  $("#site_state").html(info.state || "");
  $("#site_year").html(info.year || "");
  $("#site_lat").html(info.latitude);
  $("#site_lon").html(info.longitude);
  $("#site_id").html(info.SiteID);
}

function cookieToExpander() {
  var body = $(".expander-body");
  var control = $(".expander-control i");
  if ($.cookie('taskmanager_expander') == "expanded") {
    control.addClass("icon-minus-sign");
    control.removeClass("icon-plus-sign");
    body.show();
  } else {
    control.removeClass("icon-minus-sign");
    control.addClass("icon-plus-sign");
    body.hide();
  }
}

function getAnswer() {
  return app.answer;
}

$(document).ready(function () {
  $(".expander-control").click(function (ev) {
    var expanded = $.cookie('taskmanager_expander') == "expanded";
    $.cookie('taskmanager_expander', expanded ? "collapsed" : "expanded");
    cookieToExpander();
  });
  cookieToExpander();
  $('.btn-answer').on('click', function(evt) {
    app.answer = {"type": evt.target.value};
    app.report_answer();
  });
});
