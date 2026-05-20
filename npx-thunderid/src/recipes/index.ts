import fly from './fly';
import railway from './railway';
import render from './render';
import type { Recipe } from '../lib/types';

export function loadRecipes(): Recipe[] {
  return [railway, fly, render];
}
