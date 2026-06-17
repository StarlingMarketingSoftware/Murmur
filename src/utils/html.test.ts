import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	formatHTMLForEmailClients,
	replaceLineBreaksWithRichTextTags,
	convertAiResponseToRichTextEmail,
} from './html';

// Regression: already-wrapped draft HTML (<div>/<br> only — no single-letter tags)
// must NOT be HTML-escaped when sent. Previously the looksLikeHtml regex only matched
// single-letter tag names, so this body was treated as plain text and escaped, producing
// literal "<div ...>" / "<br>" text in the delivered email.
test('formatHTMLForEmailClients does not escape already-wrapped <div>/<br> HTML', () => {
	const input = '<div style="font-family: Arial;">Hi<br><br>ben</div>';
	const out = formatHTMLForEmailClients(input);

	assert.ok(!out.includes('&lt;'), `body was HTML-escaped: ${out}`);
	assert.ok(out.includes('<br>'), `expected real <br> tags: ${out}`);
	// Single outer wrapper div, not a nested/re-escaped one.
	assert.match(out, /^<div\b[^>]*>[\s\S]*<\/div>$/i);
});

test('formatHTMLForEmailClients is idempotent on real HTML', () => {
	const input = '<div style="font-family: Arial;">Hi<br><br>ben</div>';
	const once = formatHTMLForEmailClients(input);
	const twice = formatHTMLForEmailClients(once);

	assert.ok(!twice.includes('&lt;'), `second pass escaped HTML: ${twice}`);
	assert.equal(twice, once);
});

test('formatHTMLForEmailClients still escapes genuine plain text', () => {
	const out = formatHTMLForEmailClients('price < 5 & you win');
	assert.ok(out.includes('&lt;'), `expected "<" to be escaped: ${out}`);
	assert.ok(out.includes('&amp;'), `expected "&" to be escaped: ${out}`);
});

test('replaceLineBreaksWithRichTextTags wraps plain text without escaping its own tags', () => {
	const out = replaceLineBreaksWithRichTextTags('Hi\n\nben', 'Arial');
	assert.equal(out, '<div style="font-family: Arial;">Hi<br><br>ben</div>');
});

test('replaceLineBreaksWithRichTextTags preserves embedded HTML (e.g. links)', () => {
	const out = replaceLineBreaksWithRichTextTags(
		'Visit <a href="https://example.com">site</a>',
		'Arial'
	);
	assert.ok(!out.includes('&lt;a'), `link tag was escaped: ${out}`);
	assert.ok(out.includes('<a href="https://example.com">'), out);
});

test('convertAiResponseToRichTextEmail on plain text produces clean wrapped HTML', () => {
	const out = convertAiResponseToRichTextEmail('Hi\n\nben', 'Arial', null);
	assert.ok(!out.includes('&lt;'), `output was escaped: ${out}`);
	assert.equal(out, '<div style="font-family: Arial;">Hi<br><br>ben</div>');
});
