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
App.prototype.defaultTaskSize = 200;

App.prototype.badgeWidth = '20pt';
App.prototype.badgeWidthActive = '40pt';
App.prototype.badgeAnimation = 500;
App.prototype.badgePopup = 3000;

App.prototype.init = function (cb) {
  var app = this;
  $(".expander-control").click(function (ev) {
    var expanded = $.cookie('taskmanager_expander') == "expanded";
    $.cookie('taskmanager_expander', expanded ? "collapsed" : "expanded");
    app.cookieToExpander();
  });
  app.cookieToExpander();
  $('.btn-answer').on('click', function(evt) {
    app.answer = {"selection": evt.currentTarget.value};
    $(".btn-answer").attr({disabled: true});
    $(".loading").show();
    app.page.reportAnswer();
  });
  $('.btn-cancel').on('click', function(evt) {
    app.clearData();
  });

  app.baseurl = window.location.protocol + "//" + window.location.hostname
  if (window.location.port) app.baseurl = app.baseurl + ":" + window.location.port

  if (cb) cb(null, app);
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
  if (app.useMapUnderlayes) {
    app.map.addControls([
      new OpenLayers.Control.LayerSwitcher()
    ]);
  }
}

App.prototype.setProgress = function(data) {
  var app = this;
  app.progress = data;

  for (key in data.done) {
     $(".done-" + key + "-display").html(data.done[key]);
  }

  var pct = Math.round((data.done.tasks*100)/data.total.tasks);
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
  $("#total").text(data.total.tasks);
  $("#done").text(data.done.tasks);
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

App.prototype.loadImageryKML = function() {
  var app = this;
  if (app.map.getLayer('imagery')) app.map.removeLayer(app.map.getLayer('imagery'));
  var imagery = new OpenLayers.Layer.Vector(
    "Imagery",
    {
      strategies: [new OpenLayers.Strategy.Fixed()],
      protocol: new OpenLayers.Protocol.HTTP({
        url: app.task.data.info.url,
        format: new OpenLayers.Format.KML($.extend({
          extractStyles: true,
          extractAttributes: true,
          maxDepth: 2
        }, app.task.data.info.options))
      })
    }
  );
  imagery.id = 'imagery';
  app.map.addLayer(imagery);
  app.map.setLayerIndex(imagery, 0);
}
App.prototype.loadImageryWMS = function() {
  var app = this;
  if (app.map.getLayer('imagery')) app.map.removeLayer(app.map.getLayer('imagery'));
  var imagery = new OpenLayers.Layer.WMS(
    "Imagery",
    app.task.data.info.url,
    app.task.data.info.options);
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
    app.task.data.info.url,
    OpenLayers.Bounds.fromString(app.task.data.info.bbox), // No transform here
    new OpenLayers.Size(app.task.data.info.width, app.task.data.info.height),
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
  app.answer = undefined;
  app.task = {data: data};

  app.loadImagery();
  app.loadGuide();
  app.clearData();

  $("#site_county").html(app.task.data.info.county || "");
  $("#site_state").html(app.task.data.info.state || "");
  $("#site_year").html(app.task.data.info.year || "");
  $("#site_lat").html(app.task.data.info.latitude);
  $("#site_lon").html(app.task.data.info.longitude);

  var siteurl = "https://maps.google.com/maps?q=" + encodeURIComponent(app.task.data.info.SiteID) + "+%40" + app.task.data.info.latitude + "," + app.task.data.info.longitude;

  $(".latlonlink").attr("href", siteurl);
  $(".siteid").html(app.task.data.info.SiteID);

  $(".btn-answer").attr({disabled: false})
  $(".loading").hide();
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

App.prototype.addBadge = function(badge, popup) {
  var app = this;

  var icon = $("<img class='pybossa-badge' />");
  icon.attr("src", badge.icon);
  icon.css({width: app.badgeWidth, height: 'auto'});
  icon.popover({
    animation: true,
    html: true,
    placement: 'left',
    trigger: 'click',
    content: '<img class="app-icon" src="' + badge.app.icon + '"> <div class="decsription">' + badge.description + '</div>',
  });
  $(".pybossa-badges").append(icon);
  icon.load(function () {
    var show = function () {
      icon.animate({width: app.badgeWidthActive}, app.badgeAnimation, 'swing', function () {
        icon.popover('show');
      });
    };
    var hide = function () {
      icon.animate({width: app.badgeWidth}, app.badgeAnimation, 'swing', function () {
        icon.popover('hide');
      });
    };

    icon.on("mouseover", show);
    icon.on("mouseout", hide);
    if (popup) {
      show();
      setTimeout(hide, app.badgePopup);
    }
  });
};


GenericPage = Page = function () {
};
Page.prototype.init = function (app, cb) {
  var page = this;
  page.app = app;
  app.page = page;
  if (cb) cb(null, page);
};
Page.prototype.reportAnswer = function () {
  // This should be overridden by a real page...
  console.log(page.app.getAnswer());
};
