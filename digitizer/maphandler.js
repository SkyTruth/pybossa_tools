CricketFrogApp = App = function() {
  BaseOpenlayersApp.apply(this, arguments);
};
App.prototype = new BaseOpenlayersApp();
App.prototype.init = function (cb) {
  var app = this;

  BaseOpenlayersApp.prototype.init.call(this, function (err, app) {
    if (cb) cb(err, app);
  });
  $('.btn-undo').on('click', function(evt) {
    app.layers.drillpads.mod.undo();
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
  var errs = [];
  var drillpads = app.map.getLayer('drillpads');
  if (!app.answer) app.answer = {};
  if (isDone || app.answer.selection == "done") {
    if (drillpads.features.length > 0) {
      var geojson = new OpenLayers.Format.GeoJSON();
      drillpads.mod.deactivate();
      app.answer.shapes = drillpads.features.map(function(feature) {
        return JSON.parse(geojson.write(feature.geometry.clone().transform(
          app.map.getProjectionObject(), app.getTaskProjection()
        )));
      });
      drillpads.mod.activate();
    } else {
      errs.push("You have to finish marking at least one area to continue. Doubble click on the imagery to finish.");
    }
  }
  if (errs.length == 0 || isDone) {
    BaseOpenlayersApp.prototype.getAnswer.call(this, cb);
  } else {
    var dialog = $('<div class="modal fade" id="error" tabindex="-1" role="dialog" aria-labelledby="errorLabel" aria-hidden="true"><div class="modal-dialog"><div class="modal-content"><div class="modal-header bg-danger text-danger"><button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button><h4 class="modal-title" id="errorLabel">Unable to submit</h4></div><div class="modal-body alert"></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div></div></div></div>');
    dialog.find(".modal-body").html(errs.join('<br>'));
    $('body').append(dialog);
    dialog.modal();
    dialog.on('hidden.bs.modal', function (e) {
      dialog.detach();
      app.loadingEnded();
    });
  }
}

App.prototype.updateMap = function(info) {
  if (!info.size) info.size = 125;
  BaseOpenlayersApp.prototype.updateMap.call(this, info);
}
