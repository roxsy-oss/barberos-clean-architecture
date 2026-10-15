import type { Clock } from "../application/clock.ts";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
