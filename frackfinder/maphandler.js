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
  var img = $("<img>");
  img.attr("src", info.url);
  $("#map").html(img);
  $(".latitude").html(info.latitude);
  $(".longitude").html(info.longitude);
  $(".date").html(info.date);
}
