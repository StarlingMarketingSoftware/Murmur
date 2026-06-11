export type VenueMessageActionKind = 'invite-to-connect';

export type SerializedVenueMessageAction = {
	kind: VenueMessageActionKind;
	label: string;
};

const VENUE_ACTION_PREFIX = '[[murmur:venue-action:';
const VENUE_ACTION_SUFFIX = ']]';
const VENUE_INVITE_TO_CONNECT_MARKER = `${VENUE_ACTION_PREFIX}invite-to-connect${VENUE_ACTION_SUFFIX}`;

export const VENUE_INVITE_TO_CONNECT_LABEL = 'Invite to connect';

export const buildVenueInviteToConnectBody = () =>
	`${VENUE_INVITE_TO_CONNECT_MARKER}\n${VENUE_INVITE_TO_CONNECT_LABEL}`;

export const parseVenueMessageAction = (
	body: string
): SerializedVenueMessageAction | null => {
	const trimmed = body.trimStart();
	if (!trimmed.startsWith(VENUE_INVITE_TO_CONNECT_MARKER)) return null;

	return {
		kind: 'invite-to-connect',
		label: VENUE_INVITE_TO_CONNECT_LABEL,
	};
};

export const stripVenueMessageActionMarker = (body: string): string => {
	const action = parseVenueMessageAction(body);
	if (!action) return body;

	const trimmed = body.trimStart();
	const withoutMarker = trimmed.slice(VENUE_INVITE_TO_CONNECT_MARKER.length).trim();
	return withoutMarker || action.label;
};
