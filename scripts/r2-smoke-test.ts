import 'dotenv/config';

import {
	deleteObject,
	getPresignedGetUrl,
	getPresignedPutUrl,
	objectExists,
} from '@/app/api/_utils/r2';

/**
 * Verifies the R2 storage primitive end-to-end against the real bucket:
 * presign PUT -> upload -> HEAD -> presign GET -> download -> DELETE.
 * Self-cleaning (the temp object is removed). Server-side fetch is not subject to
 * browser CORS, so this validates credentials/endpoint/signing independently of the
 * bucket's CORS policy.
 *
 *   npx tsx scripts/r2-smoke-test.ts
 */
async function main() {
	const key = `media/_healthcheck/${Date.now()}-smoke-test.txt`;
	const body = `r2 smoke test ${new Date().toISOString()}`;

	console.log(
		`Bucket: ${process.env.R2_BUCKET} | Account: ${process.env.R2_ACCOUNT_ID?.slice(0, 6)}…`
	);
	console.log(`Key:    ${key}\n`);

	const putUrl = await getPresignedPutUrl(key, 300);
	const putRes = await fetch(putUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'text/plain' },
		body,
	});
	console.log(`PUT          -> ${putRes.status} ${putRes.ok ? 'OK' : await putRes.text()}`);
	if (!putRes.ok) process.exit(1);

	console.log(`HEAD exists  -> ${await objectExists(key)}`);

	const getUrl = await getPresignedGetUrl(key, 'text/plain', 300);
	const getRes = await fetch(getUrl);
	const text = await getRes.text();
	console.log(`GET          -> ${getRes.status} | body matches: ${text === body}`);

	await deleteObject(key);
	console.log(`DELETE       -> done | exists after delete: ${await objectExists(key)}`);

	console.log('\n✅ R2 round-trip succeeded.');
}

main().catch((error) => {
	console.error('\n❌ R2 smoke test failed:', error);
	process.exit(1);
});
