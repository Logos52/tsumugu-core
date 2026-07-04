/**
 * Tone parsing for the browser packs — pure, data-free, DOM-free.
 */

export function toneClassesFromZhuyin(reading: string): number[] | undefined {
  if (!reading) return undefined;
  const zhuyinPart = reading.split("/")[0]?.trim() ?? "";
  if (!zhuyinPart) return undefined;

  const syllables = zhuyinPart.split(/\s+/).filter((s) => s.length > 0);
  if (syllables.length === 0) return undefined;

  const tones: number[] = [];
  for (const syl of syllables) {
    if (syl.startsWith("˙")) {
      tones.push(5);
      continue;
    }
    if (syl.includes("ˊ")) tones.push(2);
    else if (syl.includes("ˇ")) tones.push(3);
    else if (syl.includes("ˋ")) tones.push(4);
    else tones.push(1);
  }
  return tones;
}