const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60 * 1000; // 1 minute

const attempts = new Map<string, { count: number; firstAttempt: number }>();

export function isRateLimited(ip: string): boolean {
	const entry = attempts.get(ip);
	if (!entry) return false;

	if (Date.now() - entry.firstAttempt > WINDOW_MS) {
		attempts.delete(ip);
		return false;
	}

	return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(ip: string): void {
	const entry = attempts.get(ip);
	const now = Date.now();

	if (!entry || now - entry.firstAttempt > WINDOW_MS) {
		attempts.set(ip, { count: 1, firstAttempt: now });
	} else {
		entry.count++;
	}
}

export function clearAttempts(ip: string): void {
	attempts.delete(ip);
}

// Purge stale entries every 15 minutes to prevent memory growth
setInterval(() => {
	const now = Date.now();
	for (const [ip, entry] of attempts) {
		if (now - entry.firstAttempt > WINDOW_MS) {
			attempts.delete(ip);
		}
	}
}, WINDOW_MS);
