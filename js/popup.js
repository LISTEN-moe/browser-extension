// Shortcut for chrome.extension.getBackgroundPage(). Allows me to execute background.js functions
var background = chrome.extension.getBackgroundPage();

background.storage.get(function(items) {
	
	// Get Info on Popup open
	jetFuelCantMeltDankAnimeMemes();

	// Set Interval to check for updated info every 10 seconds
	var listenMoe_NowPlaying = setInterval(jetFuelCantMeltDankAnimeMemes, 10000);
	
	// Initialize Volume Slider
	$('#volume-slider').slider({
		min: 0, max: 100, range: 'min', value: background.radio.getVol(),
		slide: function(event, ui) {
			background.radio.setVol(ui.value);
		}
	});
	
	// Does Autoplay checkbox
	$('#radio-autoplay').prop('checked', items.ListenMoeAutoPlay).change(function() {
		background.storage.set({ListenMoeAutoPlay: this.checked});
	});
	
	// Sets Play/Pause depending on player status
	background.radio.isPlaying() ? $('.playpause').addClass('glyphicon-pause') : $('.playpause').removeClass('glyphicon-pause');
	
	// Enable/Disable Player
	$(document).on('click', '.playpause', function() {
		if ( background.radio.isPlaying() ) {
			$('.playpause').removeClass('glyphicon-pause');
			background.radio.disable();
		} else {
			$('.playpause').addClass('glyphicon-pause');
			background.radio.enable();
		}
	});
});

// Get Info Function
function jetFuelCantMeltDankAnimeMemes() {
	$.ajax({
		url: 'https://listen.moe/stats.json',
		type: 'GET',
		dataType: 'json',
		success: function(data) {
			
			console.log(data);
			
			var name = '';

            if(data.artist_name != '')
                name = data.artist_name;

            if(data.song_name != '')
                if(data.artist_name == '')
                    name = data.song_name;
                else
                    name = name + ' - ' + data.song_name;
				
			$('#now-playing-info').text('Now playing: ' + name);
			$('#current-listeners').text(data.listeners);

			if(data.requested_by)
				$('#now-playing-request').html('Requested by <a target="_blank" href="https://forum.listen.moe/u/' + data.requested_by + '">' + data.requested_by + '</a>');
			else
				$('#now-playing-request').text('');
		}
	});
}
