CricketFrogApp = App = function() {
  BaseOpenlayersApp.apply(this, arguments);
};
App.prototype = new BaseOpenlayersApp();
App.prototype.init = function () {
  BaseOpenlayersApp.prototype.init.apply(this, arguments);
  var app = this;
  return app;
}

App.prototype.drawStyle = 'new';
App.prototype.useMapUnderlayes = true;
// When using OpenLayers.Layer.Image the task projection must be the
// same as the map projection, which comes from Google Maps if using
// map underlays...
App.prototype.taskProjection = new OpenLayers.Projection("EPSG:900913");

App.prototype.loadMapAddLayers = function() {
  var app = this;

  BaseOpenlayersApp.prototype.loadMapAddLayers.call(this);

  app.layers.drillpads = new OpenLayers.Layer.Vector("Drill pads", {displayInLayerSwitcher: false});
  app.layers.drillpads.id = "drillpads";
  app.map.addLayer(app.layers.drillpads);

  app.map.setBaseLayer(app.layers.osm);
}
App.prototype.loadMapAddControls = function() {
  var app = this;
  BaseOpenlayersApp.prototype.loadMapAddControls.call(this);

  if (app.drawStyle == 'new')
    app.layers.drillpads.mod = new OpenLayers.Control.DrawFeature(app.layers.drillpads, OpenLayers.Handler.Polygon);
  else
    app.layers.drillpads.mod = new OpenLayers.Control.ModifyFeature(app.layers.drillpads);
  app.map.addControl(app.layers.drillpads.mod);
  app.layers.drillpads.mod.activate();
}

App.prototype.clearData = function() {
  var app = this;

  var drillpads = app.map.getLayer('drillpads');
  var bbox = OpenLayers.Bounds.fromString(app.info.bbox);
  var center = bbox.getCenterLonLat();

  app.layers.drillpads.mod.deactivate();
  app.layers.drillpads.removeAllFeatures();
  app.layers.drillpads.mod.activate();

  if (app.drawStyle != 'new') {
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
    app.layers.drillpads.addFeatures([feature]);
    app.layers.drillpads.mod.selectFeature(feature);
  }

  BaseOpenlayersApp.prototype.clearData.call(app);
}

App.prototype.getTaskBounds = function() {
  var app = this;
  return OpenLayers.Bounds.fromString(app.info.bbox);
}

App.prototype.loadImagery = BaseOpenlayersApp.prototype.loadImageryIMG;

App.prototype.loadGuide = function() {
  var app = this;
  var guide = app.map.getLayer('guide');
  guide.removeAllFeatures();

  if (app.drawStyle == 'new') {
    app.loadGuideCircle();
  }
}

App.prototype.getAnswer = function() {
  var app = this;
  var geojson = new OpenLayers.Format.GeoJSON();
  var drillpads = app.map.getLayer('drillpads');
  drillpads.mod.deactivate();
  if (app.answer.selection == "done" && drillpads.features.length > 0) {
    app.answer.shape = JSON.parse(geojson.write(drillpads.features[0].geometry));
  }
  drillpads.mod.activate();
  return app.answer;
}

App.prototype.updateMap = function(info) {
  if (!info.size) info.size = 125;
  BaseOpenlayersApp.prototype.updateMap.call(this, info);
}
