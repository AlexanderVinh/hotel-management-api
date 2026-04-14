import { Transform } from 'class-transformer';

export const Trim = () => {
    return Transform(({ value }) => typeof value === 'string' ? value.trim() : value);
}

export const LowerCase = () => {
    return Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value);
}

export const UpperCase = () => {
    return Transform(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value);
}