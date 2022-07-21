export function noop() {}

export function run(fn) {
	return fn();
}

export function run_all(fns: Function[]) {
	fns.forEach(run);
}

export function safe_not_equal(a, b) {
	return a != a
		? b == b
		: a !== b || (a && typeof a === "object") || typeof a === "function";
}

export function subscribe(store, ...callbacks) {
	if (store == null) {
		return noop;
	}
	const unsub = store.subscribe(...callbacks);
	return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}

export function is_function(thing: unknown): thing is Function {
	return typeof thing === "function";
}

export function get_store_value<T>(store: Readable<T>): T {
	let value;
	subscribe(store, (_) => (value = _))();
	return value;
}
