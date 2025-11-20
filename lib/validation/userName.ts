export const USERNAME_REGEX = /^[a-z0-9._-]{3,20}$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

export const USERNAME_REQUIREMENTS = 'Solo letras minúsculas, números, punto, guion o guion bajo (3-20 caracteres).';

export const sanitizeUserName = (value: string) => value.trim().toLowerCase();

export const isUserNameValid = (value: string) => USERNAME_REGEX.test(sanitizeUserName(value));
