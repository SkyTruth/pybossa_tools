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

  var markers = new OpenLayers.Layer.Markers("Drill pads");
  markers.id = "drillpads";
  var guide = new OpenLayers.Layer.Vector("Guide");
  guide.id = "guide";

  map.addLayers([guide, markers]);

  map.addControls([
    new OpenLayers.Control.Navigation(),
    new OpenLayers.Control.Attribution(),
    new OpenLayers.Control.PanZoomBar()
  ]);

  map.zoomToMaxExtent();

  map.events.register("click", map, function(e) {
    var size = new OpenLayers.Size(33,33);
    var offset = new OpenLayers.Pixel(-(size.w/2), -(size.h/2));
    var marker = new OpenLayers.Marker(
      map.getLonLatFromPixel(e.xy),
      new OpenLayers.Icon('http://alerts.skytruth.org/markers/red-x.png', size, offset)
    );
    map.getLayer('drillpads').addMarker(marker);

    marker.events.register('click', {marker: marker}, function(evt) {
      map.getLayer('drillpads').removeMarker(this.marker);
      this.marker.destroy();
    });
  });
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
  var bbox = OpenLayers.Bounds.fromString(info.bbox);
  var mapbbox = bbox.transform(
    new OpenLayers.Projection("EPSG:4326"),
    map.getProjection());

  map.getLayer('drillpads').clearMarkers();

  map.getLayer('guide').removeAllFeatures();
  map.getLayer('guide').addFeatures([
    new OpenLayers.Feature.Vector(
      mapbbox.toGeometry(),
      null,
      {
        strokeColor: "#ff0000",
        strokeWidth: 3,
        fillOpacity: 0.1,
        fillColor: "#ff0000"
      }
    )
  ]);

  map.zoomToExtent(mapbbox.scale(1.1));

  $("#site_county").html(info.county || "");
  $("#site_state").html(info.state || "");
  $("#site_year").html(info.year || "");
  $("#site_lat").html(info.latitude);
  $("#site_lon").html(info.longitude);
  $("#site_id").html(info.SiteID);
}

function getMapPositions() {
  return map.getLayer('drillpads').markers.map(function (marker) {
    return marker.lonlat;
  });
}

$(document).ready(function () {
  function cookieToExpander() {
    var body = $(".expander-body");
    var control = $(".expander-control i");
    if ($.cookie('taskmanager_expander') != "collapsed") {
      control.addClass("icon-minus-sign");
      control.removeClass("icon-plus-sign");
      body.show();
    } else {
      control.removeClass("icon-minus-sign");
      control.addClass("icon-plus-sign");
      body.hide();
    }
  }
  $(".expander-control").click(function (ev) {
    var expanded = $.cookie('taskmanager_expander') == "expanded";
    $.cookie('taskmanager_expander', expanded ? "collapsed" : "expanded");
    cookieToExpander();
  });
  cookieToExpander();
});