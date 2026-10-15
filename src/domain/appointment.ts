import { DomainError } from "./domain-error.ts";

export type AppointmentStatus = "apartada" | "confirmada" | "cancelada";

// Lo que hace falta para reconstruir una cita guardada (en memoria, en un archivo o en una tabla).
export interface AppointmentSnapshot {
  id: string;
  barberId: string;
  customerId: string;
  start: string; // ISO 8601
  durationMin: number;
  status: AppointmentStatus;
  holdExpiresAt: string | null; // ISO 8601
}

const MINUTE = 60 * 1000;
const HOLD_MINUTES = 10; // BR-02
const OPENING_HOUR = 10; // BR-05
const CLOSING_HOUR = 20; // BR-05

export class Appointment {
  readonly id: string;
  readonly barberId: string;
  readonly customerId: string;
  readonly start: Date;
  readonly durationMin: number;
  private _status: AppointmentStatus;
  private _holdExpiresAt: Date | null;

  private constructor(s: AppointmentSnapshot) {
    this.id = s.id;
    this.barberId = s.barberId;
    this.customerId = s.customerId;
    this.start = new Date(s.start);
    this.durationMin = s.durationMin;
    this._status = s.status;
    this._holdExpiresAt = s.holdExpiresAt ? new Date(s.holdExpiresAt) : null;
  }

  // Cita nueva: pasa por todas las validaciones y nace "apartada" por 10 minutos (BR-02).
  static create(
    props: { id: string; barberId: string; customerId: string; start: Date; durationMin: number },
    now: Date,
  ): Appointment {
    if (!props.id) throw new DomainError("La cita necesita un id");
    if (!props.barberId) throw new DomainError("La cita necesita un barbero");
    if (!props.customerId) throw new DomainError("La cita necesita un cliente");
    if (Number.isNaN(props.start.getTime())) throw new DomainError("La hora de inicio no es válida");
    if (!Number.isInteger(props.durationMin) || props.durationMin < 15 || props.durationMin > 180)
      throw new DomainError("La duración debe ser de 15 a 180 minutos");
    if (props.start.getTime() <= now.getTime())
      throw new DomainError("No se puede agendar en el pasado");

    const end = new Date(props.start.getTime() + props.durationMin * MINUTE);
    const day = props.start.getDay(); // 0 = domingo
    const sameDay = end.toDateString() === props.start.toDateString();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    if (
      day === 0 ||
      props.start.getHours() < OPENING_HOUR ||
      !sameDay ||
      endMinutes > CLOSING_HOUR * 60
    )
      throw new DomainError("Fuera del horario del local (lunes a sábado, 10:00 a 20:00)"); // BR-05

    return new Appointment({
      ...props,
      start: props.start.toISOString(),
      status: "apartada",
      holdExpiresAt: new Date(now.getTime() + HOLD_MINUTES * MINUTE).toISOString(),
    });
  }

  // Cita que ya existía: no se vuelve a validar contra la hora actual.
  static restore(snapshot: AppointmentSnapshot): Appointment {
    return new Appointment(snapshot);
  }

  get status(): AppointmentStatus {
    return this._status;
  }

  get holdExpiresAt(): Date | null {
    return this._holdExpiresAt;
  }

  get end(): Date {
    return new Date(this.start.getTime() + this.durationMin * MINUTE);
  }

  // ¿Esta cita todavía ocupa el horario? Una cancelada o un apartado vencido ya no (BR-02).
  isActive(now: Date): boolean {
    if (this._status === "cancelada") return false;
    if (this._status === "apartada" && this._holdExpiresAt && this._holdExpiresAt <= now) return false;
    return true;
  }

  // BR-03: dos citas chocan si son del mismo barbero y sus intervalos se enciman.
  // Que una termine justo cuando empieza la otra NO es choque.
  conflictsWith(other: Appointment, now: Date): boolean {
    if (other.id === this.id) return false;
    if (other.barberId !== this.barberId) return false;
    if (!other.isActive(now)) return false;
    return this.start < other.end && other.start < this.end;
  }

  toSnapshot(): AppointmentSnapshot {
    return {
      id: this.id,
      barberId: this.barberId,
      customerId: this.customerId,
      start: this.start.toISOString(),
      durationMin: this.durationMin,
      status: this._status,
      holdExpiresAt: this._holdExpiresAt ? this._holdExpiresAt.toISOString() : null,
    };
  }
}
