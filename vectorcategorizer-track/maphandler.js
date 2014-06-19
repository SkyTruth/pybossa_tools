VectorCategorizerTrack = App = function() {
  var app = this;
  BaseVectorVisualApp.apply(this, arguments);
}
App.prototype = new BaseVectorVisualApp();

App.prototype.updateMap = function(data) {
  BaseVectorVisualApp.prototype.updateMap.call(this, data);
  var sidebar = $('.sidebar');
  for (var key in data.info.sidebar) {
    sidebar.append("<div>" + key + ": " + data.info.sidebar[key] + "</div>");
  }
};
