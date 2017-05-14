// Shortcut for chrome.extension.getBackgroundPage(). Allows me to execute background.js functions
var background = chrome.extension.getBackgroundPage();
var token;
var socket;

background.storage.get(items => token = items.auth_token);

(function createSocket() {

	socket = new WebSocket('wss://listen.moe/api/v2/socket');

	socket.onopen = function() {
		console.log('Alright we got a connection. \\o/');
		/* == Need to check if token is valid == */
		if (token) {
			checkAuth(token).then(() => {
				/* == Sending the user token will bring back additional infomation == */
				socket.send(JSON.stringify({token: token}));
			}).catch(() => console.log('Invalid Token Bruh'));
		}
	};

	socket.onerror = function() {
		console.log('Uhh. Something happened');
		$('#now-playing-text').text('An error has occurred. Attempting to reconnect...');
	};

	socket.onclose = function() {
		console.log('Welp. The connection was closed :(');
		console.log('Reconnecting...');
		setTimeout(createSocket, 10000);
	};

	socket.onmessage = function(response) {

		if (response.data !== '') {

			/* == Prepare the data == */
			let data;
			try {data = JSON.parse(response.data)}
			catch (err) {console.error(err)}
			if (!data) return;

			/* == Sets Current Listners == */
			$('#current-listeners').text(data.listeners);

			/* == Sets Now Playing Info  == */
			$('#now-playing-info span').text(`${data.artist_name ? data.artist_name + ' -' : ''} ${data.song_name} ${data.anime_name ? '[' + data.anime_name + ']' : ''}`);

			/* == Sets Requester Info == */
			if (data.requested_by) {
				if (/\s/g.test(data.requested_by)) {
					$('#now-playing-event').show();
					$('#now-playing-event').text('🎉 ' + data.requested_by + ' 🎉');
				} else {
					$('#now-playing-request').show();
					$('#request-username').prop('href', 'https://forum.listen.moe/u/' + data.requested_by).text(data.requested_by);
				}
			} else {
				$('#now-playing-request, #now-playing-event').hide();
				$('#request-username').prop('href', '').text('');
			}

			/* == Saves Song ID == */
			$('.toggle-favorite').data('id', data.song_id);

			if (data.extended) {

				$('#favs a').prop('href', 'https://listen.moe/#/favorites').text('View Favorites');
				$('.toggle-favorite').show();

				if (data.extended.favorite)
					$('.toggle-favorite').removeClass('glyphicon-star-empty');
				else
					$('.toggle-favorite').addClass('glyphicon-star-empty');

				if (data.extended.queue.songsInQueue !== 0) {

					$('#queue-container').show();
					$('#queue-amount').text(data.extended.queue.songsInQueue);

					if (data.extended.queue.hasSongInQueue) {

						$('#queue-user-before, #queue-user').show();
						$('#queue-amount').parent().prop('title', 'You have ' + data.extended.queue.userSongsInQueue + ' queued song(s)').css('cursor', 'help');

						if (data.extended.queue.inQueueBeforeUserSong === 0) $('#queue-user-before-amount').text('The next song is yours!');
						else if (data.extended.queue.inQueueBeforeUserSong === 1) $('#queue-user-before-amount').text('There is ' + data.extended.queue.inQueueBeforeUserSong + ' song before your next song.');
						else $('#queue-user-before-amount').text('There is ' + data.extended.queue.inQueueBeforeUserSong + ' songs before your next song.');

					} else {

						$('#queue-user-before, #queue-user').hide();
						$('#queue-user-before-amount, #queue-user-amount').text('N/A');
						$('#queue-amount').parent().prop('title', '').css('cursor', 'default');

					}

				} else {

					$("#queue-container").hide();
					$('#queue-amount').text('N/A');
					$('#queue-amount').parent().prop('title', '').css('cursor', 'default');

				}

			} else $('#favs a').prop('href', 'https://listen.moe/#/auth').text('Login');

		}

	}

})();

$(function() {


	// Does Scrolling Text
	var timeout;

	timeout = setTimeout(autoScroll, 1000);

	function autoScroll() {
		var time = (Math.floor($('#now-playing-info span').text().length) / 10) * 500;
		if ($('#now-playing-info span').width() > $('#now-playing-info').width()) {
			clearTimeout(timeout);
			$('#now-playing-text').stop().animate({
				'margin-left': '-' + ($('#now-playing-info span').width() - $('#now-playing-info').width()) + 'px'
			}, time, function() {
				timeout = setTimeout(function() {
					$('#now-playing-text').stop().animate({
						'margin-left': '0px'
					}, time / 4, function() {
						timeout = setTimeout(autoScroll, 10000);
					});
				}, 3000);
			});
		}
	}

	$('#now-playing-info').hover(function() {
		if ($('#now-playing-info span').width() > $('#now-playing-info').width()) {
			clearTimeout(timeout);
			$('#now-playing-text').stop().animate({
				'margin-left': '-' + ($('#now-playing-info span').width() - $('#now-playing-info').width()) + 'px'
			}, (Math.floor($('#now-playing-info span').text().length) / 10) * 500);
		}
	}, function() {
		$('#now-playing-text').stop().animate({
			'margin-left': '0px'
		}, ((Math.floor($('#now-playing-info span').text().length) / 10) * 600) / 4, function() {
			timeout = setTimeout(autoScroll, 10000);
		});
	});

	$('#now-playing-info span').click(function(e) {
		copyText(this.innerText);
	});

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
		}
	});

	// Random Ram or Rem
	// Math.floor(Math.random() * 2) ? $('#ram_rem').css('background-position-x', '4px') : $('#ram_rem').css('background-position-x', '72px');

	background.storage.get(function(items) {
		// Does Autoplay checkbox
		$('#radio-autoplay').prop('checked', items.ListenMoeAutoPlay).change(function() {
			background.storage.set({ListenMoeAutoPlay: this.checked});
		});
	});

	// Favorites Button
	$(document).on('click', '.toggle-favorite', function() {
		$.ajax({
			url: 'https://listen.moe/api/songs/favorite',
			type: 'POST',
			headers: { 'Authorization': 'Bearer ' + token},
			contentType: 'application/json;charset=utf-8',
			data: JSON.stringify({ "song": $(this).data('id') }),
			success: function(response) {
				if (response.success) {
					if (response.favorite) {
						$('.toggle-favorite').removeClass('glyphicon-star-empty');
					} else {
						$('.toggle-favorite').addClass('glyphicon-star-empty');
					}
					//socket.send('update');
				} else
					console.log(error);
			},
			error: function(error) {
				console.error(error);
			}
		});
	});

});

/* == Checks to see if token is valid == */
function checkAuth(token) {
	return new Promise(function (fulfill, reject) {
		$.ajax({
			url: "https://listen.moe/api/user",
			type: 'GET',
			headers: { 'Authorization': 'Bearer ' + token},
			success: function(response) {
				fulfill(response);
			},
			error: function(error) {
				reject(error);
			}
		});
	});
}

/* == Copies text. Nothing more. == */
function copyText(text) {
	var input = document.createElement('textarea');
	document.body.appendChild(input);
	input.value = text;
	input.focus();
	input.select();
	document.execCommand('Copy');
	input.remove();
}
