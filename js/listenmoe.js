$(window).on('hashchange', () => {
	var auth_token = localStorage['satellizer_token'] ? localStorage['satellizer_token'] : null;
	chrome.storage.local.set({auth_token: auth_token});
	if (window.location.hash === '#/favorites' || window.location.hash === '#/songs') initRandomRequests();
});

$(document).ready(() => {
	if (window.location.hash === '#/favorites' || window.location.hash === '#/songs') initRandomRequests();
});

function initRandomRequests() {
	setTimeout(() => {
		$('.nav-center').append(`<div class="random-song" style="position:absolute;top:60px;cursor:pointer;">Request Random Favorite</div>`);
		$('.random-song').data('enabled', true);
		$('.random-song').click(function() {
			if ( $(this).data('enabled') ) {
				console.log('Randomly requesting one of the user\'s favorites.');
				$(this).data('enabled', false);
				$.ajax({
					url: '/api/user/favorites',
					type: 'GET',
					headers: {
						'Authorization': 'Bearer ' + localStorage['satellizer_token']
					},
					dataType: 'json',
					success: function(data) {
						if (data.success === true) {
							var availableSongs = data.songs.filter(s => s.enabled !== false);
							var randomSong = Math.floor(Math.random() * (availableSongs.length - 1));
							console.debug(window.location.hash, randomSong);
							console.log(availableSongs[randomSong]);
							setTimeout(() => doRequestSong(availableSongs[randomSong], data.extra.requests), 1000); // Cause rate-limits
						} else {
							console.error(data.message);
						}
					}
				});
			} else {
				console.log('Hold up fam. Wait for the previous request to finish.');
			}
		});
	}, 500);
}

function doRequestSong(songInfo, requestsRemaining) {
	$.ajax({
		url: '/api/songs/request',
		type: 'POST',
		headers: {
			'Authorization': 'Bearer ' + localStorage['satellizer_token']
		},
		data: {"song": songInfo.id},
		success: function(data) {
			if (data.success) {
				sweetAlert("Success!", `${songInfo.artist ? songInfo.artist + ' -' : ''} ${songInfo.title} has been randomly requested!`, "success");
				$('span.nav-item.ng-binding').text((requestsRemaining - 1) + ' Requests Left');
			} else {
				sweetAlert("Oops...!", "Something went wrong. Error code: " + data.message, "error");
			}
		},
		complete: function() {
			$('.random-song').data('enabled', true);
		}
	});
}
