/** 年（小数）を「1年3ヶ月」のような表記に変換 */
export function formatYearQuarter(year: number): string {
  const years = Math.floor(year)
  const months = Math.round((year - years) * 12)
  if (months === 0) return `${years}年`
  return `${years}年${months}ヶ月`
}
