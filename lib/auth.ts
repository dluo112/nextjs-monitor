import { cookies } from 'next/headers';

export const COOKIE_NAME = 'autodl_token';

export function setTokenCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // maxAge: 60 * 60 * 24 * 7 // 1 week
  });
}

export function getTokenCookie() {
  return cookies().get(COOKIE_NAME)?.value;
}

export function deleteTokenCookie() {
  cookies().delete(COOKIE_NAME);
}
