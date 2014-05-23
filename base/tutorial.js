BaseTutorialPage = Page = function () {
  GenericPage.apply(this, arguments);
  var page = this;

  page.initializedSteps = {};
  page.step = -1;
};
Page.prototype = new GenericPage();
Page.prototype.init = function (app, cb) {
  GenericPage.prototype.init.call(this, app, function (err, page) {
    page.nrofsteps = $(".step").length;

    page.showStep('next');
    $("#modal").modal('show');

    $(".step").each(function (idx, step) {
      $(step).attr("id", idx)
    });

    $($(".step")[0]).show();

    $("#prevBtn").click(function (ev) { page.showStep('prev'); });
    $("#nextBtn").click(function (ev) { page.showStep('next'); });

    if (cb) cb(null, page);
  });
};
Page.prototype.reportAnswer = function () {
  this.showStep('next');
};
Page.prototype.setMapTask = function () {
  var page = this;
  page.app.setProgress({
    total: {tasks: page.initializedSteps[page.step].tasks.length},
    done: {tasks: page.initializedSteps[page.step].task}});
  page.app.updateMap({"info": page.initializedSteps[page.step].tasks[page.initializedSteps[page.step].task]});
  $("#mapcomment").html(page.initializedSteps[page.step].tasks[page.initializedSteps[page.step].task].comment || "");
  $(".maperrors .popover-content").html("");
  $(".maperrors").hide();
};
Page.prototype.initializeStep = function() {
  var page = this;
  if (page.initializedSteps[page.step] == undefined) {
    if ($("#" + page.step).hasClass("mapstep")) {
      page.app.loadMap();
      page.initializedSteps[page.step] = {};
      page.initializedSteps[page.step].task = 0;
      page.initializedSteps[page.step].tasks = maptasks;
      page.app.loadMap();
      page.setMapTask();
    } else {
      page.initializedSteps[page.step] = true;
    }
  }
}
Page.prototype.validateMapStep = function(cb) {
  var info = page.initializedSteps[page.step].tasks[page.initializedSteps[page.step].task];
  page.app.getAnswer(function (answer) {
    if (answer == undefined || answer.selection == undefined) {
      page.errs.push("Please use one of the buttons at the bottom of the image to indicate the type of drill pad your see.");
    } else if (answer.selection != info.answer) {
      page.errs.push("You selected " + answer.selection + " while the correct answer was " + info.answer);
    }

    if (page.errs.length == 0 && page.initializedSteps[page.step].task < page.initializedSteps[page.step].tasks.length - 1) {
      page.initializedSteps[page.step].task++;
      page.setMapTask(page.step);
      page.stayOnStep = true;
    } else {
      $(".btn-answer").attr({disabled: false})
      $(".loading").hide();
    }
    cb();
  }
}
Page.prototype.validateStep = function(cb) {
  var page = this;
  page.errs = [];
  page.stayOnStep = false;

  async.series([
    function (cb) {
      if ($("#" + page.step).hasClass("mapstep")) {
        page.validateMapStep(cb);
      } else {
        cb();
      }
    },
    function (cb) {
      if (page.stayOnStep) return cb(null, false);
      $(".maperrors .popover-content").html("");
      console.log(page.errs);
      page.errs.map(function (item) {
        $(".maperrors .popover-content").append(item)
      });
      if (page.errs.length > 0) {
        $(".maperrors").show();
      } else {
        $(".maperrors").hide();
      }
      cb(null, page.errs.length == 0);
    }
  ],
  function (err, res) {
    cb(res);
  });
}
Page.prototype.showStep = function(action) {
  var page = this;
  var oldstep = page.step;
  async.series([
    function (cb) {
      if (action == 'next') {
        page.validateStep(function (valid) {
          if (valid) cb();
        });
      } else {
        cb();
      }
    },
    function (cb) {
      if (action == 'next') {
        page.step = page.step + 1;
      }
      if (action == 'prev') {
        page.step = page.step - 1;
      }

      $("#" + oldstep).hide();
      $("#prevBtn").toggle(page.step != 0);
      $("#nextBtn").toggle(page.step != page.nrofsteps - 1);
      $("#startContrib").toggle(page.step == page.nrofsteps - 1);
      $("#" + page.step).show();
      page.initializeStep();
      cb();
    }
  ]);
}
