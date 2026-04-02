import type { GraphQLResponse } from '@/types';

const GRAPHQL_ENDPOINT = 'https://listen.moe/graphql';

/**
 * Sends an authenticated GraphQL request to the LISTEN.moe API.
 *
 * @param token - The user's authentication token.
 * @param operationName - The GraphQL operation name.
 * @param query - The GraphQL query or mutation string.
 * @param variables - Variables to pass to the operation.
 * @returns The parsed GraphQL response.
 */
async function graphqlRequest<T>(
	token: string,
	operationName: string,
	query: string,
	variables: Record<string, unknown>,
): Promise<GraphQLResponse<T>> {
	const response = await fetch(GRAPHQL_ENDPOINT, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ operationName, query, variables }),
	});

	return response.json() as Promise<GraphQLResponse<T>>;
}

/**
 * Toggles the favorite status of a song for the authenticated user.
 * Throws if the API returns any errors.
 *
 * @param token - The user's authentication token.
 * @param songId - The ID of the song to favorite/unfavorite.
 */
export async function toggleFavoriteSong(token: string, songId: number): Promise<void> {
	const result = await graphqlRequest<{ favoriteSong: { id: number; }; }>(
		token,
		'favoriteSong',
		`mutation favoriteSong($id: Int!) {
			favoriteSong(id: $id) { id }
		}`,
		{ id: songId },
	);

	if (result.errors?.length) {
		throw new Error(result.errors[0].message);
	}
}

/**
 * Checks whether a song is in the authenticated user's favorites.
 * Returns `false` if the API response contains no data.
 *
 * @param token - The user's authentication token.
 * @param songId - The ID of the song to check.
 * @returns `true` if the song is favorited, `false` otherwise.
 */
export async function checkFavoriteSong(token: string, songId: number): Promise<boolean> {
	const result = await graphqlRequest<{ checkFavorite: number[]; }>(
		token,
		'checkFavorite',
		`query checkFavorite($songs: [Int!]!) {
			checkFavorite(songs: $songs)
		}`,
		{ songs: [songId] },
	);

	if (!result.data) {
		return false;
	}

	return result.data.checkFavorite.includes(songId);
}
