import { NextFunction, Request, RequestHandler, Response } from "express"
import { IncomingMessage } from "http"
import { Duplex } from "stream"
import { WebSocket } from "ws"
import { WSRequestHandler } from "websocket-express"

declare namespace RouterBase {
    interface BaseRoute {
        path?: string | RegExp
        include: boolean
        catchAll: boolean
        notFound: boolean
        methodNotAllowed: boolean
        serverError: boolean
        middleware: RequestHandler[] | WSRequestHandler[]
    }

    interface InternalBaseRoute extends BaseRoute {
        file: string
        lastModified: Date
        events: string[]
        methods: string[]
    }

    interface InternalWebsocketRoute extends InternalBaseRoute {
        webSocket: true
        middleware: WSRequestHandler[]
        class?: RouterBase & {
            close: (ws: WebSocket) => Promise<void> | void
            connection: (ws: WebSocket, request: IncomingMessage) => Promise<void> | void
            error: (ws: WebSocket, error: Error) => Promise<void> | void
            headers: (ws: WebSocket, headers: string[], request: IncomingMessage) => Promise<void> | void
            listening: (ws: WebSocket) => Promise<void> | void
            wsClientError: (ws: WebSocket, error: Error, socket: Duplex, request: IncomingMessage) => Promise<void> | void
        }
    }

    interface InternalWebRoute extends InternalBaseRoute {
        webSocket: false
        middleware: RequestHandler[]
        class?: RouterBase & {
            [key: Lowercase<string>]: (req: Request, res: Response, next?: NextFunction) => Promise<void> | void
        }
    }

    type InternalRoute = InternalWebsocketRoute | InternalWebRoute

    interface WebsocketRoute extends BaseRoute {
        webSocket: true
        middleware: WSRequestHandler[]
    }

    interface WebRoute extends BaseRoute {
        webSocket: false
        middleware: RequestHandler[]
    }

    export type Route = WebsocketRoute | WebRoute
}

declare abstract class RouterBase {
    static get route(): RouterBase.Route
}

export = RouterBase
