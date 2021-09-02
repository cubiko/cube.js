export interface RedisParsedResult {
    ssl: boolean;
    password?: string;
    username?: string;
    host?: string;
    port?: number;
    /**
     * Local domain socket path. If set the port, host and family will be ignored.
     */
    path?: string;
    sentinels?: {
        host: string;
        port: number;
    }[];
    db?: number;
    name?: string;
}
export declare function parseRedisUrl(url: Readonly<string>): RedisParsedResult;
//# sourceMappingURL=utils.d.ts.map