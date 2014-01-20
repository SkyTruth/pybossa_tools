CricketFrogPadMapperApp = App = function() {
  CricketFrogApp.apply(this, arguments);
};
App.prototype = new CricketFrogApp();

App.prototype.drawStyle = 'new';
App.prototype.useMapUnderlayes = true;
// When using OpenLayers.Layer.Image the task projection must be the
// same as the map projection, which comes from Google Maps if using
// map underlays...
App.prototype.taskProjection = new OpenLayers.Projection("EPSG:900913");
App.prototype.loadImagery = CricketFrogApp.prototype.loadImageryIMG;
