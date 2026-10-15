import type { Clock } from "../src/application/clock.ts";

// Reloj de prueba: siempre da la misma hora, así las pruebas no dependen del día en que se corren.
export class FixedClock implements Clock {
  private current: Date;

  constructor(current: Date) {
    this.current = current;
  }

  now(): Date {
    return this.current;
  }

  advanceMinutes(minutes: number): void {
    this.current = new Date(this.current.getTime() + minutes * 60 * 1000);
  }
}
