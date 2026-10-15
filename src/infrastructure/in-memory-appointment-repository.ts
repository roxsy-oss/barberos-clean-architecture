import { Appointment } from "../domain/appointment.ts";
import type { AppointmentRepository } from "../application/appointment-repository.ts";

// Adapter en memoria: un Map. Sirve para las pruebas y para correr sin base de datos.
export class InMemoryAppointmentRepository implements AppointmentRepository {
  private readonly items = new Map<string, Appointment>();

  async findByBarberAndDay(barberId: string, day: Date): Promise<Appointment[]> {
    const key = day.toDateString();
    return [...this.items.values()].filter(
      (a) => a.barberId === barberId && a.start.toDateString() === key,
    );
  }

  async save(appointment: Appointment): Promise<void> {
    // Se guarda una copia para que nadie modifique lo guardado desde afuera.
    this.items.set(appointment.id, Appointment.restore(appointment.toSnapshot()));
  }
}
