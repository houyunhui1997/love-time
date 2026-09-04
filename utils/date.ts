const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function parseBusinessDate(value: string): Date {
  if (!DATE_PATTERN.test(value)) {
    throw new Error(`Invalid business date: ${value}`)
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Invalid calendar date: ${value}`)
  }

  return date
}

export function formatBusinessDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function differenceInCalendarDays(later: string, earlier: string): number {
  const laterDate = parseBusinessDate(later)
  const earlierDate = parseBusinessDate(earlier)
  const utcLater = Date.UTC(laterDate.getFullYear(), laterDate.getMonth(), laterDate.getDate())
  const utcEarlier = Date.UTC(earlierDate.getFullYear(), earlierDate.getMonth(), earlierDate.getDate())

  return Math.round((utcLater - utcEarlier) / 86_400_000)
}

export function getNextYearlyOccurrence(targetDate: string, today: string): string {
  const source = parseBusinessDate(targetDate)
  const current = parseBusinessDate(today)
  const month = source.getMonth()
  const day = source.getDate()

  let candidateYear = current.getFullYear()
  let candidate = safeYearlyDate(candidateYear, month, day)

  if (candidate < current) {
    candidateYear += 1
    candidate = safeYearlyDate(candidateYear, month, day)
  }

  return formatBusinessDate(candidate)
}

function safeYearlyDate(year: number, month: number, day: number): Date {
  if (month === 1 && day === 29) {
    const isLeapYear = new Date(year, 1, 29).getMonth() === 1
    return new Date(year, 1, isLeapYear ? 29 : 28)
  }

  return new Date(year, month, day)
}

