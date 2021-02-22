declare module RouterBase {
    export type Route = {
        file: string
        lastModified: Date
        path?: string
        class?: any
        include: boolean
        webSocket: boolean
        events: string[]
        methods: string[]
        notFound: boolean
        methodNotAllowed: boolean
        serverError: boolean
    }
}

declare class RouterBase {
    static get route(): RouterBase.Route
}

export = RouterBase
