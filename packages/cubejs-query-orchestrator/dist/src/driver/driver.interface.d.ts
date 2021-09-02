/// <reference types="node" />
export declare type GenericDataBaseType = string;
export interface TableColumn {
    name: string;
    type: GenericDataBaseType;
}
export declare type TableStructure = TableColumn[];
export interface DownloadTableBase {
    /**
     * Optional function to release stream/cursor/connection
     */
    release?: () => Promise<void>;
}
export interface DownloadTableMemoryData extends DownloadTableBase {
    rows: Record<string, unknown>[];
    /**
     * Some drivers know types of response
     */
    types?: TableStructure;
}
export interface DownloadTableCSVData extends DownloadTableBase {
    csvFile: string[];
    /**
     * Some drivers know types of response
     */
    types?: TableStructure;
}
export interface StreamTableData extends DownloadTableBase {
    rowStream: NodeJS.ReadableStream;
    /**
     * Some drivers know types of response
     */
    types?: TableStructure;
}
export declare type StreamTableDataWithTypes = StreamTableData & {
    /**
     * Some drivers know types of response
     */
    types: TableStructure;
};
export declare type DownloadTableData = DownloadTableMemoryData | DownloadTableCSVData | StreamTableData;
export interface ExternalDriverCompatibilities {
    csvImport?: true;
    streamImport?: true;
}
export declare type StreamOptions = {
    highWaterMark: number;
};
export interface DownloadQueryResultsBase {
    types: TableStructure;
}
export declare type DownloadQueryResultsOptions = StreamOptions & ExternalDriverCompatibilities;
export declare type IndexesSQL = {
    sql: [string, unknown[]];
}[];
export declare type UnloadOptions = {
    maxFileSize: number;
};
export declare type QueryOptions = {};
export declare type DownloadQueryResultsResult = DownloadQueryResultsBase & (DownloadTableMemoryData | DownloadTableCSVData | StreamTableData);
export interface DriverInterface {
    createSchemaIfNotExists(schemaName: string): Promise<any>;
    uploadTableWithIndexes(table: string, columns: TableStructure, tableData: DownloadTableData, indexesSql: IndexesSQL): Promise<void>;
    loadPreAggregationIntoTable: (preAggregationTableName: string, loadSql: string, params: any, options: any) => Promise<any>;
    query<R = unknown>(query: string, params: unknown[], options?: QueryOptions): Promise<R[]>;
    tableColumnTypes: (table: string) => Promise<TableStructure>;
    getTablesQuery: (schemaName: string) => Promise<({
        table_name?: string;
        TABLE_NAME?: string;
    })[]>;
    dropTable: (tableName: string, options?: QueryOptions) => Promise<unknown>;
    downloadQueryResults: (query: string, values: unknown[], options: DownloadQueryResultsOptions) => Promise<DownloadQueryResultsResult>;
    downloadTable: (table: string, options: ExternalDriverCompatibilities) => Promise<DownloadTableMemoryData | DownloadTableCSVData>;
    stream?: (table: string, values: unknown[], options: StreamOptions) => Promise<StreamTableData>;
    unload?: (table: string, options: UnloadOptions) => Promise<DownloadTableCSVData>;
    isUnloadSupported?: (options: UnloadOptions) => Promise<boolean>;
}
//# sourceMappingURL=driver.interface.d.ts.map