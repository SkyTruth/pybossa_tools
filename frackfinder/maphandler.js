var map;
var progress_done = 0;

function loadMap() {
}

var atta_girl_phrases = [
	"Nicely done!",
	"Keep up the good work!",
	"You rock out loud!",
	"Who’s better than you?",
	"This is freaking awesome!",
	"Fan-freaking-tastic!!",
	"Great job!",
	"You’re kicking butt!",
	"Your help is GREATLY appreciated!",
	"High five!",
	"Fabulous job!",
	"You do nice work, you know that?",
	"We couldn’t do this without you!",
	"Who knew you were this talented?",
	"What a tremendous help!",
	"Hurray, great progress!",
	"Dynamite!"
];
function get_atta_girl (interval_size, progress) {
	if ((interval_size - 1) == (progress) % interval_size)
		return '<strong><i class="icon-thumbs-up"></i> ' + atta_girl_phrases[Math.floor((progress + 1) / interval_size) % atta_girl_phrases.length] + "</strong>";
	else
		return '<strong>Your Progress</strong>';
}
	
function setProgress(data) {
  var pct = Math.round((data.done*100)/data.total);
  $("#progress").css("width", pct.toString() +"%");
  $("#progress").attr("title", pct.toString() + "% completed!");
  $("#progress").tooltip({'placement': 'left'}); 
  $("#total").text(data.total);
  $("#done").text(data.done);
  progress_done = parseInt(data.done || 0)
  $("#progressmsg").html(get_atta_girl(5,progress_done));
}

function updateMap(info) {
  $("#map .image").hide();
  $("#map .imgoverlay").hide();
  $("#map .loading").show();
  $("#map .image").load(function () {
    $("#map .loading").hide();
    $("#map .image").show();
    $("#map .imgoverlay").show();
  });
  $("#map .image").attr("src", info.url);
  $("#site_lat").html(info.latitude);
  $("#site_lon").html(info.longitude);
  $("#site_county").html(info.county);
  $("#site_year").html(info.year);
  $("#site_id").html(info.siteID);
  
}
