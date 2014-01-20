CricketFrogPondMapperApp = App = function() {
  CricketFrogApp.apply(this, arguments);
};
App.prototype = new CricketFrogApp();

App.prototype.drawStyle = 'new';

App.prototype.loadGuide = function() {
  var app = this;
  var guide = app.map.getLayer('guide');
  guide.removeAllFeatures();

  app.loadGuideCircle();
}
