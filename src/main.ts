// Raíz de composición: el único lugar que sabe qué adapter se usa.
// Cambiar de memoria a JSON es cambiar esta línea, no el núcleo.
import { BookAppointment } from "./application/book-appointment.ts";
import { InMemoryAppointmentRepository } from "./infrastructure/in-memory-appointment-repository.ts";
import { JsonFileAppointmentRepository } from "./infrastructure/json-file-appointment-repository.ts";
import { SystemClock } from "./infrastructure/system-clock.ts";

const repo =
  process.argv[2] === "json"
    ? new JsonFileAppointmentRepository("data/citas.json")
    : new InMemoryAppointmentRepository();

const book = new BookAppointment(repo, new SystemClock());

// Próximo día hábil a las 11:00.
const start = new Date();
start.setDate(start.getDate() + 1);
if (start.getDay() === 0) start.setDate(start.getDate() + 1);
start.setHours(11, 0, 0, 0);

const base = { barberId: "barbero-1", start, durationMin: 45 };

const first = await book.execute({ ...base, appointmentId: crypto.randomUUID(), customerId: "cliente-1" });
console.log("Apartada:", first);

try {
  await book.execute({ ...base, appointmentId: crypto.randomUUID(), customerId: "cliente-2" });
} catch (err) {
  console.log("Rechazada:", (err as Error).message);
}
