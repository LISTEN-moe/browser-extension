// Shortcut for chrome.extension.getBackgroundPage(). Allows me to execute background.js functions
var background = chrome.extension.getBackgroundPage();

var auth_token;

background.storage.get(function(items) {
	auth_token = items.auth_token;
});

$(function() {

	// Get Info on Popup open
 jetFuelCantMeltDankAnimeMemes();

 //Set Interval to check for updated info every 10 seconds
 setInterval(jetFuelCantMeltDankAnimeMemes, 10000);

	// Initialize Volume Slider
	$('#volume-slider').slider({
		min: 0, max: 100, range: 'min', value: background.radio.getVol(),
		slide: function(event, ui) {
			background.radio.setVol(ui.value);
		}
	});

	// Sets Play/Pause depending on player status
	if ( background.radio.isPlaying() ) {
		$('.playpause').removeClass('glyphicon-play');
		$('.playpause').addClass('glyphicon-pause');
	}

	// Enable/Disable Player
	$(document).on('click', '.playpause', function() {
		if ( background.radio.isPlaying() ) {
			$('.playpause')
				.removeClass('glyphicon-pause')
				.addClass('glyphicon-play');
			background.radio.disable();
		} else {
			$('.playpause')
				.removeClass('glyphicon-play')
				.addClass('glyphicon-refresh');
			background.radio.enable();
		}
	});

	// Handles Play/Pause icons. Changes icon depending on the player status.
	$(background.player).on('play abort loadstart', function(e) {
		console.log(e.type);
		if (e.type === 'play') {
			$('.playpause')
				.removeClass('glyphicon-play')
				.removeClass('glyphicon-refresh')
				.addClass('glyphicon-pause');
		}
	});

	// Random Ram or Rem
	Math.floor(Math.random() * 2) ? $('#ram_rem').css('background-position-x', '4px') : $('#ram_rem').css('background-position-x', '72px');

	background.storage.get(function(items) {
		// Does Autoplay checkbox
		$('#radio-autoplay').prop('checked', items.ListenMoeAutoPlay).change(function() {
			background.storage.set({ListenMoeAutoPlay: this.checked});
		});
	});

	// Check if Token exist
	if (!auth_token) {
		$('#favs a').prop('href', 'https://listen.moe/#/auth').text('Login');
	} else {
		$('#favs a').prop('href', 'https://listen.moe/#/favorites').text('View Favorites');
		$('.toggle-favorite').show();
	}

	// Favorites Button
	$(document).on('click', '.toggle-favorite', favorites.update);

});

function jetFuelCantMeltDankAnimeMemes() {
	$.ajax({
		url: 'https://listen.moe/api/info/poll',
		type: 'GET',
		dataType: 'JSON',
		success: function(data) {

			//console.log(data);

			$('#current-listeners').text(data.listeners);

			var name = '';

	    if (data.artist_name != '')
	        name = data.artist_name;

	    if (data.song_name != '')
	        if (data.artist_name == '')
	            name = data.song_name;
	    			else
	    				name = name + ' - ' + data.song_name;

			$('#now-playing-info').text('Now playing: ' + name);

			if (data.requested_by) {
				$('#now-playing-request').show();
				$('#request-username').prop('href', 'https://forum.listen.moe/u/' + data.requested_by).text(data.requested_by);
			} else {
				$('#now-playing-request').hide();
				$('#request-username').prop('href', '').text('');
			}

			//Favorites
			if (auth_token) {
				$('.toggle-favorite').attr('data-song_id', data.song_id);
				favorites.check(data.song_id);
			}

		}
	});
}

function open_old_favorites() {
	window.open(chrome.runtime.getURL("favorites.html"));
}

var favorites = {
	isFavorited: null,
	check: function(song_id) {
		var _this = this;
		$.ajax({
			url: 'https://listen.moe/api/songs/favorites/lite',
			type: 'GET',
			headers: { 'Authorization': 'Bearer ' + auth_token },
			success: function(data) {
				var favorites = JSON.parse(data);

				_this.isFavorited = favorites.songs.some(function(a) {
					return a.id === song_id.toString();
				});

				if (_this.isFavorited) {
					$('.toggle-favorite').removeClass('glyphicon-star-empty');
				} else {
					$('.toggle-favorite').addClass('glyphicon-star-empty');
				}

			},
			error: function(data) {
				var response = JSON.parse(data.responseText);
				switch (response.error) {
					case 'token_not_provided':
					case 'token_expired':
					case 'token_absent':
					case 'token_invalid':
						$('#favs a').prop('href', 'https://listen.moe/#/auth').text('Login');
						$('.toggle-favorite').hide();
				}
			}
		});
	},
	update: function() {
		var _this = this;
		var song_id = $('.toggle-favorite').attr('data-song_id');
		$.ajax({
			url: 'https://listen.moe/api/songs/favorite',
			type: 'POST',
			headers: { 'Authorization':'Bearer ' + auth_token },
			contentType: 'application/json;charset=UTF-8',
			data: JSON.stringify({"song": song_id}),
			success: function(data) {
				var data = JSON.parse(data);
				if (data.data === "0") {
					_this.isFavorited = false;
					$('.toggle-favorite').addClass('glyphicon-star-empty');
				} else if (data.data === "1") {
					_this.isFavorited = true;
					$('.toggle-favorite').removeClass('glyphicon-star-empty');
				}
			}
		});
	}
}

// Print Play History in Console
function printHistory() {
	var count = 1;
	background.storage.get(function(a) {
		var history = a.history.map(function(x) {
			//return '['+ count++ +'] ' + x.artist + ' - ' + x.song;
			return `[${('0' + count++).slice(-2)}] ${x.artist} - ${x.song}`;
		}).join('\n');
		console.log('Play History:\n' + history);
	});
}
