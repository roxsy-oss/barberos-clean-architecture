import { Appointment } from "../domain/appointment.ts";
import { DomainError } from "../domain/domain-error.ts";
import type { AppointmentRepository } from "./appointment-repository.ts";
import type { Clock } from "./clock.ts";

export interface BookAppointmentInput {
  appointmentId: string;
  barberId: string;
  customerId: string;
  start: Date;
  durationMin: number;
}

export interface BookAppointmentOutput {
  appointmentId: string;
  status: "apartada";
  holdExpiresAt: Date;
}

// Caso de uso: apartar un horario con un barbero sin encimarlo con otra cita (BR-03).
export class BookAppointment {
  private readonly appointments: AppointmentRepository;
  private readonly clock: Clock;

  constructor(appointments: AppointmentRepository, clock: Clock) {
    this.appointments = appointments;
    this.clock = clock;
  }

  async execute(input: BookAppointmentInput): Promise<BookAppointmentOutput> {
    const now = this.clock.now();

    // 1. La entidad valida sus datos y el horario del local (BR-05).
    const appointment = Appointment.create(
      {
        id: input.appointmentId,
        barberId: input.barberId,
        customerId: input.customerId,
        start: input.start,
        durationMin: input.durationMin,
      },
      now,
    );

    // 2. Traer las citas que ya tiene el barbero ese día.
    const sameDay = await this.appointments.findByBarberAndDay(input.barberId, input.start);

    // 3. Ninguna cita activa puede encimarse (BR-03).
    if (sameDay.some((other) => appointment.conflictsWith(other, now)))
      throw new DomainError("El barbero ya tiene una cita en ese horario");

    // 4. Guardar el apartado.
    await this.appointments.save(appointment);

    return {
      appointmentId: appointment.id,
      status: "apartada",
      holdExpiresAt: appointment.holdExpiresAt!,
    };
  }
}
