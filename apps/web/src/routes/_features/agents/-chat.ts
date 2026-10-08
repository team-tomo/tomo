export type AgentsPhase = "welcome" | "thread"

export const WELCOME_HISTORY_LIMIT = 10

export function phase(conversationId: string | null): AgentsPhase {
  if (conversationId === null) {
    return "welcome"
  }
  return "thread"
}

export function greeting(input: { name: string; hour: number }): string {
  let salutation = "Good evening"
  if (input.hour < 12) {
    salutation = "Good morning"
  } else if (input.hour < 18) {
    salutation = "Good afternoon"
  }

  const firstName = input.name.trim().split(/\s+/)[0] ?? ""
  if (firstName === "") {
    return salutation
  }

  return `${salutation}, ${firstName}`
}

export function shouldSend(text: string): boolean {
  return text.trim() !== ""
}

export function conversationAge(updatedAt: string, now: number): string {
  const minutes = Math.max(
    1,
    Math.floor((now - new Date(updatedAt).getTime()) / 60_000)
  )
  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h`
  }

  return `${Math.floor(hours / 24)}d`
}
