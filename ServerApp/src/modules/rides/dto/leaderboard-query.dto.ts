import { IsEnum } from 'class-validator';

export enum LeaderboardPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class LeaderboardQueryDto {
  @IsEnum(LeaderboardPeriod)
  period: LeaderboardPeriod;
}
