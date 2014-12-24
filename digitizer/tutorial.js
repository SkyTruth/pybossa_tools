OpenLayers.Geometry.Polygon.prototype.contains = function(geometry) {
    var i, len;
    if (geometry.CLASS_NAME == "OpenLayers.Geometry.Point") {
        return this.containsPoint(geometry);
    } else if (geometry.CLASS_NAME == "OpenLayers.Geometry.Polygon") {
        // A polygon is contained if its outer contour is contained,
        // and none of it covers any holes in this geometry
        var outercontour = geometry.components[0];
        for (i=0, len=outercontour.components.length; i<len; ++i) {
            if (!this.containsPoint(outercontour.components[i])) return false;
        }
        // Check that any holes in this polygon does not cover geometry
        for (i=1, len=this.components.length; i<len; ++i) {
            if (this.components[i].intersects(geometry)) return false;
        }
        return true;
    } else {
        // Any other shape is contained if all of its components are
        for (i=0, len=this.components.length; i<len; ++i) {
            if (!this.contains(this.components[i])) return false
        }
        return true;
    }
};

CricketFrogTutorialPage = Page = function () {
  BaseTutorialPage.apply(this, arguments);
};
Page.prototype = new BaseTutorialPage();
Page.prototype.validateMapStep = function(cb) {
  var page = this;

  page.app.getAnswer(function (data) {
    var info = page.app.task.data.info;
    if (info.inner && info.outer) {
      var geojson = new OpenLayers.Format.GeoJSON();
      if (data.shapes && data.shapes.length == 1) {
        var shape = geojson.read(data.shapes[0], "Geometry");
        var inner = geojson.read(info.inner, "Geometry");
        var outer = geojson.read(info.outer, "Geometry");

        if (outer.contains(shape)) {
          if (!shape.contains(inner)) {
            page.errs.push("<div>Your shape is too small</div>")
          }
        } else {
          if (!shape.contains(inner)) {
            page.errs.push("<div>Your shape is not in the right location</div>")
          } else {
            page.errs.push("<div>Your shape is too big</div>")
          }
        }
      } else {
        page.errs.push("<div>Please mark one shape by clicking on the map.</div>")
      }
    } else {
      if (data == undefined || data.selection == undefined) {
        page.errs.push("Please use one of the buttons at the bottom of the image to indicate the type of well pad you see.");
      } else if (data.selection == info.answer) {
        //do nothing here
      } else if (data.selection == "unknown"){
        page.errs.push("The correct answer is " + info.answer);
      } else{
        page.errs.push("You selected " + data.selection + " while the correct answer was " + info.answer);
      }
    }
    if (page.errs.length != 0) {
      page.stayOnStep = true;
      page.app.clearData();
    } else if (page.initializedSteps[page.step].task < page.initializedSteps[page.step].tasks.length - 1) {
      page.initializedSteps[page.step].task++;
      page.setMapTask();
      page.stayOnStep = true;
    }
    $(".btn-answer").attr({disabled: false})
    $(".loading").hide();
    cb();
  });
};
