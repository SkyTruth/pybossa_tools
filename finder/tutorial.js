FinderTutorialPage = Page = function () {
  BaseTutorialPage.apply(this, arguments);
};
Page.prototype = new BaseTutorialPage();
Page.prototype.validateMapStep = function(cb) {
  var page = this;

  var info = page.app.task.data.info;
  page.app.getAnswer(function (answer) {
    var positions = answer.positions;
    if (positions.length != info.positions.length) {
      var template;
      if (positions.length < info.positions.length) {
        if (positions.length == 0) template = $(".js-templates .no-positions-marked");
        else template = $(".js-templates .too-few-positions-marked");
      } else if (positions.length > info.positions.length) {
        if (info.positions.length == 0) template = $(".js-templates .no-positions-existing");
        else template = $(".js-templates .too-many-positions-marked");
      }
      template = template.clone();

      template.find(".marked-positions .nr").html(positions.length.toString());
      template.find(".marked-positions .singular").toggle(positions.length == 1);
      template.find(".marked-positions .plural").toggle(positions.length != 1);

      template.find(".example-positions .nr").html(info.positions.length.toString());
      template.find(".example-positions .singular").toggle(info.positions.length == 1);
      template.find(".example-positions .plural").toggle(info.positions.length != 1);

      page.errs.push(template);
    }
    allFound = true;
    positions.map(function (pos) {
      found = false;
      info.positions.map(function (taskpos) {
        if (OpenLayers.Util.distVincenty(pos, taskpos) < info.distance / 1000.0) {
          found = true;
        }
      });
      if (!found) {
        allFound = false;
      }
    });
    // Don't show this if we have no positions, as a mark can't be too far off from nothing...
    if (!allFound && info.positions.length > 0) page.errs.push("<div>Your markers are too far off from the ponds.</div>")

    if (page.errs.length == 0 && page.initializedSteps[page.step].task < page.initializedSteps[page.step].tasks.length - 1) {
      page.initializedSteps[page.step].task++;
      page.setMapTask();
      page.stayOnStep = true;
    } else {
      page.app.clearData();
    }

    cb();
  });
}
