import type {MealItem} from './domain';
export function scaleMealPortion(item: MealItem, grams: number): MealItem {
 if (item.grams === 0) return {...item, grams};
 const ratio = grams / item.grams;
 return {...item, grams, calories: Math.round(item.calories * ratio * 10) / 10, protein: Math.round(item.protein * ratio * 10) / 10};
}
