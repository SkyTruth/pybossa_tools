BaseTemplatePage = Page = function () {
  GenericPage.apply(this, arguments);
};

Page.prototype.attaGirlInterval = 1;
Page.prototype.badgeWidth = '20pt';
Page.prototype.badgeWidthActive = '40pt';
Page.prototype.badgeAnimation = 500;
Page.prototype.badgePopup = 3000;

Page.prototype.init = function (app, cb) {
  var page = this;

  async.series(
    [
      function (cb) {
        GenericPage.prototype.init.call(page, app, cb);
      },

      function (cb) {
        $.ajax({
          url: '/api/app?short_name={{short_name}}',
          success: function (data, textStatus, jqXHR) {
            page.app.pybossa = data[0];
            cb(null, data);
          },
          error: function (jqXHR, textStatus, errorThrown) {
            cb(testStatus);
          }
        });
      },

      function (cb) {
        page.queryData(
          {
            user_id: -1,
            key: 'badges'
          },
          function (err, data) {
            data.map(function (row) {
              page.addBadge(row.info);
            });
            cb();
          }
        );
      },

      function (cb) {
        pybossa.taskLoaded(function(task, deferred) {
          return page.taskLoaded(task, deferred);
        });

        pybossa.presentTask(function(task, deferred) {
          return page.presentTask(task, deferred);
        });
        page.app.loadMap();

        $(".done-for-now-btn").click(function (evt) { page.doneForNow(evt); });

        $(".alert-messages .alert a:not(.close)").addClass("btn btn-success");

        pybossa.run('{{short_name}}');

        cb();
      },
    ],
    function (err, res) {
      if (cb) cb(null, page);
    }
  );
};
Page.prototype.addBadge = function(badge, popup) {
  var page = this;

  var icon = $("<img class='pybossa-badge' />");
  icon.attr("src", badge.icon);
  icon.css({width: page.badgeWidth, height: 'auto'});
  icon.popover({
    animation: true,
    html: true,
    placement: 'left',
    trigger: 'click',
    content: badge.description,
  });
  $(".pybossa-badges").append(icon);
  icon.load(function () {
    var show = function () {
      icon.animate({width: page.badgeWidthActive}, page.badgeAnimation, 'swing', function () {
        icon.popover('show');
      });
    };
    var hide = function () {
      icon.animate({width: page.badgeWidth}, page.badgeAnimation, 'swing', function () {
        icon.popover('hide');
      });
    };

    icon.on("mouseover", show);
    icon.on("mouseout", hide);
    if (popup) {
      show();
      setTimeout(hide, page.badgePopup);
    }
  });
};
Page.prototype.generateAttaGirl = function() {
  var page = this;
  if (page.attaGirlInterval && (page.attaGirlInterval - 1 <= page.progress.done % page.attaGirlInterval)) {
    var messages = $(".atta-boy-messages > div")
    var message = $(messages[Math.floor((page.progress.done) / page.attaGirlInterval) % messages.length]);
    var badge = {type:'atta', description: message.find("div").html(), icon: message.find("img").attr("src")};

    page.storeData({
        "user_id": -1,
        "app_id": -1,
        "key": "badges",
        "info": badge
    });

      page.addBadge(badge, true);
  }
};
Page.prototype.doneForNow = function(evt) {
  $(".done-for-now").show();
  $(".skeleton").hide();
};
Page.prototype.taskLoaded = function(task, deferred) {
  deferred.resolve(task);
};
Page.prototype.getData = function() {
  var res = JSON.parse($.cookie('{{short_name}}_data')) || {};
  if (!res.done) res.done = {};
  if (!res.timings) res.timings = {};
  if (!res.times) res.times = {};
  if (!res.total) res.total = {};
  return res;
};
Page.prototype.setData = function(data) {
  $.cookie('{{short_name}}_data', JSON.stringify(data));
};
Page.prototype.loadUserProgress = function() {
  var page = this;
  pybossa.userProgress('{{short_name}}').done(function (pybossadata) {
    page.progress = pybossadata;

    var data = {done: {}, total: {}};
    data.done.tasks = pybossadata.done;
    data.total.tasks = pybossadata.total;

    for (key in data.done) {
       $(".done-" + key + "-display").html(data.done[key]);
    }
    return page.app.setProgress(data);
  });
};
Page.prototype.reportAnswer = function () {
  var page = this;

  var data = page.getData();
  var now = (new Date).getTime();
  for (key in data.times) {
    data.timings[key] = now - data.times[key];
  }
  data.times.reportAnswer = now;
  page.setData(data);

  var answer = page.app.getAnswer();
  answer.timings = data.timings;
  if (answer.done == undefined) answer.done = {};
  if (answer.done.tasks == undefined) answer.done.tasks = 1;

  page.storeDatas(
    {
      "user_id": -1,
      "app_id": -1,
      "task_id": -1,
      "amounts": answer.done
    },
    function(err) {
      page.generateAttaGirl();
      pybossa.saveTask(page.task.id, answer).done(function() {
        page.deferred.resolve();
      });
    }
  );

  $("#loading").fadeIn(500);
  if ($("#disqus_thread").is(":visible")) {
    $('#disqus_thread').toggle();
    $('.btn-disqus').toggle();
  }
};
Page.prototype.presentTask = function(task, deferred) {
  var page = this;
  page.task = task;
  page.deferred = deferred;

  var data = page.getData();
  var now = (new Date).getTime();
  data.times.presentTask = now;
  page.setData(data);

  if ( !$.isEmptyObject(task) ) {
    $('#task-id').html(task.id);
    page.loadUserProgress();
    page.app.updateMap(task);
    $("#loading").hide();
  } else {
    $(".all-done").show();
    $(".skeleton").hide();
    $("#loading").hide();
  }
};
Page.prototype.storeDatas = function(data, cb) {
  /* Usage:
    storeDatas({
      user_id: -1,
      app_id: -1,
      amounts {
        tasks: 3,
        fastRuns: 2,
        largeFinds: 4
      }
    }, function (err) { ... });

    This will store:
    [{user_id: -1, app_id: -1, key: "tasks", amount: 3},
     {user_id: -1, app_id: -1, key: "fastRuns", amount: 2},
     {user_id: -1, app_id: -1, key: "largeFinds", amount: 4}]

    Similarly with "infos" for storing arbitrary json data.
  */

  if (!cb) cb = function () {};

  var template = $.extend({}, data);
  if (template.amounts != undefined) delete template.amounts;
  if (template.infos != undefined) delete template.infos;

  async.each(
    Object.keys(data.amounts || {}),
    function(key, cb) {
     var dataToStore = $.extend({}, template);
      dataToStore.key = key;
      dataToStore.amount = data.amounts[key];
      page.storeData(dataToStore, cb);
    },
    function(err) {
      async.each(
        Object.keys(data.infos || {}),
        function(key, cb) {
          var dataToStore = $.extend({}, template);
          dataToStore.key = key;
          dataToStore.info = data.infos[key];
          page.storeData(dataToStore, cb);
        },
        cb
      )
    }
  );
};
Page.prototype.storeData = function(data, cb) {
  var page = this;

  if (data.app_id == -1) {
    data.app_id = page.app.pybossa.id;
  }
  if (data.task_id == -1) {
    data.task_id = page.app.task.id;
  }

    console.log(["STORE", data]);
  $.ajax({
    type: "POST",
    url: "/api/rundata",
    data: JSON.stringify(data),
    contentType: 'application/json',
    dataType: "json",
    success: function (data, textStatus, jqXHR) {
      if (cb) cb(null, data);
    },
    error: function (jqXHR, textStatus, errorThrown) {
      if (cb) cb(testStatus);
    }
  });
};
Page.prototype.queryData = function(filter, cb) {
  if (filter.app_id == -1) {
    filter.app_id = page.app.pybossa.id;
  }
  if (filter.task_id == -1) {
    filter.task_id = page.app.task.id;
  }

  $.ajax({
    type: "GET",
    url: "/api/rundata",
    data: filter,
    contentType: 'application/json',
    dataType: "json",
    success: function (data, textStatus, jqXHR) {
      cb(null, data);
    },
    error: function (jqXHR, textStatus, errorThrown) {
      cb(testStatus);
    }
  });
};
