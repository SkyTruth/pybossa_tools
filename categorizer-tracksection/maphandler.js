CategorizerTrackSectionApp = App = function() {
  BaseOpenlayersApp.apply(this, arguments);
};
App.prototype = new BaseOpenlayersApp();
App.prototype.init = function (cb) {
  BaseOpenlayersApp.prototype.init.call(this, function (err, app) {

    cb(err, app);
  });
}

App.prototype.loadImagerySelectableKML = function() {
  var app = this;
  BaseOpenlayersApp.prototype.loadImageryKML.call(app);

  var imagery = app.map.getLayer('imagery');

  imagery.events.on({
    featureclick: function(evt) {
      console.log(["featureclick", this.name, evt]);
    },
    nofeatureclick: function(evt) {
      console.log(["nofeatureclick", this.name, evt]);
    },
    featureover: function(evt) {
      console.log(["featureover", this.name, evt]);
    },
    featureout: function(evt) {
      console.log(["featureout", this.name, evt]);
    }
  });
}

App.prototype.loadImagery = App.prototype.loadImagerySelectableKML;
App.prototype.useMapUnderlayes = true;
App.prototype.taskMaxZoom = false;
