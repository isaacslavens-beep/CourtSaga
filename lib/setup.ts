// Whether accounts can work yet: a database and a secret. Until both are set (see .env.example), the
// sign-up and log-in pages say so instead of failing.
export const accountsReady = () => !!process.env.DATABASE_URL && !!process.env.BETTER_AUTH_SECRET;
