/**
 * Smart-quotes helper.
 *
 * Content is authored with plain ASCII straight quotes ( " and ' ), which
 * render as the same symmetric glyph on both sides in our headline/body
 * fonts (Space Grotesk / Inter) — there's no visual distinction between an
 * opening and closing quotation mark. This converts straight quotes to
 * their typographic (curly) equivalents so open/close pairs render
 * differently, the way a properly typeset page would.
 *
 * Used for:
 * - Raw strings rendered directly (post titles, card titles, OG images)
 * - A remark plugin (see remark-smart-quotes.ts) that applies this to
 *   `text` mdast nodes only, so code blocks/inline code are untouched.
 */

const OPEN_DOUBLE = "\u201C"; // “
const CLOSE_DOUBLE = "\u201D"; // ”
const OPEN_SINGLE = "\u2018"; // ‘
const CLOSE_SINGLE = "\u2019"; // ’

export function smartQuotes(input: string): string {
  if (!input) return input;

  let text = input;

  // Double quotes: an opening quote is one at the start of the string, or
  // preceded by whitespace or an opening bracket/dash. Everything else is
  // treated as a closing quote.
  text = text.replace(/(^|[\s([{\u2014\u2013-])"/g, `$1${OPEN_DOUBLE}`);
  text = text.replace(/"/g, CLOSE_DOUBLE);

  // Single quotes are ambiguous (apostrophe vs. opening quote vs. closing
  // quote). Handle the common cases in order:
  // 1. Contractions / possessives: letter or digit before the quote
  //    (don't, it's, '90s spelled without leading context, Rob's) => apostrophe (right single quote)
  text = text.replace(/([A-Za-z0-9])'/g, `$1${CLOSE_SINGLE}`);
  // 2. A leading apostrophe before digits (elided century, e.g. '90s) => apostrophe
  text = text.replace(/'(\d)/g, `${CLOSE_SINGLE}$1`);
  // 3. Remaining quote at start of string, or preceded by whitespace/opening
  //    bracket/dash => opening single quote
  text = text.replace(/(^|[\s([{\u2014\u2013-])'/g, `$1${OPEN_SINGLE}`);
  // 4. Anything left is a closing single quote
  text = text.replace(/'/g, CLOSE_SINGLE);

  return text;
}
