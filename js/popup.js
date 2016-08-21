// Shortcut for chrome.extension.getBackgroundPage(). Allows me to execute background.js functions
var background = chrome.extension.getBackgroundPage();

chrome.storage.local.get(function(items) {
	
		// Get Info on Popup open
		jetFuelCantMeltDankAnimeMemes();
		
		// Set Interval to check for updated info every 10 seconds
		var listenMoe_NowPlaying = setInterval(jetFuelCantMeltDankAnimeMemes, 10000);
		
		// Get Info Function
		function jetFuelCantMeltDankAnimeMemes() {
			$.ajax({
				url: 'https://listen.moe/stats.json',
				type: 'GET',
				dataType: 'json',
				success: function(data) {
					console.log(data);
					$('#now-playing-artist').text(data.artist_name);
					$('#now-playing-song').text(data.song_name);
					$('#current-listeners').text(data.listeners);
					if (data.requested_by) $('#now-playing-request').text('requested by ' + data.requested_by);
				}
			});
		}
		
		// Initialize Volume Slider
		$('#volume-slider').slider({
			min: 0, max: 100, range: 'min', value: background.radio.getVol(),
			slide: function(event, ui) {
				background.radio.setVol(ui.value);
			}
		});
		
		// Does Autoplay checkbox
		$('#radio-autoplay').prop('checked', items.ListenMoeAutoPlay).change(function() {
			if (this.checked == true) {
				$(this).parent().css('background', '#EC1A55');
			} else {
				$(this).parent().css('background', 'none');
			}
			background.storage.set({ListenMoeAutoPlay: this.checked});
		});
		
		$('#radio-autoplay').prop('checked') ? $('#radio-autoplay').parent().css('background', '#EC1A55') : $('#radio-autoplay').parent().css('background', 'none');
		
		// Sets Play/Pause depending on player status
		if ( background.radio.isPlaying() ) {
			$('.playpause').addClass('glyphicon-pause');
		} else {
			$('.playpause').removeClass('glyphicon-pause');
		}
		
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

/* Custom Checkbox */
function startCustomCheckbox() {
	$('input[type="checkbox"]').each(function() {
		var _self = $(this);
		
	});
}