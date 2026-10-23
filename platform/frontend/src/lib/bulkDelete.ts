export interface BulkDeleteResult {
  deleted: string[]
  failed: string[]
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null
    && (error as { response?: { status?: number } }).response?.status === 404
}

export async function bulkDelete(ids: string[], deleteOne: (id: string) => Promise<unknown>): Promise<BulkDeleteResult> {
  const result: BulkDeleteResult = { deleted: [], failed: [] }
  for (const id of ids) {
    try {
      await deleteOne(id)
      result.deleted.push(id)
    } catch (error) {
      if (isNotFound(error)) result.deleted.push(id)
      else result.failed.push(id)
    }
  }
  return result
}
