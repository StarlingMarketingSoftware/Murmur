import fs from 'node:fs';
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import serverlessChromium from '@sparticuz/chromium';
import { chromium as playwrightChromium, type Browser } from 'playwright-core';
import { apiBadRequest, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { withRateLimit } from '@/app/api/_utils/rateLimit';
import { normalizeWebsiteUrl } from '@/utils/websiteUrl';
import { SsrfError, assertHostAllowed } from '../website-framable/ssrfGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VIEWPORT = { width: 1280, height: 900 };
const NAVIGATION_TIMEOUT_MS = 8000;
const SCREENSHOT_TIMEOUT_MS = 10000;
const SETTLE_DELAY_MS = 750;
const CACHE_MAX_AGE_SECONDS = 300;
const SCREENSHOT_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const LOCAL_CHROME_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];

const LOCAL_CHROME_PATHS =
	process.platform === 'darwin'
		? [
				'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
				'/Applications/Chromium.app/Contents/MacOS/Chromium',
				'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
			]
		: [
				'/usr/bin/google-chrome-stable',
				'/usr/bin/google-chrome',
				'/usr/bin/chromium-browser',
				'/usr/bin/chromium',
			];

const getLocalExecutablePath = (): string | null => {
	const configured =
		process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.CHROME_EXECUTABLE_PATH;
	if (configured) return configured;
	return LOCAL_CHROME_PATHS.find((p) => fs.existsSync(p)) ?? null;
};

const getLaunchConfig = async (): Promise<{ executablePath: string; args: string[] }> => {
	const localExecutablePath = getLocalExecutablePath();
	if (localExecutablePath) {
		return { executablePath: localExecutablePath, args: LOCAL_CHROME_ARGS };
	}
	return {
		executablePath: await serverlessChromium.executablePath(),
		args: serverlessChromium.args,
	};
};

const launchBrowser = async (): Promise<Browser> => {
	const launchConfig = await getLaunchConfig();
	return playwrightChromium.launch({
		args: launchConfig.args,
		executablePath: launchConfig.executablePath,
		headless: true,
	});
};

const generateScreenshot = async (url: string): Promise<Buffer> => {
	const browser = await launchBrowser();
	const allowedHosts = new Map<string, Promise<boolean>>();

	const isAllowedRequestUrl = async (requestUrl: string): Promise<boolean> => {
		const normalized = normalizeWebsiteUrl(requestUrl);
		if (!normalized) return false;

		const hostname = new URL(normalized).hostname;
		let allowed = allowedHosts.get(hostname);
		if (!allowed) {
			allowed = assertHostAllowed(hostname)
				.then(() => true)
				.catch(() => false);
			allowedHosts.set(hostname, allowed);
		}
		return allowed;
	};

	try {
		const context = await browser.newContext({
			viewport: VIEWPORT,
			userAgent: SCREENSHOT_UA,
			ignoreHTTPSErrors: true,
		});
		const page = await context.newPage();
		page.setDefaultTimeout(SCREENSHOT_TIMEOUT_MS);
		page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);

		await page.route('**/*', async (route) => {
			if (await isAllowedRequestUrl(route.request().url())) {
				await route.continue();
				return;
			}
			await route.abort();
		});

		await page.goto(url, {
			waitUntil: 'domcontentloaded',
			timeout: NAVIGATION_TIMEOUT_MS,
		});
		await page.waitForTimeout(SETTLE_DELAY_MS);

		return await page.screenshot({
			type: 'jpeg',
			quality: 72,
			fullPage: false,
			timeout: SCREENSHOT_TIMEOUT_MS,
		});
	} finally {
		await browser.close();
	}
};

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const limited = await withRateLimit(req, 'paid-external', 'website-screenshot', {
			user: [
				{ tokens: 10, window: '60 s' },
				{ tokens: 80, window: '3600 s' },
			],
			ip: [{ tokens: 30, window: '60 s' }],
		});
		if (limited) return limited;

		const normalized = normalizeWebsiteUrl(req.nextUrl.searchParams.get('url'));
		if (!normalized) return apiBadRequest('Invalid or unsupported url');

		try {
			await assertHostAllowed(new URL(normalized).hostname);
			const screenshot = await generateScreenshot(normalized);

			return new Response(new Uint8Array(screenshot), {
				status: 200,
				headers: {
					'Content-Type': 'image/jpeg',
					'Cache-Control': `private, max-age=${CACHE_MAX_AGE_SECONDS}`,
					'X-Content-Type-Options': 'nosniff',
				},
			});
		} catch (error) {
			if (!(error instanceof SsrfError)) {
				console.warn('[website-screenshot] capture failed', error);
			}
			return apiBadRequest('Unable to generate website preview');
		}
	} catch (error) {
		return handleApiError(error);
	}
}
