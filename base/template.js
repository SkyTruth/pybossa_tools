BaseTemplatePage = Page = function () {
  GenericPage.apply(this, arguments);
};

Page.prototype.attaGirlInitialInterval = 0; // 10
Page.prototype.attaGirlIntervalMultiplier = 0; // 2

Page.prototype.publishToFacebook = true;

Page.prototype.init = function (app, cb) {
  var page = this;

  async.series(
    [
      function (cb) {
        GenericPage.prototype.init.call(page, app, cb);
      },

      function (cb) {
        $.ajax({
          url: '/api/app?short_name=' + app_short_name,
          success: function (data, textStatus, jqXHR) {
            page.app.pybossa = data[0];
            cb(null, data);
          },
          error: function (jqXHR, textStatus, errorThrown) {
            cb(textStatus);
          }
        });
      },

      function (cb) {
        if (typeof(facebook_id) == "undefined" || !facebook_id || typeof(facebook_token) == "undefined" || !facebook_token) page.publishToFacebook = false;
        if (!page.publishToFacebook) return cb();

        window.fbAsyncInit = function() {
          FB.init({
            appId      : facebook_id,
            status     : true,
            cookie     : true,
            xfbml      : true
          });
          cb();
        };

        (function(d, s, id){
          var js, fjs = d.getElementsByTagName(s)[0];
          if (d.getElementById(id)) {return;}
          js = d.createElement(s); js.id = id;
          js.src = "//connect.facebook.net/en_US/all.js";
          fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
      },

      function (cb) {
        page.queryData(
          {
            user_id: -1,
            key: 'badges'
          },
          function (err, data) {
            data.map(function (row) {
              page.app.addBadge(row.info);
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

        pybossa.run(page.app.pybossa.short_name);

        cb();
      },
    ],
    function (err, res) {
      if (cb) cb(null, page);
    }
  );
};
Page.prototype.attaGirlInterval = function() {
  var page = this;
  if (!page.attaGirlInitialInterval || !page.attaGirlIntervalMultiplier) return;
  var lg = function (val, base) {
    return Math.log(val)/Math.log(base);
  }

  var level = lg(page.app.progress.done.tasks / page.attaGirlInitialInterval, page.attaGirlIntervalMultiplier);
  if (level >= 0 && Math.floor(level) == level) {
    return level;
  }
  return undefined;
};
Page.prototype.generateAttaGirl = function() {
  var page = this;
  var atta = page.attaGirlInterval();
  var messages = $(".atta-boy-messages > div")
  if (atta != undefined && atta < messages.length) {
    var message = $(messages[atta]);
    page.generateBadge({
      type:'atta',
      app: {
        short_name: page.app.pybossa.short_name,
        name: page.app.pybossa.name,
        description: page.app.pybossa.description,
        icon: page.app.pybossa.info.thumbnail,
      },
      description: message.find("div").html(),
      icon: message.find("img").attr("src")
    });
  }
};
Page.prototype.generateBadge = function(badge) {
  var page = this;

  page.storeData({
      "user_id": -1,
      "app_id": -1,
      "key": "badges",
      "info": badge
  });

  if (page.publishToFacebook) {
    FB.api(
      "/me/feed",
      "POST",
      {
        access_token: facebook_token,
        link: page.app.url,
        picture: badge.icon,
        name: badge.description,
        caption: badge.app.name,
        description: badge.app.description,
        actions: [{name: "Help out!", link: page.app.baseurl + "/app/" + page.app.pybossa.short_name + "/tutorial"}],
      },
      function (response) {
        console.log(response);
      }
    );
  }

  page.app.addBadge(badge, true);
};
Page.prototype.doneForNow = function(evt) {
  $(".done-for-now").show();
  $(".skeleton").hide();
};
Page.prototype.taskLoaded = function(task, deferred) {
  deferred.resolve(task);
};
Page.prototype.getCookieData = function() {
  var page = this;
  var res = JSON.parse($.cookie(page.app.pybossa.short_name + '_data')) || {};
  if (!res.timings) res.timings = {};
  if (!res.times) res.times = {};
  return res;
};
Page.prototype.setCookieData = function(data) {
  var page = this;
  $.cookie(page.app.pybossa.short_name + '_data', JSON.stringify(data));
};
Page.prototype.loadUserProgress = function() {
  var page = this;
  pybossa.userProgress(page.app.pybossa.short_name).done(function (data) {
    var progress = {
      done: {
        tasks: data.done
      },
      total: {
        tasks: data.total
      }
    };

    return page.app.setProgress(progress);
  });
};
Page.prototype.reportAnswer = function () {
  var page = this;

  var data = page.getCookieData();
  var now = (new Date).getTime();
  for (key in data.times) {
    data.timings[key] = now - data.times[key];
  }
  data.times.reportAnswer = now;
  page.setCookieData(data);

  page.app.getAnswer(function (answer) {
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

    if ($("#disqus_thread").is(":visible")) {
      $('#disqus_thread').toggle();
      $('.btn-disqus').toggle();
    }
  });
};
Page.prototype.presentTask = function(task, deferred) {
  var page = this;
  page.task = task;
  page.deferred = deferred;

  var data = page.getCookieData();
  var now = (new Date).getTime();
  data.times.presentTask = now;
  page.setCookieData(data);

  if ( !$.isEmptyObject(task) ) {
    $('#task-id').html(task.id);
    page.loadUserProgress();
    page.app.updateMap(task);
  } else {
    $(".all-done").show();
    $(".skeleton").hide();
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
      if (cb) cb(textStatus);
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
      cb(textStatus);
    }
  });
};
