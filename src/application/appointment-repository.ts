import type { Appointment } from "../domain/appointment.ts";

// Puerto que define la capa de casos de uso. Las implementaciones viven en infrastructure/.
export interface AppointmentRepository {
  // Citas del barbero en el día de `day` (de 00:00 a 23:59, hora local), en cualquier estado.
  findByBarberAndDay(barberId: string, day: Date): Promise<Appointment[]>;
  save(appointment: Appointment): Promise<void>;
}
