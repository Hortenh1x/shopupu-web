import { commonMessages } from "./messages/common";
import { authMessages } from "./messages/auth";
import { commerceMessages } from "./messages/commerce";
import { adminMessages } from "./messages/admin";
import { catalogMessages } from "./messages/catalog";

export const messages = { ...commonMessages, ...authMessages, ...commerceMessages, ...adminMessages, ...catalogMessages } as const;
export type TranslationKey = keyof typeof messages;
