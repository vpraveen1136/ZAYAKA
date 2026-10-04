import { Recipe } from '../types';

/**
 * Normalize dish name for comparison:
 * Lowercases, strips punctuation, normalizes spaces.
 */
export function normalizeDishName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate token overlap (Jaccard similarity) between two strings.
 */
function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeDishName(a).split(' ').filter(Boolean));
  const tokensB = new Set(normalizeDishName(b).split(' ').filter(Boolean));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...tokensA, ...tokensB]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedRecipe: Recipe | null;
  confidence: number;
}

/**
 * Check if a dish name closely matches any existing recipe in the catalogue.
 * Excludes an optional ignoreRecipeId (useful when editing an existing recipe).
 */
export function findSimilarRecipe(
  name: string,
  existingRecipes: Recipe[],
  ignoreRecipeId?: string
): DuplicateCheckResult {
  const cleanInput = normalizeDishName(name);
  if (!cleanInput || cleanInput.length < 3) {
    return { isDuplicate: false, matchedRecipe: null, confidence: 0 };
  }

  let bestMatch: Recipe | null = null;
  let highestScore = 0;

  for (const recipe of existingRecipes) {
    if (ignoreRecipeId && recipe.id === ignoreRecipeId) {
      continue;
    }

    const cleanExisting = normalizeDishName(recipe.name);

    // Exact match after normalization
    if (cleanInput === cleanExisting) {
      return { isDuplicate: true, matchedRecipe: recipe, confidence: 1.0 };
    }

    // Substring containment if both are reasonably long
    if (
      (cleanInput.length >= 5 && cleanExisting.includes(cleanInput)) ||
      (cleanExisting.length >= 5 && cleanInput.includes(cleanExisting))
    ) {
      const score = 0.85;
      if (score > highestScore) {
        highestScore = score;
        bestMatch = recipe;
      }
      continue;
    }

    // Token overlap similarity
    const sim = tokenSimilarity(cleanInput, cleanExisting);
    if (sim >= 0.6 && sim > highestScore) {
      highestScore = sim;
      bestMatch = recipe;
    }
  }

  if (highestScore >= 0.6 && bestMatch) {
    return {
      isDuplicate: true,
      matchedRecipe: bestMatch,
      confidence: highestScore
    };
  }

  return { isDuplicate: false, matchedRecipe: null, confidence: 0 };
}
