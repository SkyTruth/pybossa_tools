CategorizerTrackApp = App = function() {
  BaseOpenlayersApp.apply(this, arguments);
};
App.prototype = new BaseOpenlayersApp();
App.prototype.init = function (cb) {
  BaseOpenlayersApp.prototype.init.call(this, function (err, app) {

    cb(err, app);
  });
}
App.prototype.loadImagery = BaseOpenlayersApp.prototype.loadImageryKML;
App.prototype.useMapUnderlayes = true;
App.prototype.taskMaxZoom = false;
