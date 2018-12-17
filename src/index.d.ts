import { SecureContextOptions } from 'tls'
import { Url } from 'url'

interface Options {
  https?: boolean | SecureContextOptions
}

interface Headers {
  [s: string]: string
}

interface Request {
  method: string
  url: Url
  headers: Headers
  body: any
}

declare type Body = object | string | Buffer

declare type AddStubOptionsBodyCallback = (request: Request) => Body

interface AddStubOptions {
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
