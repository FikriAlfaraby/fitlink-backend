

export function countMonthsBetween(startDate: string | number | Date, endDate: string | number | Date) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Calculate month difference considering year difference
  const diff =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  // Add 1 because we count both the starting and ending month
  return diff + 1;
}
