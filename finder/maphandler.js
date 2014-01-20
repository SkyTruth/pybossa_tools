TouchClick = function () {}
TouchClick.prototype.maxdistance = 3;
TouchClick.prototype.init = function (events, cb) {
  var lt = this;
  lt.events = events;
  lt.xy = null;
  lt.distance = 0;

  lt.events.register('touchstart', lt, function(e) {
    lt.e = e;
    if (lt.e.touches.length > 1) return;
    lt.xy = [lt.e.touches[0].clientX, lt.e.touches[0].clientY];
  }, true);
  lt.events.register('touchmove', lt, function(e) {
    var xy = [e.touches[0].clientX, e.touches[0].clientY];
    lt.distance = Math.max(lt.distance, Math.abs(xy[0] - lt.xy[0]));
    lt.distance = Math.max(lt.distance, Math.abs(xy[1] - lt.xy[1]));
  });
  lt.events.register('touchend', lt, function(e) {
    if (e.touches.length > 0) {
      var xy = [e.touches[0].clientX, e.touches[0].clientY];
      lt.distance = Math.max(lt.distance, Math.abs(xy[0] - lt.xy[0]));
      lt.distance = Math.max(lt.distance, Math.abs(xy[1] - lt.xy[1]));
    }

    if (lt.distance < lt.maxdistance) {
      lt.events.triggerEvent("click", lt.e);
    }
  });
  if (cb) cb(null, lt);
}

RanaArvalisApp = App = function() {
  BaseOpenlayersApp.apply(this, arguments);
};
App.prototype = new BaseOpenlayersApp();
App.prototype.init = function (cb) {
  BaseOpenlayersApp.prototype.init.call(this, function (err, app) {

    cb(err, app);
  });
}

App.prototype.loadMapAddLayers = function() {
  BaseOpenlayersApp.prototype.loadMapAddLayers.apply(this, arguments);
  var app = this;

  var markers = new OpenLayers.Layer.Markers("Drill pads");
  markers.id = "drillpads";
  app.map.addLayers([markers]);
}

App.prototype.longtouchTimeout = 750;
App.prototype.loadMapAddControls = function () {
  BaseOpenlayersApp.prototype.loadMapAddControls.apply(this, arguments);
  var app = this;

  app.map.events.register("click", app, function (e) { return app.mapClick(e); });
  new TouchClick().init(app.map.events);
}

App.prototype.mapClick = function(e) {
  var app = this;

  var size = new OpenLayers.Size(33,33);
  var offset = new OpenLayers.Pixel(-(size.w/2), -(size.h/2));
  var marker = new OpenLayers.Marker(
    app.map.getLonLatFromPixel(e.xy),
    new OpenLayers.Icon('http://alerts.skytruth.org/markers/red-x.png', size, offset)
  );
  app.map.getLayer('drillpads').addMarker(marker);

  marker.events.register('click', {marker: marker}, function(evt) {
    app.map.getLayer('drillpads').removeMarker(this.marker);
    this.marker.destroy();
  });
  new TouchClick().init(marker.events);
}

App.prototype.clearData = function() {
  var app = this;

  app.map.getLayer('drillpads').clearMarkers();

  BaseOpenlayersApp.prototype.clearData.call(app);
}

App.prototype.guideStyle = {
  strokeColor: "#ff0000",
  strokeWidth: 3,
  fillOpacity: 0.1,
  fillColor: "#ff0000"
};

App.prototype.loadGuide = function() {
  var app = this;
  var guide = app.map.getLayer('guide');

  var bbox = OpenLayers.Bounds.fromString(app.task.data.info.bbox);
  var mapbbox = bbox.transform(
    app.taskProjection,
    app.map.getProjection());

  app.map.getLayer('guide').removeAllFeatures();
  app.map.getLayer('guide').addFeatures([
    new OpenLayers.Feature.Vector(
      mapbbox.toGeometry(),
      null,
      app.guideStyle
    )
  ]);
}

App.prototype.getAnswer = function() {
  var app = this;
  return {
    "positions": app.map.getLayer('drillpads').markers.map(function (marker) {
      return marker.lonlat;
    }),
    "done": {
      "positions": app.map.getLayer('drillpads').markers.length
    }
  };
}
