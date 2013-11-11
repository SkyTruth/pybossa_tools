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
App.prototype.loadMapCreateMap = function() {
  var app = this;
  app.map = new OpenLayers.Map({
      div: "map",
      controls: [],
  });
}
App.prototype.loadMapAddLayers = function() {
  var app = this;

  app.layers.osm = new OpenLayers.Layer.OSM();
  app.map.addLayer(app.layers.osm);

  app.layers.gmap = new OpenLayers.Layer.Google("Satellite", {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22});
  app.map.addLayer(app.layers.gmap);

  BaseOpenlayersApp.prototype.loadMapAddLayers.call(this);

  app.layers.drillpads = new OpenLayers.Layer.Vector("Drill pads", {displayInLayerSwitcher: false});
  app.layers.drillpads.id = "drillpads";
  app.map.addLayer(app.layers.drillpads);

  app.map.setBaseLayer(app.layers.osm);
}
App.prototype.loadMapAddControls = function() {
  var app = this;
  BaseOpenlayersApp.prototype.loadMapAddControls.call(this);

  app.map.addControl(new OpenLayers.Control.LayerSwitcher());

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

App.prototype.loadImagery = function() {
  var app = this;
  if (app.map.getLayer('imagery')) app.map.removeLayer(app.map.getLayer('imagery'));
  var imagery = new OpenLayers.Layer.Image(
    'imagery',
    app.info.url,
    OpenLayers.Bounds.fromString(app.info.bbox),
    new OpenLayers.Size(app.info.width, app.info.height),
    {
      opacity: 1.0, 
      isBaseLayer: false,
      numZoomLevels: 20,
      alwaysInRange: true
    }
  );
  app.map.addLayer(imagery);
  app.map.setLayerIndex(imagery, 1);
}

App.prototype.loadGuide = function() {
  var app = this;

  if (app.drawStyle == 'new') {
    var bbox = OpenLayers.Bounds.fromString(app.info.bbox);
    var center = bbox.getCenterLonLat();

    var guide = app.map.getLayer('guide');
    guide.removeAllFeatures();

    var p1 = new OpenLayers.LonLat(center.lon, center.lat).transform(
      app.map.getProjectionObject(),
      new OpenLayers.Projection("EPSG:4326"));
    var p2 = p1.add(0, 1.0 / 1852 / 60);
    p1 = p1.transform(new OpenLayers.Projection("EPSG:4326"), app.map.getProjectionObject());
    p2 = p2.transform(new OpenLayers.Projection("EPSG:4326"), app.map.getProjectionObject());
    var oneMeter = p2.lat - p1.lat;

    guide.addFeatures([new OpenLayers.Feature.Vector(
      OpenLayers.Geometry.Polygon.createRegularPolygon(new OpenLayers.Geometry.Point(center.lon, center.lat), 125 * oneMeter, 20, 0),
      null,
      {
        strokeColor: "#000000",
        strokeWidth: 3,
        strokeOpacity: 0.5,
        fillOpacity: 0,
        fillColor: "#000000"
      }
    )]);

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
