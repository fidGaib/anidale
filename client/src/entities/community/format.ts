/** Склонение «участник»: 1 участник, 2 участника, 5 участников, 11 участников, 21 участник. */
export const membersLabel = (count: number): string => {
  const rest = count % 100
  const last = count % 10
  if (rest >= 11 && rest <= 14) return `${count} участников`
  if (last === 1) return `${count} участник`
  if (last >= 2 && last <= 4) return `${count} участника`
  return `${count} участников`
}
