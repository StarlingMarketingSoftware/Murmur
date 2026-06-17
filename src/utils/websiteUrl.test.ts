// Run with: npx tsx --test src/utils/websiteUrl.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWebsiteUrl, websiteHost } from './websiteUrl';

test('normalizeWebsiteUrl: scheme-less paste gets https://', () => {
	assert.equal(normalizeWebsiteUrl('example.com'), 'https://example.com/');
	assert.equal(normalizeWebsiteUrl('www.example.com/path?q=1'), 'https://www.example.com/path?q=1');
});

test('normalizeWebsiteUrl: keeps explicit http/https', () => {
	assert.equal(normalizeWebsiteUrl('http://foo.org'), 'http://foo.org/');
	assert.equal(normalizeWebsiteUrl('https://foo.org/a/b'), 'https://foo.org/a/b');
});

test('normalizeWebsiteUrl: trims whitespace', () => {
	assert.equal(normalizeWebsiteUrl('  example.com  '), 'https://example.com/');
});

test('normalizeWebsiteUrl: rejects non-http(s) schemes', () => {
	assert.equal(normalizeWebsiteUrl('mailto:a@b.com'), null);
	assert.equal(normalizeWebsiteUrl('javascript:alert(1)'), null);
	assert.equal(normalizeWebsiteUrl('ftp://files.example.com'), null);
	assert.equal(normalizeWebsiteUrl('file:///etc/passwd'), null);
	assert.equal(normalizeWebsiteUrl('data:text/html,<h1>x</h1>'), null);
});

test('normalizeWebsiteUrl: rejects empty / single-label / junk hosts', () => {
	assert.equal(normalizeWebsiteUrl(''), null);
	assert.equal(normalizeWebsiteUrl('   '), null);
	assert.equal(normalizeWebsiteUrl(null), null);
	assert.equal(normalizeWebsiteUrl(undefined), null);
	assert.equal(normalizeWebsiteUrl('n/a'), null);
	assert.equal(normalizeWebsiteUrl('tbd'), null);
	assert.equal(normalizeWebsiteUrl('localhost'), null);
});

test('normalizeWebsiteUrl: rejects bracketed IPv6 literals (no dot in canonical host)', () => {
	assert.equal(normalizeWebsiteUrl('http://[::1]/'), null);
	assert.equal(normalizeWebsiteUrl('http://[::ffff:127.0.0.1]/'), null);
	assert.equal(normalizeWebsiteUrl('http://[::ffff:169.254.169.254]/'), null);
});

test('normalizeWebsiteUrl: rejects non-standard ports, keeps default web ports', () => {
	assert.equal(normalizeWebsiteUrl('https://example.com:6379'), null);
	assert.equal(normalizeWebsiteUrl('http://example.com:22/x'), null);
	assert.equal(normalizeWebsiteUrl('https://example.com:8080/'), null);
	// Scheme-default ports are canonicalized away (url.port === '') → allowed.
	assert.equal(normalizeWebsiteUrl('https://example.com:443/ok'), 'https://example.com/ok');
	assert.equal(normalizeWebsiteUrl('http://example.com:80/'), 'http://example.com/');
});

test('normalizeWebsiteUrl: rejects embedded credentials', () => {
	assert.equal(normalizeWebsiteUrl('https://user:pass@example.com'), null);
	assert.equal(normalizeWebsiteUrl('https://user@example.com'), null);
});

test('websiteHost: strips leading www. and returns hostname', () => {
	assert.equal(websiteHost('https://www.example.com/foo'), 'example.com');
	assert.equal(websiteHost('foo.org'), 'foo.org');
	assert.equal(websiteHost('not a url'), '');
	assert.equal(websiteHost(null), '');
});
