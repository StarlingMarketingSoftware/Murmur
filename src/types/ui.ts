export type Logo = {
	fileName: string;
	width: number;
	darkFileName?: string;
};

export type Review = {
	text: string;
	fullName: string;
	company: string;
	photoUrl?: string;
};

export type FAQ = {
	question: string;
	answer: string;
};
