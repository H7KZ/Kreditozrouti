import type { Database } from '@kreditozrouti/types'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types'
import type { Kysely } from 'kysely'
import type { ZodRawShape } from 'zod'
import { z } from 'zod'

// ponytail: colocates schema + handler, flows z.infer<T> into handler args
export function defineTool<S extends ZodRawShape>(def: {
	name: string
	description: string
	schema: S
	handler: (args: z.infer<z.ZodObject<S>>, db: Kysely<Database>) => Promise<CallToolResult>
}) {
	return def
}

export function registerTool<S extends ZodRawShape>(server: McpServer, db: Kysely<Database>, def: ReturnType<typeof defineTool<S>>): void {
	// Two casts are required due to SDK overload resolution:
	//   server.tool overload 1 expects `cb: BaseToolCallback<S>` where args is typed as
	//   `ShapeOutput<Readonly<{ [k: string]: $ZodType }>>` (the widened ZodRawShapeCompat),
	//   not the concrete `$InferObjectOutput<S, {}>` that our generic S produces.
	//   TypeScript cannot unify the two and raises TS2769 / TS2345 without the casts.
	const schema = def.schema as ZodRawShape
	server.tool(def.name, def.description, schema, args => def.handler(args as z.infer<z.ZodObject<S>>, db))
}
