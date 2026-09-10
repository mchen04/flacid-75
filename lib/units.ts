// Measurements are stored in kilograms and centimetres. Units only change what is shown and typed; conversion never rounds the stored value.
import {mlPerOz, type Units} from './domain';
export const kgPerLb = 0.45359237, cmPerIn = 2.54;
export const toLb = (kg: number) => kg / kgPerLb;
export const toKg = (lb: number) => lb * kgPerLb;
export const toIn = (cm: number) => cm / cmPerIn;
export const toCm = (inches: number) => inches * cmPerIn;
export function feetInches(cm: number) {const total = Math.round(toIn(cm)); return {feet: Math.floor(total / 12), inches: total % 12};}
export function formatWeight(kg: number, units: Units, digits = 1) {return units.weight === 'lb' ? `${(Math.round(toLb(kg) * 10 ** digits) / 10 ** digits).toLocaleString()} lb` : `${(Math.round(kg * 10 ** digits) / 10 ** digits).toLocaleString()} kg`;}
export function formatHeight(cm: number, units: Units) {if (units.height === 'cm') return `${Math.round(cm)} cm`; const {feet, inches} = feetInches(cm); return `${feet}′ ${inches}″`;}
// Parse a typed weight in the chosen unit into kilograms. Returns null when the number is unusable.
export function parseWeight(value: string, units: Units) {const n = Number(value); if (!Number.isFinite(n) || n <= 0) return null; return units.weight === 'lb' ? toKg(n) : n;}
export const volumeUnit = (units: Units) => units.volume ?? (units.weight === 'lb' ? 'oz' : 'ml');
export const toOz = (ml: number) => ml / mlPerOz;
export const ozToMl = (oz: number) => oz * mlPerOz;
// Volumes display in her unit; ounces to one decimal (trailing zero dropped), millilitres whole.
export function formatVolume(ml: number, units: Units) {return volumeUnit(units) === 'oz' ? `${(Math.round(toOz(ml) * 10) / 10).toLocaleString()} oz` : `${Math.round(ml).toLocaleString()} ml`;}
export function parseVolume(value: string, units: Units) {const n = Number(value); if (!Number.isFinite(n) || n <= 0) return null; return volumeUnit(units) === 'oz' ? ozToMl(n) : n;}
export function parseHeight(feet: string, inches: string, cm: string, units: Units) {if (units.height === 'cm') {const n = Number(cm); return Number.isFinite(n) && n > 0 ? n : null;} const f = Number(feet), i = Number(inches || 0); if (!Number.isFinite(f) || !Number.isFinite(i) || f < 0 || i < 0) return null; const total = f * 12 + i; return total > 0 ? toCm(total) : null;}
