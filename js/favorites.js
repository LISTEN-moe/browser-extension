/* == EVERYTHING HERE IS A TEST IS REALLY ISN'T ACCESSIBLE WITHOUT LOOKING AT THE SOURCE. == */

var background = chrome.extension.getBackgroundPage();

background.storage.get(function(items) {
	var favorites = items.favorites;
	
	$.each(favorites, function(index, value) {
		$('#favorites-list').append('<div>['+ ('0' + index).slice(-2) + '] ' + value.artist + ' - ' + value.song +'</div>');
	});
	
	$('#text-search').on('keyup', function() {
		$('#favorites-list').empty();
		$.each(search( $('[name="search"]:checked').val(), this.value ), function(index, value) {
			$('#favorites-list').append('<div>['+ ('0' + index).slice(-2) + '] ' + value.artist + ' - ' + value.song +'</div>');
		});
	});
	
	$('[name="search"]').change(function() {
		$('#favorites-list').empty();
		$.each(search( this.value, $('#text-search').val() ), function(index, value) {
			$('#favorites-list').append('<div>['+ ('0' + index).slice(-2) + '] ' + value.artist + ' - ' + value.song +'</div>');
		});
	});
	
	function search(type, value) {
		if (typeof type !== 'undefined' && typeof value !== 'undefined') {
			if (type === 'artist') {
				return $.grep(favorites, function(search) {
					if ( search.artist.toLowerCase().indexOf( value.toLowerCase() ) > -1 )
						return search;
				});
			} else if (type === 'song') {
				return $.grep(favorites, function(search) {
					if ( search.song.toLowerCase().indexOf( value.toLowerCase() ) > -1 )
						return search;
				});
			} else {
				throw Error('Search term must either be "Artist" or "Song".');
			}
		} else
			throw Error('Must pass search type and term. Search type can be either "Artist" or "Song".');
	}
	
});