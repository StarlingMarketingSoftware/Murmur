declare const __non_webpack_require__: NodeRequire | undefined;

type VectorEsMatchLike = {
	metadata?: Record<string, unknown> | null;
	title?: unknown;
};

type WasmFilterItemsByTitlePrefixes = (
	items: unknown,
	prefixes: unknown,
	keepNullTitles: boolean
) => unknown;

export type FilterItemsByTitlePrefixesOptions = {
	keepNullTitles: boolean;
};

const USE_WASM_CATEGORY_FILTERS =
	process.env.NEXT_PUBLIC_USE_WASM_CATEGORY_FILTERS === 'true';

export { USE_WASM_CATEGORY_FILTERS };

const normalizePrefixes = (prefixes: readonly string[]): string[] =>
	(prefixes ?? [])
		.map((p) => String(p).trim().toLowerCase())
		.filter(Boolean);

const metadataValue = (
	metadata: Record<string, unknown> | null | undefined,
	key: string
): string | null => {
	if (!metadata) return null;
	const value = metadata[key];
	if (value == null) return null;
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) {
		const first = value.find((entry) => entry != null);
		return first == null ? null : String(first);
	}
	return String(value);
};

const extractTitleValue = (item: VectorEsMatchLike | null | undefined): string | null => {
	if (!item) return null;
	const direct = metadataValue(item as unknown as Record<string, unknown>, 'title');
	if (direct != null && direct.trim().length > 0) return direct;
	return metadataValue(item.metadata ?? null, 'title');
};

export const filterItemsByTitlePrefixesTs = <T>(
	items: readonly T[],
	prefixes: readonly string[],
	options: FilterItemsByTitlePrefixesOptions
): T[] => {
	const normalizedPrefixes = normalizePrefixes(prefixes);
	if (normalizedPrefixes.length === 0) return items.slice();

	const keepNullTitles = options.keepNullTitles;
	return items.filter((item) => {
		const title = extractTitleValue(item as unknown as VectorEsMatchLike);
		if (title == null || title.trim().length === 0) return keepNullTitles;
		const titleKey = title.trim().toLowerCase();
		return normalizedPrefixes.some((prefix) => titleKey.startsWith(prefix));
	});
};

let cachedNodeWasmFilterFn: WasmFilterItemsByTitlePrefixes | null | undefined;
let hasLoggedNodeWasmRuntimeError = false;

const getNodeWasmFilterFn = (): WasmFilterItemsByTitlePrefixes | null => {
	if (!USE_WASM_CATEGORY_FILTERS) return null;
	if (cachedNodeWasmFilterFn !== undefined) return cachedNodeWasmFilterFn;

	try {
		// Use __non_webpack_require__ so webpack does not attempt to bundle or
		// statically analyse the dynamic require call. In Next.js server bundles
		// this global is always available. The eval('require') fallback covers
		// plain Node.js execution outside of webpack.
		const dynamicRequire: NodeRequire =
			(typeof __non_webpack_require__ !== 'undefined'
				? __non_webpack_require__
				: eval('require')) as NodeRequire;

		const loaded = dynamicRequire(
			`${process.cwd()}/rust-scorer/pkg-node`
		) as Partial<{ filter_items_by_title_prefixes: unknown }> & {
			default?: Partial<{ filter_items_by_title_prefixes: unknown }>;
		};
		const maybeModule = (loaded.default ?? loaded) as Partial<{
			filter_items_by_title_prefixes: unknown;
		}>;

		if (typeof maybeModule.filter_items_by_title_prefixes !== 'function') {
			console.error(
				'[categoryFilter] filter_items_by_title_prefixes export missing from rust-scorer pkg-node'
			);
			cachedNodeWasmFilterFn = null;
			return cachedNodeWasmFilterFn;
		}

		cachedNodeWasmFilterFn =
			maybeModule.filter_items_by_title_prefixes as WasmFilterItemsByTitlePrefixes;
		return cachedNodeWasmFilterFn;
	} catch (error: unknown) {
		console.error(
			'[categoryFilter] failed to load WASM category filter, using TypeScript fallback',
			error
		);
		cachedNodeWasmFilterFn = null;
		return cachedNodeWasmFilterFn;
	}
};

type WasmWebCategoryFilterModule = {
	filter_items_by_title_prefixes: WasmFilterItemsByTitlePrefixes;
};

let cachedWebWasmModule: WasmWebCategoryFilterModule | null = null;
let webWasmModulePromise: Promise<WasmWebCategoryFilterModule | null> | null = null;
let hasLoggedWebWasmLoadError = false;
let hasLoggedWebWasmRuntimeError = false;

const logWebWasmLoadError = (error: unknown): void => {
	if (hasLoggedWebWasmLoadError) return;
	hasLoggedWebWasmLoadError = true;
	console.error(
		'[categoryFilter] failed to load WASM category filter (web), using TypeScript fallback',
		error
	);
};

const logWebWasmRuntimeError = (error: unknown): void => {
	if (hasLoggedWebWasmRuntimeError) return;
	hasLoggedWebWasmRuntimeError = true;
	console.error('[categoryFilter] WASM category filter failed (web), using TypeScript fallback', error);
};

const ensureWebWasmModuleLoaded = async (): Promise<WasmWebCategoryFilterModule | null> => {
	if (!USE_WASM_CATEGORY_FILTERS) return null;
	if (cachedWebWasmModule) return cachedWebWasmModule;

	if (!webWasmModulePromise) {
		webWasmModulePromise = import('../../rust-scorer/pkg-web')
			.then(async (module) => {
				// wasm-pack `--target web` exports an async init function as the default export.
				// We must call it (once) before using the named wrapper exports.
				const maybeInit = (module as { default?: unknown }).default;
				if (typeof maybeInit === 'function') {
					try {
						await (maybeInit as () => Promise<unknown>)();
					} catch (error: unknown) {
						logWebWasmLoadError(error);
						return null;
					}
				}

				const maybeModule = module as Partial<WasmWebCategoryFilterModule>;
				if (typeof maybeModule.filter_items_by_title_prefixes !== 'function') {
					return null;
				}

				cachedWebWasmModule = maybeModule as WasmWebCategoryFilterModule;
				return cachedWebWasmModule;
			})
			.catch((error: unknown) => {
				logWebWasmLoadError(error);
				return null;
			});
	}

	return webWasmModulePromise;
};

export const filterItemsByTitlePrefixes = async <T>(
	items: readonly T[],
	prefixes: readonly string[],
	options: FilterItemsByTitlePrefixesOptions
): Promise<T[]> => {
	const normalizedPrefixes = normalizePrefixes(prefixes);
	if (normalizedPrefixes.length === 0) return items.slice();

	const fallback = (): T[] => filterItemsByTitlePrefixesTs(items, prefixes, options);
	if (!USE_WASM_CATEGORY_FILTERS) return fallback();

	if (typeof window === 'undefined') {
		const wasmFn = getNodeWasmFilterFn();
		if (!wasmFn) return fallback();
		try {
			const out = wasmFn(items, prefixes, options.keepNullTitles) as T[];
			if (!Array.isArray(out)) {
				throw new Error('WASM category filter returned non-array result');
			}
			return out;
		} catch (error: unknown) {
			if (!hasLoggedNodeWasmRuntimeError) {
				hasLoggedNodeWasmRuntimeError = true;
				console.error(
					'[categoryFilter] WASM category filter failed (node), using TypeScript fallback',
					error
				);
			}
			// Disable for the remainder of the process to avoid repeated failures.
			cachedNodeWasmFilterFn = null;
			return fallback();
		}
	}

	const webModule = await ensureWebWasmModuleLoaded();
	if (!webModule) return fallback();
	try {
		const out = webModule.filter_items_by_title_prefixes(
			items,
			prefixes,
			options.keepNullTitles
		) as T[];
		if (!Array.isArray(out)) {
			throw new Error('WASM category filter returned non-array result');
		}
		return out;
	} catch (error: unknown) {
		logWebWasmRuntimeError(error);
		// Disable for the remainder of the session to avoid repeated failures.
		cachedWebWasmModule = null;
		webWasmModulePromise = Promise.resolve(null);
		return fallback();
	}
};

