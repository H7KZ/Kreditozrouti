import { AsyncLocalStorage } from 'async_hooks'

const RequestStorage = new AsyncLocalStorage<Map<string, unknown>>()

const RequestContext = {
	run: (fn: () => void | Promise<void>, initialContext: Record<string, unknown>) => {
		const store = new Map(Object.entries(initialContext))
		return RequestStorage.run(store, fn)
	},

	add: (context: Record<string, unknown>) => {
		const store = RequestStorage.getStore()
		if (!store) {
			if (process.env.NODE_ENV !== 'production') console.warn('RequestContext.add() called outside a RequestContext.run() scope')
			return
		}
		for (const [k, v] of Object.entries(context)) store.set(k, v)
	},

	get: (): Record<string, unknown> => {
		const store = RequestStorage.getStore()
		return store ? Object.fromEntries(store) : {}
	}
}

export default RequestContext
