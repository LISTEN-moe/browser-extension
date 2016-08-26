// Shortcut for chrome.extension.getBackgroundPage(). Allows me to execute background.js functions
var background = chrome.extension.getBackgroundPage();

background.storage.get(function(a) {console.log(a)});

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
	if (e.type === 'play') {
		$('.playpause')
			.removeClass('glyphicon-play')
			.removeClass('glyphicon-refresh')
			.addClass('glyphicon-pause');
	} else if (e.type === 'abort') {
		$('.playpause')
			.removeClass('glyphicon-pause')
			.addClass('glyphicon-play');
	}
});

background.storage.get(function(items) {
	// Does Autoplay checkbox
	$('#radio-autoplay').prop('checked', items.ListenMoeAutoPlay).change(function() {
		background.storage.set({ListenMoeAutoPlay: this.checked});
	});
});

var favorites = {
	list: [],
	check: function(info) {
		background.storage.get(function(items) {
			if ('favorites' in items) {
				favorites.list = items.favorites;
				var favoriteIndex = items.favorites.map(function(a, b) {
					return a.song === info.song;
				}).findIndex(function(a, b) {
					return a === true;
				});
				if (favoriteIndex > -1) {
					$('.toggle-favorite').data({
						'isFavorited': true,
						'index': favoriteIndex
					}).removeClass('glyphicon-star-empty');
				} else {
					$('.toggle-favorite').data({
						'isFavorited': false,
						'info': info
					}).addClass('glyphicon-star-empty');
				}
			} else {
				$('.toggle-favorite').data({
					'isFavorited': false,
					'info': info
				}).addClass('glyphicon-star-empty');
			}
			
		});
	},
	update: function() {
		var button = $('.toggle-favorite');
		background.storage.get(function(items) {
			if ( button.data('isFavorited') === true ) {
				items.favorites.splice(button.data('index'), 1);
				background.storage.set({ favorites: items.favorites });
				button.addClass('glyphicon-star-empty');
			} else {
				var favorites = [];
				if ('favorites' in items) favorites = items.favorites;
				favorites.push( button.data('info') );
				console.log(favorites);
				background.storage.set({favorites: favorites});
				button.removeClass('glyphicon-star-empty');
			}
		});
	},
	search: function(type, value) {
		if (typeof type !== 'undefined' && typeof value !== 'undefined') {
			if (type === 'artist') {
				return $.grep(this.list, function(search) {
					if ( search.artist.toLowerCase().indexOf( value.toLowerCase() ) > -1 )
						return search;
				});
			} else if (type === 'song') {
				return $.grep(this.list, function(search) {
					if ( search.song.toLowerCase().indexOf( value.toLowerCase() ) > -1 )
						return search;
				});
			} else {
				return console.error('Search term must either be "Artist" or "Song".');
			}
		} else
			return console.error('Must pass search type and term. Search type can be either "Artist" or "Song".');
	}
}

// Favorites
$(document).on('click', '.toggle-favorite', favorites.update);

// Get Info Function
function jetFuelCantMeltDankAnimeMemes() {
	$.ajax({
		url: 'https://listen.moe/stats.json',
		type: 'GET',
		dataType: 'json',
		success: function(data) {
			
			favorites.check({artist: data.artist_name, song: data.song_name});
			
			var name = '';

            if (data.artist_name != '')
                name = data.artist_name;

            if (data.song_name != '')
                if (data.artist_name == '')
                    name = data.song_name;
                else
                    name = name + ' - ' + data.song_name;
				
			$('#now-playing-info').text('Now playing: ' + name);
			$('#current-listeners').text(data.listeners);

			if (data.requested_by) {
				$('#now-playing-request').show();
				$('#request-username').prop('href', 'https://forum.listen.moe/u/' + data.requested_by).text(data.requested_by);
			} else {
				$('#now-playing-request').hide();
				$('#request-username').prop('href', '').text('');
			}
		}
	});
}