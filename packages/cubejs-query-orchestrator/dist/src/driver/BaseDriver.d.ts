export class BaseDriver {
    /**
     * Workaround for Type 'BaseDriver' has no construct signatures.
     *
     * @param {Object} [options]
     */
    constructor(options?: any);
    informationSchemaQuery(): string;
    getSslOptions(): {};
    /**
     * @abstract
     */
    testConnection(): Promise<void>;
    /**
     * @abstract
     * @param {string} query
     * @param {Array<unknown>} values
     * @param {any} [options]
     * @return {Promise<Array<any>>}
     */
    query(query: string, values: Array<unknown>, options?: any): Promise<Array<any>>;
    /**
     * @public
     * @return {Promise<any>}
     */
    public downloadQueryResults(query: any, values: any, options: any): Promise<any>;
    readOnly(): boolean;
    tablesSchema(): Promise<any>;
    /**
     * @param {string} schemaName
     * @return {Promise<Array<unknown>>}
     */
    createSchemaIfNotExists(schemaName: string): Promise<Array<unknown>>;
    getTablesQuery(schemaName: any): Promise<any[]>;
    loadPreAggregationIntoTable(preAggregationTableName: any, loadSql: any, params: any, options: any): Promise<any[]>;
    /**
     * @param {string} tableName
     * @param {unknown} [options]
     * @return {Promise<unknown>}
     */
    dropTable(tableName: string, options?: unknown): Promise<unknown>;
    /**
     * @param {number} paramIndex
     * @return {string}
     */
    param(paramIndex: number): string;
    testConnectionTimeout(): number;
    downloadTable(table: any, options: any): Promise<{
        rows: any[];
    }>;
    uploadTable(table: any, columns: any, tableData: any): Promise<void>;
    uploadTableWithIndexes(table: any, columns: any, tableData: any, indexesSql: any): Promise<void>;
    toColumnValue(value: any, genericType: any): any;
    tableColumnTypes(table: any): Promise<{
        name: any;
        type: string;
    }[]>;
    createTable(quotedTableName: any, columns: any): Promise<any[]>;
    createTableSql(quotedTableName: any, columns: any): string;
    /**
     * @param {string} columnType
     * @return {string}
     */
    toGenericType(columnType: string): string;
    /**
     * @param {string} columnType
     * @return {string}
     */
    fromGenericType(columnType: string): string;
    /**
     * @param {string} identifier
     * @return {string}
     */
    quoteIdentifier(identifier: string): string;
    cancelCombinator(fn: any): any;
    setLogger(logger: any): void;
    logger: any;
    reportQueryUsage(usage: any, queryOptions: any): void;
    databasePoolError(error: any): void;
    /**
     * @public
     */
    public release(): Promise<void>;
    capabilities(): {};
}
//# sourceMappingURL=BaseDriver.d.ts.map