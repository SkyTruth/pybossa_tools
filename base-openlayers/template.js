BaseTemplatePage = Page = function () {
  GenericPage.apply(this, arguments);
};

Page.prototype.attaGirlInterval = 1;

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
/*
      function (cb) {
        page.rundata = {current_user: {}};
        page.queryData(
          {
            user_id: -1,
            group_by: "app_id,key"
          },
          function (err, data) {
            data.map(function (row) {
              if (!page.rundata.current_user[row.app_id]) page.rundata.current_user[row.app_id] = {};
              page.rundata.current_user[row.app_id][row.key] = row;
            });
            cb();
          }
        );
      },
*/

      function (cb) {
        pybossa.taskLoaded(function(task, deferred) {
          return page.taskLoaded(task, deferred);
        });

        pybossa.presentTask(function(task, deferred) {
          return page.presentTask(task, deferred);
        });
        page.app.loadMap();

        $(".done-for-now-btn").click(function (evt) { page.doneForNow(evt); });
        $(".lots-done .continue").click(function (evt) { page.lotsDoneContinue(evt); });

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
Page.prototype.addBadge = function(badge) {
  var icon = $("<img class='pybossa-badge' />");
  icon.attr("src", badge.icon);
  icon.popover({
    animation: true,
    html: true,
    placement: 'left',
    trigger: 'click',
    content: badge.description,
  });
  $(".pybossa-badges").append(icon);
  icon.load(function () {
    icon.popover('show');
    setTimeout(function () {
      icon.popover('hide');
    }, 4000);
  });
};
Page.prototype.getAttaGirl = function(progress) {
  var page = this;
    console.log(["XXX", progress]);
  if (page.attaGirlInterval && (page.attaGirlInterval - 1 <= progress % page.attaGirlInterval)) {
    var messages = $(".atta-boy-messages > div")
    var message = $(messages[Math.floor((progress) / page.attaGirlInterval) % messages.length]);
    var badge = {type:'atta', description: message.html(), icon: 'https://openclipart.org//people/cohort/eared-shield-1.svg'};

    page.storeData({
        "user_id": -1,
        "app_id": -1,
        "key": "badges",
        "info": badge
    });

    page.addBadge(badge);
  }
};
Page.prototype.doneForNow = function(evt) {
  $(".done-for-now").show();
  $(".skeleton").hide();
};
Page.prototype.lotsDoneContinue = function(evt) {
  $(".lots-done").hide();
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
    var data = {done: {}, total: {}};
    data.done.tasks = pybossadata.done;
    data.total.tasks = pybossadata.total;

    for (key in data.done) {
       $(".done-" + key + "-display").html(data.done[key]);
    }
    page.getAttaGirl(data.done.tasks);
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
