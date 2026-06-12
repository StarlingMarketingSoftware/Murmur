// Server-side polyfill for `localStorage`.
//
// Next.js's dev-tools overlay calls `localStorage.getItem(...)` during SSR.
// On Node 22 this would throw a `ReferenceError` and Next would catch it; on
// Node 25 there is a built-in `localStorage` global that's an empty stub
// (no methods) unless the process is launched with `--localstorage-file=PATH`.
// That mismatch crashes SSR with `TypeError: localStorage.getItem is not a
// function`.
//
// We install a working in-memory shim so any server-side caller gets a
// well-behaved (but ephemeral) Web Storage API. Browser-side code is
// unaffected — this only runs on the Node runtime.
export async function register() {
	if (process.env.NEXT_RUNTIME !== 'nodejs') return;

	const store = new Map<string, string>();

	const shim = {
		get length() {
			return store.size;
		},
		getItem(key: string): string | null {
			return store.get(String(key)) ?? null;
		},
		setItem(key: string, value: string): void {
			store.set(String(key), String(value));
		},
		removeItem(key: string): void {
			store.delete(String(key));
		},
		clear(): void {
			store.clear();
		},
		key(i: number): string | null {
			return Array.from(store.keys())[i] ?? null;
		},
	};

	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		writable: true,
		value: shim,
	});
}
