var map;

function loadMap() {
}

function setProgress(data) {
  var pct = Math.round((data.done*100)/data.total);
  $("#progress").css("width", pct.toString() +"%");
  $("#progress").attr("title", pct.toString() + "% completed!");
  $("#progress").tooltip({'placement': 'left'}); 
  $("#total").text(data.total);
  $("#done").text(data.done);
}

function updateMap(info) {
  $("#map .image").hide();
  $("#map .loading").show();
  $("#map .image").load(function () {
    $("#map .loading").hide();
    $("#map .image").show();
  });
  $("#map .image").attr("src", info.url);
  $(".latitude").html(info.latitude);
  $(".longitude").html(info.longitude);
  $(".date").html(info.date);
}
