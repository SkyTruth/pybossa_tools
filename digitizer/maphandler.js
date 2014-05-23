CricketFrogApp = App = function() {
  BaseOpenlayersApp.apply(this, arguments);
};
App.prototype = new BaseOpenlayersApp();
App.prototype.init = function (cb) {
  BaseOpenlayersApp.prototype.init.call(this, function (err, app) {
    if (cb) cb(err, app);
  });
}

App.prototype.drawStyle = 'new';

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

  app.layers.drillpads.mod.deactivate();
  app.layers.drillpads.removeAllFeatures();
  app.layers.drillpads.mod.activate();

  if (app.drawStyle != 'new') {
    var feature = new OpenLayers.Feature.Vector(
      app.getTaskBounds().toGeometry(),
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

App.prototype.loadGuide = function() {
  var app = this;
  var guide = app.map.getLayer('guide');
  guide.removeAllFeatures();

  if (app.drawStyle == 'new') {
    app.loadGuideCircle();
  }
}

App.prototype.getAnswer = function(cb, isDone) {
  var app = this;
  var drillpads = app.map.getLayer('drillpads');
  if (!app.answer) app.answer = {};
  if ((isDone || app.answer.selection == "done") && drillpads.features.length > 0) {
    var geojson = new OpenLayers.Format.GeoJSON();
    drillpads.mod.deactivate();
    app.answer.shapes = drillpads.features.map(function(feature) {
      return JSON.parse(geojson.write(feature.geometry));
    });
    drillpads.mod.activate();
  }
  cb(app.answer);
}

App.prototype.updateMap = function(info) {
  if (!info.size) info.size = 125;
  BaseOpenlayersApp.prototype.updateMap.call(this, info);
}
