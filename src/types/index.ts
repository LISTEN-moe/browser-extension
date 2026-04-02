export type RadioType = 'JPOP' | 'KPOP';

export interface Source {
	id: number;
	name: string;
	nameRomaji: string | null;
	image: string | null;
}

export interface Artist {
	id: number;
	name: string;
	nameRomaji: string | null;
	image: string | null;
	characters: {
		id: number;
	}[];
}

export interface Character {
	id: number;
	name: string;
	nameRomaji: string | null;
	image: string | null;
}

export interface Album {
	id: number;
	name: string | null;
	nameRomaji: string | null;
	image: string | null;
}

export interface Requester {
	uuid: string;
	username: string;
	displayName: string;
}

export interface RadioEvent {
	name: string;
}

export interface WsSong {
	id: number;
	title: string;
	sources: Source[];
	artists: Artist[];
	characters: Character[] | undefined;
	albums: Album[];
	duration: number;
}

/* WebSocket wire types */
export interface WsTrackUpdateData {
	song: WsSong;
	requester: Requester | null;
	event: RadioEvent | null;
	startTime: string;
	lastPlayed: WsSong[];
	listeners: number;
}

export interface WsMessage {
	op: number;
	t?: string;
	d: WsTrackUpdateData;
}

export interface Song extends WsSong {
	coverData: string | null;
	favorite: boolean;
}

export interface RadioData {
	song: Song;
	requester: Requester | null;
	event: RadioEvent | null;
	listeners: number;
}

export interface RadioState {
	isPlaying: boolean;
	radioType: RadioType;
	volume: number;
	token: string | null;
	data: RadioData | null;
}

export interface RadioSettings {
	volume: number;
	enableAutoplay: boolean;
	enableNotifications: boolean;
	enableEventNotifications: boolean;
	useFallbackStream: boolean;
	radioType: RadioType;
}

/* Messages: popup → background */
export type BackgroundMessage
	= { target: 'background'; type: 'NOW_PLAYING_NOTIFICATION'; }
	| { target: 'background'; type: 'SET_VOLUME'; volume: number; }
	| { target: 'background'; type: 'TOGGLE_FAVORITE'; }
	| { target: 'background'; type: 'TOGGLE_PLAY'; }
	| { target: 'background'; type: 'TOGGLE_TYPE'; };

/* Messages: background → offscreen (Chrome MV3 only) */
export type OffscreenMessage
	= { target: 'offscreen'; type: 'AUDIO_PAUSE'; }
	| { target: 'offscreen'; type: 'AUDIO_PLAY'; src: string; }
	| { target: 'offscreen'; type: 'AUDIO_SET_METADATA'; title: string; artist: string; coverUrl: string | null; }
	| { target: 'offscreen'; type: 'AUDIO_SET_VOLUME'; volume: number; }
	| { target: 'offscreen'; type: 'GET_PLAYBACK_STATE'; };

/* Offscreen → background response for GET_PLAYBACK_STATE */
export interface PlaybackStateResponse {
	isPlaying: boolean;
}

/* Messages: background → popup (via port) */
export interface StateUpdateMessage {
	type: 'STATE_UPDATE';
	state: RadioState;
}

export interface GraphQLResponse<T> {
	data: T | null;
	errors?: {
		message: string;
	}[];
}
