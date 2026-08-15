export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/contentConstants') {
    return nextResolve(new URL('../src/lib/contentConstants.ts', import.meta.url).href, context);
  }
  if (specifier === '@/lib/utils') {
    return nextResolve(new URL('../src/lib/utils.ts', import.meta.url).href, context);
  }
  return nextResolve(specifier, context);
}
