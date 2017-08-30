/* Shortcut for chrome.extension.getBackgroundPage(). Allows me to execute background.js functions */
var background = chrome.extension.getBackgroundPage();
var radio = background.radio;

setInfo();
background.addEventListener('songChanged', setInfo);

function setInfo() {
	
	var data = radio.data;

	/* Sets Current Listners */
	$('#current-listeners').text(data.listeners);

	/* Sets Now Playing Info */
	$('#now-playing-info span').text(`${data.artist_name ? data.artist_name + ' -' : ''} ${data.song_name} ${data.anime_name ? '[' + data.anime_name + ']' : ''}`);

	/* Sets Requester Info */
	if (data.requested_by) {
		if (/\s/g.test(data.requested_by)) {
			$('#now-playing-request').show().text('🎉 ' + data.requested_by + ' 🎉');
		} else {
			$('#now-playing-request').show().text('Requested by ' + data.requested_by);
		}
	} else {
		$('#now-playing-request').hide().text('');;
	}

	/* Saves Song ID */
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

	} else {
		
		$('#favs a').prop('href', 'https://listen.moe/#/auth').text('Login');

	}

}

$(function() {

	/* Does Scrolling Text */
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

	/* Initialize Volume Slider */
	$('#volume-slider').slider({
		min: 0, max: 100, range: 'min', value: radio.getVol(),
		slide: function(event, ui) {
			radio.setVol(Math.floor(ui.value));
		}
	});

	/* Sets Play/Pause depending on player status */
	if (!radio.isPlaying()) $('.playpause').removeClass('glyphicon-pause');

	/* Enable/Disable Player */
	$('.playpause').click(function() {
		if (radio.isPlaying()) {
			$('.playpause').removeClass('glyphicon-pause');
			radio.disable();
		} else {
			$('.playpause').addClass('glyphicon-pause');
			radio.enable();
		}
	});

	background.storage.get({ enableAutoplay: false }, function(items) {
		$('#radio-autoplay').prop('checked', items.enableAutoplay).change(function() {
			background.storage.set({ enableAutoplay: this.checked });
		});
	});

	/* Favorites Button */
	$('.toggle-favorite').click(function() {
		var songID = $(this).data('id');
		background.radio.toggleFavorite(songID).then(function(favorited) {
			if (favorited)
				$('.toggle-favorite').removeClass('glyphicon-star-empty');
			else
				$('.toggle-favorite').addClass('glyphicon-star-empty');
		}).catch(console.error);
	});

	/* Opens Keyboard Shortcuts */
	$('#settings a').click(function() {
		chrome.runtime.openOptionsPage();
	});

	/* Radom character */


});

/* Copies text. Nothing more. */
function copyText(text) {
	var input = document.createElement('textarea');
	document.body.appendChild(input);
	input.value = text;
	input.focus();
	input.select();
	document.execCommand('Copy');
	input.remove();
}