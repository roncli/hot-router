import { NextFunction, Request, RequestHandler, Response } from "express"
import { WebsocketRequestHandler } from "express-ws"
import { IncomingMessage } from "http"
import { ParsedQs } from "qs"
import { Duplex } from "stream"
import { WebSocket } from "ws"

declare namespace RouterBase {
    interface BaseRoute {
        file: string
        lastModified: Date
        path?: string
        include: boolean
        events: string[]
        methods: string[]
        notFound: boolean
        methodNotAllowed: boolean
        serverError: boolean
    }

    interface InternalWebsocketRoute {
        webSocket: true
        middleware: WebsocketRequestHandler[]
        class?: RouterBase & {
            close: (ws: WebSocket) => Promise<void> | void
            connection: (ws: WebSocket, request: IncomingMessage) => Promise<void> | void
            error: (ws: WebSocket, error: Error) => Promise<void> | void
            headers: (ws: WebSocket, headers: string[], request: IncomingMessage) => Promise<void> | void
            listening: (ws: WebSocket) => Promise<void> | void
            wsClientError: (ws: WebSocket, error: Error, socket: Duplex, request: IncomingMessage) => Promise<void> | void
        }
    }

    interface InternalWebRoute {
        webSocket: false
        middleware: RequestHandler<{[key: string]: string}, any, any, ParsedQs, Record<string, any>>[]
        class?: RouterBase & {
            [key: Lowercase<string>]: (req: Request, res: Response, next?: NextFunction) => Promise<void> | void
        }
    }

    type InternalRoute = (BaseRoute & InternalWebsocketRoute) | (BaseRoute & InternalWebRoute)

    interface WebsocketRoute {
        webSocket: true
        middleware: WebsocketRequestHandler[]
    }

    interface WebRoute {
        webSocket: false
        middleware: RequestHandler<{[key: string]: string}, any, any, ParsedQs, Record<string, any>>[]
    }

    export type Route = (BaseRoute & WebsocketRoute) | (BaseRoute & WebRoute)
}

declare class RouterBase {
    static get route(): RouterBase.Route
}

export = RouterBase
