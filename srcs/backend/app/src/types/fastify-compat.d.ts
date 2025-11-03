declare module 'fastify' {
  function Fastify(opts?: any): any;
  export default Fastify;

  export type FastifyPluginAsync<T = any> = (fastify: any, opts?: T) => Promise<void> | void;
  export type FastifyInstance<RawServer = any, RawRequest = any, RawReply = any, Logger = any, TypeProvider = any> = any;
  export type FastifyRequest = any;
  export type FastifyReply = any;
}
