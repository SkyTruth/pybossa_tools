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
  $("#site_lat").html(info.latitude);
  $("#site_lon").html(info.longitude);
  $("#site_county").html(info.county);
  $("#site_year").html(info.year);
  $("#site_id").html(info.siteID);
  
}
