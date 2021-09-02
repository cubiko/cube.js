import type { BaseDriver } from '../driver';
export declare type DriverFactory = () => (Promise<BaseDriver> | BaseDriver);
export declare type DriverFactoryByDataSource = (dataSource: string) => (Promise<BaseDriver> | BaseDriver);
//# sourceMappingURL=DriverFactory.d.ts.map