"use client";

import { createAuthClient } from "better-auth/react";

// The browser's side of the accounts: same origin as the site, so no URL to configure
export const authClient = createAuthClient();
