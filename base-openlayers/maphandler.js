BaseOpenlayersApp = App = function() {
  var app = this;
  app.map = undefined;
  app.mapIsLoaded = false;
}

App.prototype.init = function () {
  var app = this;
  $(".expander-control").click(function (ev) {
    var expanded = $.cookie('taskmanager_expander') == "expanded";
    $.cookie('taskmanager_expander', expanded ? "collapsed" : "expanded");
    app.cookieToExpander();
  });
  app.cookieToExpander();
  $('.btn-answer').on('click', function(evt) {
    app.answer = {"selection": evt.target.value};
    app.page.reportAnswer();
  });
  $('.btn-cancel').on('click', function(evt) {
    app.clearData();
  });
  return app;
}

App.prototype.loadMap = function() {
  var app = this;
  if (app.mapIsLoaded) return;

  app.loadMapCreateMap();
  app.layers = {};
  app.loadMapAddLayers();
  app.loadMapAddControls();

  app.map.zoomToMaxExtent();
  app.mapIsLoaded = true;
}

App.prototype.loadMapCreateMap = function() {
  var app = this;
  app.map = new OpenLayers.Map({
      div: "map",
      allOverlays: true,
      fractionalZoom: true,
      controls: [],
      minScale: 442943842,
      maxScale: 135
  });
}
App.prototype.loadMapAddLayers = function() {
  var app = this;
  app.layers.guide = new OpenLayers.Layer.Vector("Guide");
  app.layers.guide.id = "guide";
  app.map.addLayer(app.layers.guide);
}
App.prototype.loadMapAddControls = function() {
  var app = this;
  app.map.addControls([
    new OpenLayers.Control.Navigation(),
    new OpenLayers.Control.Attribution(),
    new OpenLayers.Control.PanZoomBar()
  ]);
}

App.prototype.setProgress = function(data) {
  var pct = Math.round((data.done*100)/data.total);
  $("#progress").css("width", pct.toString() +"%");
  $("#progress").attr("title", pct.toString() + "% completed!");
  $("#progress").tooltip({'placement': 'left'}); 
  $("#total").text(data.total);
  $("#done").text(data.done);
}

App.prototype.clearData = function() {
  var app = this;
  app.map.zoomToExtent(app.getTaskBounds());
}

App.prototype.getTaskBounds = function() {
  return this.taskBounds;
}

App.prototype.loadImagery = function() {
  var app = this;
  if (app.map.getLayer('imagery')) app.map.removeLayer(app.map.getLayer('imagery'));
  var imagery = new OpenLayers.Layer.WMS(
    "Imagery",
    app.info.url,
    app.info.options);
  imagery.id = 'imagery';
  app.map.addLayer(imagery);
  app.map.setLayerIndex(imagery, 0);
  app.map.setBaseLayer(imagery);
}

App.prototype.loadGuide = function() {
  var app = this;
  var guide = app.map.getLayer('guide');
  guide.removeAllFeatures();

  var p1 = new OpenLayers.LonLat(app.info.longitude, app.info.latitude).transform(
    app.map.getProjectionObject(),
    new OpenLayers.Projection("EPSG:4326"));
  var p2 = p1.add(0, 1.0 / 1852 / 60);
  p1 = p1.transform(new OpenLayers.Projection("EPSG:4326"), app.map.getProjectionObject());
  p2 = p2.transform(new OpenLayers.Projection("EPSG:4326"), app.map.getProjectionObject());
  var oneMeter = p2.lat - p1.lat;

  var center = new OpenLayers.Geometry.Point(app.info.longitude, app.info.latitude);

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
        new OpenLayers.Geometry.Point(app.info.longitude - app.info.size * oneMeter, app.info.latitude),
        new OpenLayers.Geometry.Point(app.info.longitude + app.info.size * oneMeter, app.info.latitude)]),
      null, style),
    new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.LineString([
        new OpenLayers.Geometry.Point(app.info.longitude, app.info.latitude - app.info.size * oneMeter),
        new OpenLayers.Geometry.Point(app.info.longitude, app.info.latitude + app.info.size * oneMeter)]),
      null, style)]);

  var circleGeom = OpenLayers.Geometry.Polygon.createRegularPolygon(center, app.info.size * oneMeter, 20, 0);
  var circle = new OpenLayers.Feature.Vector(
    circleGeom,
    null,
    style
  );
  guide.addFeatures([circle]);
  app.taskBounds = circleGeom.getBounds().scale(1.2);
}

App.prototype.updateMap = function(info) {
  var app = this;
  app.answer = undefined;
  app.info = info;

  app.loadImagery();
  app.loadGuide();
  app.clearData();

  $("#site_county").html(app.info.county || "");
  $("#site_state").html(app.info.state || "");
  $("#site_year").html(app.info.year || "");
  $("#site_lat").html(app.info.latitude);
  $("#site_lon").html(app.info.longitude);
  $("#site_id").html(app.info.SiteID);
}

App.prototype.cookieToExpander = function() {
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

App.prototype.getAnswer = function() {
  return this.answer;
}

$(document).ready(function () {
});


GenericPage = Page = function () {
};
Page.prototype.init = function (app) {
  var page = this;
  page.app = app;
  app.page = page;

  return page;
};
Page.prototype.reportAnswer = function () {
  // This should be overridden by a real page...
  console.log(page.app.getAnswer());
};