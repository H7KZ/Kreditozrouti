import { AsyncLocalStorage } from 'async_hooks'

const RequestStorage = new AsyncLocalStorage<Map<string, unknown>>()

const RequestContext = {
    run: (fn: () => void, initialContext: Record<string, unknown>) => {
        const store = new Map(Object.entries(initialContext))
        RequestStorage.run(store, fn)
    },

    add: (context: Record<string, unknown>) => {
        const store = RequestStorage.getStore()
        if (store) for (const [k, v] of Object.entries(context)) store.set(k, v)
    },

    get: (): Record<string, unknown> => {
        const store = RequestStorage.getStore()
        return store ? Object.fromEntries(store) : {}
    }
}

export default RequestContext
