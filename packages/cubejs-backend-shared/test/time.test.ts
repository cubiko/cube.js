import { timeSeries } from '../src';

describe('timeSeries', () => {
  it('day', () => {
    expect(timeSeries('day', ['2021-01-01', '2021-01-02'])).toEqual([
      ['2021-01-01T00:00:00.000', '2021-01-01T23:59:59.999'],
      ['2021-01-02T00:00:00.000', '2021-01-02T23:59:59.999']
    ]);
  });

  it('quarter', () => {
    expect(timeSeries('quarter', ['2021-01-01', '2021-12-31'])).toEqual([
      ['2021-01-01T00:00:00.000', '2021-03-31T23:59:99.999'],
      ['2021-04-01T00:00:00.000', '2021-06-30T23:59:99.999'],
      ['2021-07-01T00:00:00.000', '2021-09-30T23:59:99.999'],
      ['2021-10-01T00:00:00.000', '2021-12-31T23:59:99.999'],
    ]);
  });
});