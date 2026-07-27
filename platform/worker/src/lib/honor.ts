import { eq, sql } from 'drizzle-orm'
import type { getDb } from '../db'
import { users } from '../db/schema'

export const HONOR_PER_DIFFICULTY: Record<string, number> = {
  '8kyu': 2, '7kyu': 4, '6kyu': 8, '5kyu': 16, '4kyu': 32, '3kyu': 80,
}

export function honorFor(difficulty: string): number {
  return HONOR_PER_DIFFICULTY[difficulty] ?? 2
}

/** Adds the honor for a passed exercise and returns how much was granted. */
export async function awardHonor(
  db: ReturnType<typeof getDb>,
  userId: string,
  difficulty: string,
): Promise<number> {
  const gain = honorFor(difficulty)
  await db.update(users)
    .set({ honor: sql`${users.honor} + ${gain}` })
    .where(eq(users.id, userId))
  return gain
}
