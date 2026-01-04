/**
 * 坐标转换工具
 * 年份与像素位置之间的转换
 */

export function yearToPixel(
  year: number,
  startYear: number,
  endYear: number,
  containerWidth: number
): number {
  const ratio = (year - startYear) / (endYear - startYear);
  return ratio * containerWidth;
}

export function pixelToYear(
  pixel: number,
  startYear: number,
  endYear: number,
  containerWidth: number
): number {
  const ratio = pixel / containerWidth;
  return startYear + ratio * (endYear - startYear);
}

