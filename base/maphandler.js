BaseApp = App = function() {
  var app = this;
  app.map = undefined;
  app.mapIsLoaded = false;
}

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
    app.answer = {"selection": evt.target.value};
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

  app.mapIsLoaded = true;
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

App.prototype.updateMap = function(data) {
  var app = this;
  app.answer = undefined;
  app.task = {data: data};

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