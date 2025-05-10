import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

export const API_MESSAGES = {
	SUCCESS: {
		DEFAULT: 'Success',
		CREATED: 'Resource created successfully',
		UPDATED: 'Resource updated successfully',
		DELETED: 'Resource deleted successfully',
	},
	ERROR: {
		DEFAULT: 'Internal Server Error',
		NOT_FOUND: 'Resource not found',
		VALIDATION: 'Validation failed',
		BAD_REQUEST: 'Bad request',
	},
	AUTH: {
		UNAUTHORIZED: 'Unauthorized, no user found',
		UNAUTHORIZED_FOR_RESOURCE: 'Unauthorized, resource does not belong to user',
		ADMIN: 'Admin access required',
		INVALID_TOKEN: 'Invalid authentication token',
	},
} as const;

/* Success Responses */
export const apiResponse = <T,>(data: T): NextResponse => {
	return NextResponse.json(data, { status: 200 });
};

export const apiCreated = <T,>(data: T): NextResponse => {
	return NextResponse.json(data, { status: 201 });
};

export const apiAccepted = <T,>(data: T): NextResponse => {
	return NextResponse.json(data, { status: 202 });
};

export const apiNoContent = (): NextResponse => {
	return new NextResponse(null, { status: 204 });
};

/* Error Responses */
export const apiBadRequest = (
	message: string | ZodError = API_MESSAGES.ERROR.BAD_REQUEST
): NextResponse => {
	let _message = message;
	if (message instanceof ZodError) {
		_message = message.errors.toString();
	}
	return NextResponse.json({ success: false, error: _message }, { status: 400 });
};

export const apiUnauthorized = (
	message: string = API_MESSAGES.AUTH.UNAUTHORIZED
): NextResponse => {
	return NextResponse.json({ success: false, error: message }, { status: 401 });
};

export const apiUnauthorizedResource = (
	message: string = API_MESSAGES.AUTH.UNAUTHORIZED_FOR_RESOURCE
): NextResponse => {
	return NextResponse.json({ success: false, error: message }, { status: 401 });
};

export const apiForbidden = (message: string = API_MESSAGES.AUTH.ADMIN): NextResponse => {
	return NextResponse.json({ success: false, error: message }, { status: 403 });
};

export const apiNotFound = (
	message: string = API_MESSAGES.ERROR.NOT_FOUND
): NextResponse => {
	return NextResponse.json({ success: false, error: message }, { status: 404 });
};

export const apiServerError = (
	message: string = API_MESSAGES.ERROR.DEFAULT
): NextResponse => {
	return NextResponse.json({ success: false, error: message }, { status: 500 });
};

export const handleApiError = (error: Error | unknown): NextResponse => {
	console.error(error);
	if (error instanceof z.ZodError) {
		return apiBadRequest(`Validation error: ${error.message}`);
	}
	if (error instanceof Error) {
		return apiServerError(error.message);
	}
	return apiServerError();
};

/* General Functions */
