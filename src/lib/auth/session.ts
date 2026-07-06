import type { TokenPairResponse, UserProfile } from "@/lib/api/types";

const refreshTokenKey = "shopupu.refreshToken";
const cartTokenKey = "shopupu.cartToken";

let accessToken: string | null = null;
let currentUser: UserProfile | null = null;

export function getAccessToken() {
  return accessToken;
}

export function getCurrentUser() {
  return currentUser;
}

export function setCurrentUser(user: UserProfile | null) {
  currentUser = user;
}

export function getRefreshToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(refreshTokenKey);
}

export function setTokens(tokens: TokenPairResponse) {
  accessToken = tokens.accessToken;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(refreshTokenKey, tokens.refreshToken);
  }
}

export function clearSession() {
  accessToken = null;
  currentUser = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(refreshTokenKey);
  }
}

// Guest cart token (CART-01): issued by the backend with the first anonymous
// cart response; sent back as X-Cart-Token and merged into the user cart at login.
export function getCartToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(cartTokenKey);
}

export function setCartToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (token) {
    window.localStorage.setItem(cartTokenKey, token);
  } else {
    window.localStorage.removeItem(cartTokenKey);
  }
}
