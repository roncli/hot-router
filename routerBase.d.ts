import { RequestHandler } from "express"
import { WebsocketRequestHandler } from "express-ws"

declare module RouterBase {
    interface BaseRoute {
        file: string
        lastModified: Date
        path?: string
        class?: any
        include: boolean
        events: string[]
        methods: string[]
        notFound: boolean
        methodNotAllowed: boolean
        serverError: boolean
    }

    interface WebsocketRoute {
        webSocket: true
        middleware: WebsocketRequestHandler[]
    }

    interface WebRoute {
        webSocket: false
        middleware: RequestHandler<{[key: string]: string}, any, any, qs.ParsedQs, Record<string, any>>[]
    }

    export type Route = (BaseRoute & WebsocketRoute) | (BaseRoute & WebRoute)
}

declare class RouterBase {
    static get route(): RouterBase.Route
}

export = RouterBase
