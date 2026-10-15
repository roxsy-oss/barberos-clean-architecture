import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Appointment, type AppointmentSnapshot } from "../domain/appointment.ts";
import type { AppointmentRepository } from "../application/appointment-repository.ts";

// Adapter de archivo JSON: las citas quedan en disco y sobreviven a que se cierre el programa.
// Implementa el mismo puerto que el adapter en memoria; el caso de uso no nota la diferencia.
export class JsonFileAppointmentRepository implements AppointmentRepository {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async findByBarberAndDay(barberId: string, day: Date): Promise<Appointment[]> {
    const key = day.toDateString();
    return (await this.readAll())
      .map((s) => Appointment.restore(s))
      .filter((a) => a.barberId === barberId && a.start.toDateString() === key);
  }

  async save(appointment: Appointment): Promise<void> {
    const all = (await this.readAll()).filter((s) => s.id !== appointment.id);
    all.push(appointment.toSnapshot());
    await mkdir(dirname(this.filePath), { recursive: true });
    // Se escribe a un temporal y se renombra, para no dejar el archivo a medias si algo falla.
    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, JSON.stringify(all, null, 2), "utf8");
    await rename(tmp, this.filePath);
  }

  private async readAll(): Promise<AppointmentSnapshot[]> {
    try {
      return JSON.parse(await readFile(this.filePath, "utf8")) as AppointmentSnapshot[];
    } catch (err) {
      if ((err as { code?: string }).code === "ENOENT") return [];
      throw err;
    }
  }
}
