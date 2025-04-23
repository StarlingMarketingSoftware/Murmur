import { Extension } from '@tiptap/core';

const SignatureDiv = Extension.create({
	name: 'signatureDiv',

	addOptions() {
		return {
			HTMLAttributes: {},
		};
	},

	addGlobalAttributes() {
		return [
			{
				types: ['div'],
				attributes: {
					id: {
						default: null,
						parseHTML: (element) => element.getAttribute('id'),
						renderHTML: (attributes) => {
							if (attributes.id === 'signature') {
								return { id: 'signature' };
							}
							return {};
						},
					},
				},
			},
		];
	},

	parseHTML() {
		return [
			{
				tag: 'div#signature',
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', HTMLAttributes, 0];
	},
});
