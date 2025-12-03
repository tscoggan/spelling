export function getThemedTextClasses(hasDarkBackground: boolean) {
  return {
    headline: hasDarkBackground ? 'text-white' : 'text-foreground',
    subtitle: hasDarkBackground ? 'text-white/80' : 'text-muted-foreground',
    sectionTitle: hasDarkBackground ? 'text-white' : 'text-foreground',
  };
}
