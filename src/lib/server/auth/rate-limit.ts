type RateLimiterOptions = {
	maxAttempts?: number;
	windowMs?: number;
};

export function createRateLimiter(options: RateLimiterOptions = {}) {
	const maxAttempts = options.maxAttempts ?? 10;
	const windowMs = options.windowMs ?? 60 * 1000;

	const attempts = new Map<string, { count: number; firstAttempt: number }>();

	function isRateLimited(ip: string): boolean {
		const entry = attempts.get(ip);
		if (!entry) return false;

		if (Date.now() - entry.firstAttempt > windowMs) {
			attempts.delete(ip);
			return false;
		}

		return entry.count >= maxAttempts;
	}

	function recordFailedAttempt(ip: string): void {
		const entry = attempts.get(ip);
		const now = Date.now();

		if (!entry || now - entry.firstAttempt > windowMs) {
			attempts.set(ip, { count: 1, firstAttempt: now });
		} else {
			entry.count++;
		}
	}

	function clearAttempts(ip: string): void {
		attempts.delete(ip);
	}

	// Purge stale entries periodically to prevent memory growth
	setInterval(() => {
		const now = Date.now();
		for (const [ip, entry] of attempts) {
			if (now - entry.firstAttempt > windowMs) {
				attempts.delete(ip);
			}
		}
	}, windowMs);

	return { isRateLimited, recordFailedAttempt, clearAttempts };
}

const defaultLimiter = createRateLimiter();

export const { isRateLimited, recordFailedAttempt, clearAttempts } = defaultLimiter;
