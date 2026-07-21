export function sanitizeStudioSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/(xlink:href|href)\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, "")
    .replace(/javascript:/gi, "");
}
