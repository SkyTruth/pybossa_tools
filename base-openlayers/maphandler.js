AppKeyboardDefaults = OpenLayers.Class(OpenLayers.Control.KeyboardDefaults, {
  defaultKeyPress: function (evt) {
    var size, handled = true;

    var target = OpenLayers.Event.element(evt);
    if (target  &&
        (target.tagName == 'INPUT' ||
         target.tagName == 'TEXTAREA' ||
         target.tagName == 'SELECT')) {
        return;
    }
    switch (evt.keyCode) {
      case "W".charCodeAt():
        this.map.pan(0, -this.slideFactor);
        break;
      case "S".charCodeAt():
        this.map.pan(0, this.slideFactor);
        break;
      case "A".charCodeAt():
        this.map.pan(-this.slideFactor, 0);
        break;
      case "D".charCodeAt():
        this.map.pan(this.slideFactor, 0);
        break;
      default:
        OpenLayers.Control.KeyboardDefaults.prototype.defaultKeyPress.apply(this, arguments);
        handled = false;
    }
    if (handled) {
      // prevent browser default not to move the page
      // when moving the page with the keyboard
      OpenLayers.Event.stop(evt);
    }
  },
  CLASS_NAME: "OpenLayers.Control.AppKeyboardDefaults"
});


BaseOpenlayersApp = App = function() {
  var app = this;
  app.map = undefined;
  app.mapIsLoaded = false;
  BaseApp.apply(this, arguments);
}
App.prototype = new BaseApp();

App.prototype.taskProjection = new OpenLayers.Projection("EPSG:4326");
App.prototype.taskZoom = 1.2;
App.prototype.taskMaxZoom = 10;
App.prototype.defaultTaskSize = 200;

App.prototype.init = function (cb) {
  var app = this;

  app.imageryLayers = [];
  BaseApp.prototype.init.call(this, function (err, app) {
    if (cb) cb(null, app);
  });
}

App.prototype.loadMap = function() {
  var app = this;
  if (app.mapIsLoaded) return;

  app.loadMapCreateMap();
  app.layers = {};
  app.loadMapAddLayers();
  app.loadMapAddControls();

  app.map.events.register("moveend", app, app.mapMoveEnd);
  app.mapIsLoaded = true;
}

/* This is kind of a hack - along the lines of what's suggested here:
 * http://stackoverflow.com/questions/15571660/openlayer-map-restrict-panning-and-zooming
 * It just seems very hard to convince OpenLayers to do this itself
 * using minScale/maxScale/minResolution/maxResolution or something
 * similar (and the docs are a bit lacking).
 * 
 */

App.prototype.mapMoveEnd = function (evt) {
  var app = this;
  if (app.taskMaxZoom) {
    if (app.zoomRecurse) return;
    app.zoomRecurse = true;
    var bbox = app.getTaskBounds().transform(
      App.prototype.taskProjection, app.map.getProjectionObject()
    ).scale(app.taskMaxZoom);

    if (!bbox.containsBounds(app.map.getExtent())) {
      app.map.zoomToExtent(bbox);
    }
    app.zoomRecurse = false;
  }
}
App.prototype.loadMapCreateMapOptions = function () {
  var app = this;
  var options = {
    div: "map",
    controls: [],
    fractionalZoom: true,
    minScale: 442943842,
    maxScale: 135
  };
  return options;
}

App.prototype.loadMapCreateMap = function() {
  var app = this;
  app.map = new OpenLayers.Map(app.loadMapCreateMapOptions());
}
App.prototype.loadMapAddLayers = function() {
  var app = this;

  app.layers.guide = new OpenLayers.Layer.Vector("Guide");
  app.layers.guide.id = "guide";
  app.map.addLayer(app.layers.guide);

  app.map.events.register('mousemove', app, function(e) {
    var lonlat = app.map.getLonLatFromPixel(app.layers.guide.events.getMousePosition(e));

    var mousepoint = new OpenLayers.Geometry.Point(lonlat.lon, lonlat.lat);
    var positions = app.getTaskPositions();
    if (!positions) return;
    var unit = positions.unit;

    app.layers.guide.features.map(function (feature) {
      if (feature.style.realStrokeOpacity == undefined) feature.style.realStrokeOpacity = feature.style.strokeOpacity;
      var distance = feature.geometry.distanceTo(mousepoint);
      if (distance > unit) {
        feature.style.strokeOpacity = feature.style.realStrokeOpacity;
      } else {
        feature.style.strokeOpacity = feature.style.realStrokeOpacity * distance / unit;
      }
    });
    app.layers.guide.redraw();
  });
}
App.prototype.loadMapAddControls = function() {
  var app = this;
  app.map.addControls([
    new OpenLayers.Control.Navigation(),
    new OpenLayers.Control.Attribution(),
    new OpenLayers.Control.ScaleLine(),
    new OpenLayers.Control.PanZoomBar(),
    new AppKeyboardDefaults()
  ]);
    /*
  app.map.addControls([
    new OpenLayers.Control.LayerSwitcher()
  ]);
*/

  app.map.events.on({
    addlayer: app.redrawLayers,
    changelayer: app.redrawLayers,
    removelayer: app.redrawLayers,
    changebaselayer: app.redrawLayers,
    scope: app
  });
}

App.prototype.redrawLayers = function () {
  var app = this;

  $("#layers .layer").remove();
  var baseLayers = app.map.layers.filter(function (layer) { return layer.isBaseLayer; })
  baseLayers.map(function (layer) {
    var node = $("<a class='layer' href='javascript:void(0);'>");
    node.html(layer.name)
    if (layer.visibility) node.addClass('active');
    node.click(app.selectLayer.bind(app, layer));
    $("#layers").append(node);
  });
}

App.prototype.selectLayer = function (layer) {
  var app = this;
  app.map.setBaseLayer(layer);
}

App.prototype.clearData = function() {
  var app = this;
  var bbox = app.getTaskBounds().transform(
    App.prototype.taskProjection, app.map.getProjectionObject()
  );
  app.map.zoomToExtent(bbox.scale(app.taskZoom));
}

App.prototype.getTaskBounds = function() {
  var app = this;
  if (app.task.bounds != undefined) return app.task.bounds;
  if (app.task.data.info.bbox) {
    app.task.bounds = OpenLayers.Bounds.fromString(app.task.data.info.bbox);
  } else {
    var size = app.defaultTaskSize;
    if (app.task.data.info.size != undefined) {
      size = app.task.data.info.size;
    }
    var oneMeter = app.getOneMeterForMapFromTask(app.task.data.info.longitude, app.task.data.info.latitude);
    app.task.bounds = new OpenLayers.Bounds();
    [[app.task.data.info.longitude - size * oneMeter, app.task.data.info.latitude],
     [app.task.data.info.longitude + size * oneMeter, app.task.data.info.latitude],
     [app.task.data.info.longitude, app.task.data.info.latitude - size * oneMeter],
     [app.task.data.info.longitude, app.task.data.info.latitude + size * oneMeter]].map(function (lonlat) {
      app.task.bounds.extend(new OpenLayers.LonLat(lonlat[0], lonlat[1]));
    });
  }
  return app.task.bounds;
}

App.prototype.loadImagery_underlay = function(info) {
  var app = this;

  app.layers.osm = new OpenLayers.Layer.OSM();
  app.layers.gmap = new OpenLayers.Layer.Google("Satellite", {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22});

  app.map.addLayer(app.layers.osm);
  app.map.addLayer(app.layers.gmap);

  app.imageryLayers.push(app.layers.osm);
  app.imageryLayers.push(app.layers.gmap);

}

App.prototype.loadImagery_KML = function(info) {
  var app = this;
  var imagery = new OpenLayers.Layer.Vector(
    info.title || "Imagery",
    {
      strategies: [new OpenLayers.Strategy.Fixed()],
      protocol: new OpenLayers.Protocol.HTTP({
        url: info.url,
        format: new OpenLayers.Format.KML($.extend({
          extractStyles: true,
          extractAttributes: true,
          maxDepth: 2
        }, info.options || {}))
      })
    }
  );
  if (info.id) imagery.id = info.id;
  app.map.addLayer(imagery);
  app.map.setLayerIndex(imagery, 0);
  app.imageryLayers.push(imagery);
}

App.prototype.loadImagery_WMS = function(info) {
  var app = this;
    console.log([info.title || "Imagery",
    info.url,
                 info.options || {}]);
  var imagery = new OpenLayers.Layer.WMS(
    info.title || "Imagery",
    info.url,
    info.options || {});
  if (info.id) imagery.id = info.id;
  app.map.addLayer(imagery);
  app.imageryLayers.push(imagery);
}

App.prototype.loadImagery_image = function(info) {
  // Note: This function only works if
  // app.map.getProjectionObject() == app.taskProjection
  var app = this;
  var imagery = new OpenLayers.Layer.Image(
    info.title || 'Imagery',
    info.url,
    OpenLayers.Bounds.fromString(info.bbox), // No transform here
    new OpenLayers.Size(info.width, info.height),
    {
      opacity: 1.0, 
      isBaseLayer: false,
      numZoomLevels: 20,
      alwaysInRange: true
    }
  );
  if (info.id) imagery.id = info.id;
  app.map.addLayer(imagery);
  app.map.setLayerIndex(imagery, 1);
  app.imageryLayers.push(imagery);
}

App.prototype.clearImagery = function () {
  var app = this;
  app.imageryLayers.map(function (layer) {
    app.map.removeLayer(layers);
  });
  app.imageryLayers = [];
}

App.prototype.loadImagery = function () {
  var app = this;
  app.clearImagery();

  if (app.task.data.info.imagery) {
    app.task.data.info.imagery.map(function (imagery) {
      app['loadImagery_' + imagery.type](imagery);
    });
  }

  // Backwards compatibility
  if (app.task.data.info.url) {
    if (app.task.data.info.width) {
      app.loadImagery_image(app.task.data.info);
    } else {
      app.loadImagery_WMS(app.task.data.info);
    }
  }
}

App.prototype.getOneMeter = function (projection, lonlat) {
  var wgs84 = new OpenLayers.Projection("EPSG:4326");

  var p1 = lonlat.transform(projection, wgs84);
  var p2 = p1.add(0, 1.0 / 1852 / 60);
  p1 = p1.transform(wgs84, projection);
  p2 = p2.transform(wgs84, projection);

  return p2.lat - p1.lat;
};

App.prototype.getOneMeterForMapFromTask = function(lon, lat) {
  var app = this;
  return app.getOneMeter(app.taskProjection, 
    new OpenLayers.LonLat(lon, lat).transform(
      app.taskProjection,
      app.taskProjection));
};

App.prototype.guideStyle = {
  strokeColor: "#ffffff",
  strokeWidth: 4,
  strokeOpacity: 0.75,
  fillOpacity: 0,
  fillColor: "#000000"
};
App.prototype.unitSize = 20.0; // In % of task size
App.prototype.getTaskPositions = function () {
  var app = this;

  if (!app.task) return undefined;
  if (app.task.positions != undefined) return app.task.positions;

  app.task.positions = {};
  app.task.positions.oneMeter = app.getOneMeterForMapFromTask(app.task.data.info.longitude, app.task.data.info.latitude);
  app.task.size = app.defaultTaskSize;
  if (app.task.data.info.size != undefined) {
    app.task.size = app.task.data.info.size;
  }
  app.task.positions.unit = app.unitSize * app.task.size * app.task.positions.oneMeter / 100;
  app.task.positions.bounds = app.getTaskBounds();
  var bounds = app.task.positions.bounds.toArray();
  app.task.positions.left = bounds[0];
  app.task.positions.bottom = bounds[1];
  app.task.positions.right = bounds[2]
  app.task.positions.top = bounds[3];
  return app.task.positions;
}
App.prototype.loadGuideCrossHair = function() {
  var app = this;
  var guide = app.map.getLayer('guide');
  var p = app.getTaskPositions();

  guide.addFeatures([
    // The cross
    [[app.task.data.info.longitude - p.unit, app.task.data.info.latitude],
     [app.task.data.info.longitude + p.unit, app.task.data.info.latitude]],
    [[app.task.data.info.longitude, app.task.data.info.latitude - p.unit],
     [app.task.data.info.longitude, app.task.data.info.latitude + p.unit]],

    // Top left
    [[p.left, p.top],
     [p.left + p.unit, p.top]],
    [[p.left, p.top],
     [p.left, p.top - p.unit]],

    // Top right
    [[p.right, p.top],
     [p.right - p.unit, p.top]],
    [[p.right, p.top],
     [p.right, p.top - p.unit]],

    // Bottom left
    [[p.left, p.bottom],
     [p.left + p.unit, p.bottom]],
    [[p.left, p.bottom],
     [p.left, p.bottom + p.unit]],

    // Bottom right
    [[p.right, p.bottom],
     [p.right - p.unit, p.bottom]],
    [[p.right, p.bottom],
     [p.right, p.bottom + p.unit]],
  ].map(function (positions) {
    return new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.LineString(
        positions.map(function (coords) {
          return new OpenLayers.Geometry.Point(coords[0], coords[1]).transform(
            App.prototype.taskProjection, app.map.getProjectionObject())
        })),
        null, $.extend({}, app.guideStyle)
    );
  }));
}
App.prototype.loadGuideLargeCross = function() {
  // FIXME: handle projections
  var app = this;
  var guide = app.map.getLayer('guide');
  var oneMeter = app.getOneMeterForMapFromTask(app.task.data.info.longitude, app.task.data.info.latitude);
  var size = app.defaultTaskSize;
  if (app.task.data.info.size != undefined) {
    size = app.task.data.info.size;
  }
  guide.addFeatures([
    new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.LineString([
        new OpenLayers.Geometry.Point(app.task.data.info.longitude - size * oneMeter, app.task.data.info.latitude),
        new OpenLayers.Geometry.Point(app.task.data.info.longitude + size * oneMeter, app.task.data.info.latitude)]),
      null, app.guideStyle),
    new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.LineString([
        new OpenLayers.Geometry.Point(app.task.data.info.longitude, app.task.data.info.latitude - size * oneMeter),
        new OpenLayers.Geometry.Point(app.task.data.info.longitude, app.task.data.info.latitude + size * oneMeter)]),
      null, app.guideStyle)]);
}
App.prototype.loadGuideCircle = function() {
  // FIXME: handle projections
  var app = this;
  var size = app.defaultTaskSize;
  if (app.task.data.info.size != undefined) {
    size = app.task.data.info.size;
  }
  var guide = app.map.getLayer('guide');
  var center = new OpenLayers.Geometry.Point(app.task.data.info.longitude, app.task.data.info.latitude);
  var oneMeter = app.getOneMeterForMapFromTask(app.task.data.info.longitude, app.task.data.info.latitude);
  var circleGeom = OpenLayers.Geometry.Polygon.createRegularPolygon(center, size * oneMeter, 40, 0);
  var circle = new OpenLayers.Feature.Vector(
    circleGeom,
    null,
    app.guideStyle
  );
  guide.addFeatures([circle]);
}
App.prototype.loadGuide = function() {
  var app = this;
  var guide = app.map.getLayer('guide');
  guide.removeAllFeatures();

  app.loadGuideCrossHair();
}

App.prototype.updateMap = function(data) {
  var app = this;

  BaseApp.prototype.updateMap.call(app, data);

  app.loadImagery();
  app.loadGuide();
  app.clearData();
}
