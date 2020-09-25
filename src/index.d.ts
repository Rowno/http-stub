import { SecureContextOptions } from 'tls'
import { Url } from 'url'

export interface Options {
  https?: boolean | SecureContextOptions
}

export interface Headers {
  [s: string]: string
}

export interface Request {
  method: string
  url: Url
  headers: Headers
  body: any
}

export declare type Body = object | string | Buffer

export declare type AddStubOptionsBodyCallback = (request: Request) => Body

export interface AddStubOptions {
  statusCode?: number
  headers?: Headers
  body?: Body | AddStubOptionsBodyCallback
  delay?: number
  networkError?: boolean
}

export declare class HttpStub {
  url: string
  requests: Request[]
  unStubbedRequests: Request[]
  stubs: AddStubOptions[]
  notRequested: boolean
  requested: boolean
  requestedOnce: boolean
  requestedTwice: boolean
  requestedThrice: boolean
  start(): Promise<void>
  stop(): Promise<void>
  addStub(options?: AddStubOptions): void
  verify(): void
}

declare function createHttpStub(options?: Options): Promise<HttpStub>

export default createHttpStub
