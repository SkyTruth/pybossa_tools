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
}

App.prototype.useMapUnderlayes = false;
App.prototype.taskProjection = new OpenLayers.Projection("EPSG:4326");
App.prototype.taskZoom = 1.2;
App.prototype.taskMaxZoom = 10;

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
    controls: []
  };
  if (!app.useMapUnderlayes) {
    options.allOverlays = true;
    options.fractionalZoom =  true;
    options.minScale = 442943842;
    options.maxScale = 135;
  }
  return options;
}

App.prototype.loadMapCreateMap = function() {
  var app = this;
  app.map = new OpenLayers.Map(app.loadMapCreateMapOptions());
}
App.prototype.loadMapAddLayers = function() {
  var app = this;

  if (app.useMapUnderlayes) {
    app.layers.osm = new OpenLayers.Layer.OSM();
    app.map.addLayer(app.layers.osm);

    app.layers.gmap = new OpenLayers.Layer.Google("Satellite", {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22});
    app.map.addLayer(app.layers.gmap);
  }

  app.layers.guide = new OpenLayers.Layer.Vector("Guide");
  app.layers.guide.id = "guide";
  app.map.addLayer(app.layers.guide);
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
  if (app.useMapUnderlayes) {
    app.map.addControls([
      new OpenLayers.Control.LayerSwitcher()
    ]);
  }
}

App.prototype.setProgress = function(data) {
  var pct = Math.round((data.done*100)/data.total);
  $("#progress .bar").css("width", pct.toString() +"%");
  $("#progress .bar").attr("title", pct.toString() + "% completed!");
  $("#progress .bar").tooltip({'placement': 'left'});
  if (pct > 50) {
    $("#progress .bar").html(pct.toString() +"%");
    $("#progress .progress-label").html("");
  } else {
    $("#progress .bar").html("");
    $("#progress .progress-label").html(pct.toString() +"%");
  }
  $("#total").text(data.total);
  $("#done").text(data.done);
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
  if (app.info.bbox) {
    return OpenLayers.Bounds.fromString(app.info.bbox);
  } else {
    var oneMeter = app.getOneMeterForMapFromTask(app.info.longitude, app.info.latitude);
    var bounds = new OpenLayers.Bounds();
    [[app.info.longitude - app.info.size * oneMeter, app.info.latitude],
     [app.info.longitude + app.info.size * oneMeter, app.info.latitude],
     [app.info.longitude, app.info.latitude - app.info.size * oneMeter],
     [app.info.longitude, app.info.latitude + app.info.size * oneMeter]].map(function (lonlat) {
      bounds.extend(new OpenLayers.LonLat(lonlat[0], lonlat[1]));
    });
    return bounds;
  }
}

App.prototype.loadImageryWMS = function() {
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
App.prototype.loadImageryIMG = function() {
  // Note: This function only works if
  // app.map.getProjectionObject() == app.taskProjection
  var app = this;
  if (app.map.getLayer('imagery')) app.map.removeLayer(app.map.getLayer('imagery'));
  var imagery = new OpenLayers.Layer.Image(
    'imagery',
    app.info.url,
    OpenLayers.Bounds.fromString(app.info.bbox), // No transform here
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
App.prototype.loadImagery = App.prototype.loadImageryWMS;

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
  return app.getOneMeter(app.map.getProjectionObject(), 
    new OpenLayers.LonLat(lon, lat).transform(
      app.taskProjection,
      app.map.getProjectionObject()));
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
  var res = {};
  res.oneMeter = app.getOneMeterForMapFromTask(app.info.longitude, app.info.latitude);
  res.unit = app.unitSize * app.info.size * res.oneMeter / 100;
  res.bounds = app.getTaskBounds();
  var bounds = res.bounds.toArray();
  res.left = bounds[0];
  res.bottom = bounds[1];
  res.right = bounds[2]
  res.top = bounds[3];
  return res;
}
App.prototype.loadGuideCrossHair = function() {
  var app = this;
  var guide = app.map.getLayer('guide');
  var p = app.getTaskPositions();

  guide.addFeatures([
    // The cross
    [[app.info.longitude - p.unit, app.info.latitude],
     [app.info.longitude + p.unit, app.info.latitude]],
    [[app.info.longitude, app.info.latitude - p.unit],
     [app.info.longitude, app.info.latitude + p.unit]],

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
      null, app.guideStyle
    );
  }));
}
App.prototype.loadGuideLargeCross = function() {
  // FIXME: handle projections
  var app = this;
  var guide = app.map.getLayer('guide');
  var oneMeter = app.getOneMeterForMapFromTask(app.info.longitude, app.info.latitude);
  guide.addFeatures([
    new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.LineString([
        new OpenLayers.Geometry.Point(app.info.longitude - app.info.size * oneMeter, app.info.latitude),
        new OpenLayers.Geometry.Point(app.info.longitude + app.info.size * oneMeter, app.info.latitude)]),
      null, app.guideStyle),
    new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.LineString([
        new OpenLayers.Geometry.Point(app.info.longitude, app.info.latitude - app.info.size * oneMeter),
        new OpenLayers.Geometry.Point(app.info.longitude, app.info.latitude + app.info.size * oneMeter)]),
      null, app.guideStyle)]);
}
App.prototype.loadGuideCircle = function() {
  // FIXME: handle projections
  var app = this;
  var guide = app.map.getLayer('guide');
  var center = new OpenLayers.Geometry.Point(app.info.longitude, app.info.latitude);
  var oneMeter = app.getOneMeterForMapFromTask(app.info.longitude, app.info.latitude);
  var circleGeom = OpenLayers.Geometry.Polygon.createRegularPolygon(center, app.info.size * oneMeter, 40, 0);
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

  var siteurl = "https://maps.google.com/maps?q=" + encodeURIComponent(app.info.SiteID) + "+%40" + app.info.latitude + "," + app.info.longitude;

  $(".latlonlink").attr("href", siteurl);
  $(".siteid").html(app.info.SiteID);
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