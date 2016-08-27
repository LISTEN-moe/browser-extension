/* == EVERYTHING HERE IS A TEST IS REALLY ISN'T ACCESSIBLE WITHOUT LOOKING AT THE SOURCE. == */

var background = chrome.extension.getBackgroundPage();

background.storage.get(function(items) {
	
	var favorites = items.favorites;
	
	$.each(favorites, function(index, value) {
		$('#favorites-list tbody').append('<tr id='+index+' class="item"><td>'+index+'</td><td>'+value.artist+'</td><td>'+value.song+'</td><td><a href="javascript:void(0)" class="remove" data-index='+index+'>Remove</a></td></tr>');
	});
	
	$('#text-search').on('keyup', function() {
		$('.item').hide();
		$.each( search( $('[name="search"]:checked').val(), this.value ), function() {
			$('#' + this.index).show();
		});
	});
	
	$('[name="search"]').change(function() {
		$('.item').hide();
		$.each(search( this.value, $('#text-search').val() ), function() {
			$('#' + this.index).show();
		});
	});
	
	/* $('#text-search').on('keyup', function() {
		$('#favorites-list').empty();
		$.each(search( $('[name="search"]:checked').val(), this.value ), function(index, value) {
			$('#favorites-list').append('<div>['+ ('0' + index).slice(-2) + '] ' + value.artist + ' - ' + value.song +'</div>');
		});
	}); */
	
	/* $('[name="search"]').change(function() {
		$('#favorites-list').empty();
		$.each(search( this.value, $('#text-search').val() ), function(index, value) {
			$('#favorites-list').append('<div>['+ ('0' + index).slice(-2) + '] ' + value.artist + ' - ' + value.song +'</div>');
		});
	}); */
	
	function search(type, value) {
		if (typeof type !== 'undefined' && typeof value !== 'undefined') {
			if (type === 'artist') {
				return $.grep(favorites, function(search, index) {
					if ( search.artist.toLowerCase().indexOf( value.toLowerCase() ) !== -1 ) {
						search.index = index
						return search;
					}
				});
			} else if (type === 'song') {
				return $.grep(favorites, function(search, index) {
					if ( search.song.toLowerCase().indexOf( value.toLowerCase() ) > -1 ) {
						search.index = index
						return search;
					}
				});
			} else {
				throw Error('Search term must either be "Artist" or "Song".');
			}
		} else
			throw Error('Must pass search type and term. Search type can be either "Artist" or "Song".');
	}
});

$(document).on('click', '.remove', function() {
	var index = $(this).attr('data-index');
	background.storage.get(function(items) {
		items.favorites.splice(index, 1);
		background.storage.set({ favorites: items.favorites });
	});
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
	for (key in changes) {
		if ( key == "favorites" ) {
			$('.item').remove();
			$.each(changes[key].newValue, function(index, value) {
				$('#favorites-list tbody').append('<tr id='+index+' class="item"><td>'+index+'</td><td>'+value.artist+'</td><td>'+value.song+'</td><td><a href="javascript:void(0)" class="remove" data-index='+index+'>Remove</a></td></tr>');
			});
		}
	}
});

function sort(a, b) {
	if (typeof a !== 'undefined') {
		a.sort();
	}
} 

