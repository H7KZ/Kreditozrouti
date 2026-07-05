import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { Kysely } from 'kysely'
import { z } from 'zod'
import type { Database } from '@kreditozrouti/core/db'

// ponytail: colocates schema + handler, flows z.infer<T> into handler args
export function defineTool<S extends Record<string, z.ZodType>>(def: {
  name: string
  description: string
  schema: S
  handler: (args: z.infer<z.ZodObject<S>>, db: Kysely<Database>) => Promise<CallToolResult>
}) {
  return def
}

export function registerTool<S extends Record<string, z.ZodType>>(
  server: McpServer,
  db: Kysely<Database>,
  def: ReturnType<typeof defineTool<S>>,
): void {
  // Cast to bypass overload resolution mismatch between the generic S and
  // the concrete ZodRawShapeCompat expected by server.tool at the call site.
  const schema = def.schema as Record<string, z.ZodType>
  server.tool(def.name, def.description, schema, args =>
    def.handler(args as z.infer<z.ZodObject<S>>, db),
  )
}
