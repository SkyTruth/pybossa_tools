BaseVectorVisualApp = App = function() {
  var app = this;
  app.map = undefined;
  app.mapIsLoaded = false;
  BaseApp.apply(this, arguments);
}
App.prototype = new BaseApp();

App.prototype.init = function (cb) {
  var app = this;

  BaseApp.prototype.init.call(this, function (err, app) {
    if (cb) cb(null, app);
  });
}

App.prototype.loadMap = function() {
  var app = this;
  if (app.mapIsLoaded) return;

  app.mapIsLoaded = true;
}

App.prototype.updateMap = function(data) {
  var app = this;

  $("#map iframe").attr({src: data.info.url});
  // Remove /apps/vectorvisual/index.html from url...
  app.remote = new VectorVisualRemote("map", data.info.url.split("#")[0].split("/").slice(0, -3).join("/"));
  
  BaseApp.prototype.updateMap.call(app, data);
}

App.prototype.getAnswer = function(cb) {
  var app = this;

  if (!app.answer) app.answer = {};
  page.app.remote.run(
    "successFn(visualization.state.values)",
    function (res) {
      app.answer.workspace = res;
      cb(app.answer);
    }
  );
}
