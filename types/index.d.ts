/** Callback to inform of a value updates. */
export type Subscriber<T> = (value: T) => void;

/** Unsubscribes from value updates. */
export type Unsubscriber = () => void;

/** Callback to update a value. */
export type Updater<T> = (value: T) => T;

/** Cleanup logic callback */
export type Invalidator<T> = (value?: T) => void;

/** Star and stop notification callbacks */
export type StartStopNotifier<T> = (set: Subscriber<T>) => Unsubscriber | void;

/** Readable interface for subscribing */
export interface Readable<T> {
	/**
	 * Subscribe on value changes
	 *
	 * @param run Subscription callback
	 * @param invalid Invalidate cleanup callback
	 */
	subscribe(
		this: void,
		run: Subscriber<T>,
		invalid?: Invalidator<T>
	): Unsubscriber;

	conditioned(
		this: void,
		condition: T,
		run: Subscriber<T>,
		invalidate: Invalidator<T>
	): Unsubscriber;
}

/** Writable interface for both updating and subscribing */
export interface Writable<T> extends Readable<T> {
	/**
	 * Set value and inform subscribers.
	 *
	 * @param value Value to set
	 */
	set(this: void, value: T): void;

	/**
	 * Update value using callback and inform subscribers.
	 *
	 * @param updater Updater callback
	 */
	update(this: void, updater: Updater<T>): void;
}

/** Pair of subscriber and invalidator. */
export type SubscribeInvalidateTuple<T> = [Subscriber<T>, Invalidator<T>];

/** Tuble of conditoin, subscriber and invalidator. */
export type ConditionInvalidateTuple<T> = [T, Subscriber<T>, Invalidator<T>];
