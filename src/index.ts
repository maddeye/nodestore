import {
	run_all,
	subscribe,
	noop,
	safe_not_equal,
	is_function,
	get_store_value,
} from "./utils";

const subscriber_queue = [];

const conditioned_queue = [];

/**
 * Creates a `Readable` store that allows reading by subscription.
 * @param value initial value
 * @param {StartStopNotifier}start start and stop notifications for subscriptions
 */
export function readable<T>(
	value?: T,
	start?: StartStopNotifier<T>
): Readable<T> {
	return {
		subscribe: writable(value, start).subscribe,
		conditioned: writable(value, start).conditioned,
	};
}

/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
export function writable<T>(
	value?: T,
	start: StartStopNotifier<T> = noop
): Writable<T> {
	let stop: Unsubscriber;
	const subscribers: Set<SubscribeInvalidateTuple<T>> = new Set();
	const conditions: Set<ConditionInvalidateTuple<T>> = new Set();

	function set(new_value: T): void {
		if (safe_not_equal(value, new_value)) {
			value = new_value;
			if (stop) {
				// store is ready
				const run_queue = !subscriber_queue.length;
				for (const subscriber of subscribers) {
					subscriber[1]();
					subscriber_queue.push(subscriber, value);
				}
				if (run_queue) {
					for (let i = 0; i < subscriber_queue.length; i += 2) {
						subscriber_queue[i][0](subscriber_queue[i + 1]);
					}
					subscriber_queue.length = 0;
				}

				// Conditioned subscriber
				const con_queue = !conditioned_queue.length;
				for (const condition of conditions) {
					if (JSON.stringify(value) === JSON.stringify(condition[0])) {
						condition[2]();
						conditioned_queue.push(condition, condition[0]);
					}
				}
				if (con_queue) {
					for (let i = 0; i < conditioned_queue.length; i += 2) {
						conditioned_queue[i][1](conditioned_queue[i + 1]);
					}
					conditioned_queue.length = 0;
				}
			}
		}
	}

	function update(fn: Updater<T>): void {
		set(fn(value));
	}

	function subscribe(
		run: Subscriber<T>,
		invalidate: Invalidator<T> = noop
	): Unsubscriber {
		const subscriber: SubscribeInvalidateTuple<T> = [run, invalidate];
		subscribers.add(subscriber);
		if (subscribers.size === 1) {
			stop = start(set) || noop;
		}
		run(value);

		return () => {
			subscribers.delete(subscriber);
			if (subscribers.size === 0) {
				stop();
				stop = null;
			}
		};
	}

	function conditioned(
		condition: T,
		run: Subscriber<T>,
		invalidate: Invalidator<T> = noop
	): Unsubscriber {
		const conditioner: ConditionInvalidateTuple<T> = [
			condition,
			run,
			invalidate,
		];
		conditions.add(conditioner);
		if (conditions.size === 1) {
			stop = start(set) || noop;
		}

		if (value === condition) {
			run(value);
		}

		return () => {
			conditions.delete(conditioner);
			if (conditions.size === 0) {
				stop();
				stop = null;
			}
		};
	}

	return { set, update, subscribe, conditioned };
}

/** One or more `Readable`s. */
type Stores =
	| Readable<unknown>
	| [Readable<unknown>, ...Array<Readable<unknown>>]
	| Array<Readable<unknown>>;

/** One or more values from `Readable` stores. */
type StoresValues<T> = T extends Readable<infer U>
	? U
	: { [K in keyof T]: T[K] extends Readable<infer U> ? U : never };

/**
 * Derived value store by synchronizing one or more readable stores and
 * applying an aggregation function over its input values.
 *
 * @param stores - input stores
 * @param fn - function callback that aggregates the values
 * @param initial_value - when used asynchronously
 */
export function derived<S extends Stores, T>(
	stores: S,
	fn: (values: StoresValues<S>, set: (value: T) => void) => Unsubscriber | void,
	initial_value?: T
): Readable<T>;

/**
 * Derived value store by synchronizing one or more readable stores and
 * applying an aggregation function over its input values.
 *
 * @param stores - input stores
 * @param fn - function callback that aggregates the values
 * @param initial_value - initial value
 */
export function derived<S extends Stores, T>(
	stores: S,
	fn: (values: StoresValues<S>) => T,
	initial_value?: T
): Readable<T>;

/**
 * Derived value store by synchronizing one or more readable stores and
 * applying an aggregation function over its input values.
 *
 * @param stores - input stores
 * @param fn - function callback that aggregates the values
 */
export function derived<S extends Stores, T>(
	stores: S,
	fn: (values: StoresValues<S>) => T
): Readable<T>;

export function derived<T>(
	stores: Stores,
	fn: Function,
	initial_value?: T
): Readable<T> {
	const single = !Array.isArray(stores);
	const stores_array: Array<Readable<unknown>> = single
		? [stores as Readable<unknown>]
		: (stores as Array<Readable<unknown>>);

	const auto = fn.length < 2;

	return readable(initial_value, (set) => {
		let inited = false;
		const values = [];

		let pending = 0;
		let cleanup = noop;

		const sync = () => {
			if (pending) {
				return;
			}
			cleanup();
			const result = fn(single ? values[0] : values, set);
			if (auto) {
				set(result as T);
			} else {
				cleanup = is_function(result) ? (result as Unsubscriber) : noop;
			}
		};

		const unsubscribers = stores_array.map((store, i) =>
			subscribe(
				store,
				(value) => {
					values[i] = value;
					pending &= ~(1 << i);
					if (inited) {
						sync();
					}
				},
				() => {
					pending |= 1 << i;
				}
			)
		);

		inited = true;
		sync();

		return function stop() {
			run_all(unsubscribers);
			cleanup();
		};
	});
}

/**
 * Get the current value from a store by subscribing and immediately unsubscribing.
 * @param store readable
 */
export { get_store_value as get };
