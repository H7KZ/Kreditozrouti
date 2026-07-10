// mcp/src/tools.ts
import type { Database } from '@kreditozrouti/types'
import type { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp'
import type { CallToolResult, GetPromptResult, ListResourcesResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types'
import type { Kysely } from 'kysely'
import type { ZodRawShape } from 'zod'
import { z } from 'zod'

export function defineTool<S extends ZodRawShape>(def: {
	name: string
	title: string
	description: string
	schema: S
	annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; openWorldHint?: boolean }
	handler: (args: z.infer<z.ZodObject<S>>, db: Kysely<Database>) => Promise<CallToolResult>
}) {
	return def
}

export function registerTool<S extends ZodRawShape>(server: McpServer, db: Kysely<Database>, def: ReturnType<typeof defineTool<S>>): void {
	const inputSchema = def.schema as ZodRawShape
	server.registerTool(
		def.name,
		{
			title: def.title,
			description: def.description,
			inputSchema,
			annotations: def.annotations
		},
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		(args, _extra) => def.handler(args as z.infer<z.ZodObject<S>>, db)
	)
}

export function defineResource(def: {
	name: string
	uri: string
	description: string
	mimeType: string
	handler: (uri: URL, db: Kysely<Database>) => Promise<ReadResourceResult>
}) {
	return def
}

export function registerResource(server: McpServer, db: Kysely<Database>, def: ReturnType<typeof defineResource>): void {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	server.registerResource(def.name, def.uri, { description: def.description, mimeType: def.mimeType }, (uri, _extra) => def.handler(uri, db))
}

export function defineResourceTemplate(def: {
	name: string
	template: ResourceTemplate
	description: string
	mimeType: string
	handler: (uri: URL, variables: Record<string, string>, db: Kysely<Database>) => Promise<ReadResourceResult>
}) {
	return def
}

export function registerResourceTemplate(server: McpServer, db: Kysely<Database>, def: ReturnType<typeof defineResourceTemplate>): void {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	server.registerResource(def.name, def.template, { description: def.description, mimeType: def.mimeType }, (uri, variables, _extra) =>
		def.handler(uri, variables as Record<string, string>, db)
	)
}

export function definePrompt<S extends ZodRawShape>(def: {
	name: string
	title: string
	description: string
	schema: S
	handler: (args: z.infer<z.ZodObject<S>>) => GetPromptResult
}) {
	return def
}

export function registerPrompt<S extends ZodRawShape>(server: McpServer, def: ReturnType<typeof definePrompt<S>>): void {
	const argsSchema = def.schema as ZodRawShape
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	server.registerPrompt(def.name, { title: def.title, description: def.description, argsSchema }, (args, _extra) =>
		def.handler(args as z.infer<z.ZodObject<S>>)
	)
}

export type { ListResourcesResult, ReadResourceResult, GetPromptResult }
