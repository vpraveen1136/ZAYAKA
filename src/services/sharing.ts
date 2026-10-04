import { Recipe } from '../types';

/**
 * Format the WhatsApp message for the cook
 */
export function formatCookMessage(recipe: Recipe): string {
  // WhatsApp markdown formatting uses *bold*
  return `Please prepare *${recipe.name}*.\n\nRecipe: ${recipe.url}`;
}

/**
 * Send the recipe to the cook via Web Share API or WhatsApp direct link
 */
export async function shareToCook(recipe: Recipe): Promise<{ success: boolean; method: string }> {
  const message = formatCookMessage(recipe);

  // If running on a mobile device supporting Web Share API with text
  if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    try {
      await navigator.share({
        title: recipe.name,
        text: message
      });
      return { success: true, method: 'web-share' };
    } catch (err: unknown) {
      // User cancelled share or share failed; if aborted by user, don't fall through
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, method: 'cancelled' };
      }
      console.warn('Web Share failed, falling back to direct WhatsApp link:', err);
    }
  }

  // Fallback: Direct WhatsApp Deep Link
  const encodedText = encodeURIComponent(message);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;

  // Open WhatsApp in a new window/tab
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  return { success: true, method: 'whatsapp-link' };
}
