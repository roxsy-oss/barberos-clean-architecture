import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BookAppointment } from "../src/application/book-appointment.ts";
import { JsonFileAppointmentRepository } from "../src/infrastructure/json-file-appointment-repository.ts";
import { bookAppointmentSuite } from "./book-appointment.suite.ts";
import { FixedClock } from "./fixed-clock.ts";

// Parte 4: las mismas pruebas, ahora con el adapter de archivo JSON.
const dir = mkdtempSync(join(tmpdir(), "barberos-"));
let n = 0;
after(() => rmSync(dir, { recursive: true, force: true }));

bookAppointmentSuite("adapter de archivo JSON", () =>
  new JsonFileAppointmentRepository(join(dir, `citas-${++n}.json`)),
);

describe("JsonFileAppointmentRepository", () => {
  it("una cita guardada sigue bloqueando el horario aunque se abra otra instancia del adapter", async () => {
    const file = join(dir, "persistencia.json");
    const clock = new FixedClock(new Date(2026, 9, 19, 9, 0));
    const start = new Date(2026, 9, 19, 12, 0);

    await new BookAppointment(new JsonFileAppointmentRepository(file), clock).execute({
      appointmentId: "cita-1", barberId: "barbero-1", customerId: "cliente-1", start, durationMin: 30,
    });

    // Como si se reiniciara el programa: adapter nuevo, mismo archivo.
    const again = new BookAppointment(new JsonFileAppointmentRepository(file), clock);
    await assert.rejects(
      again.execute({
        appointmentId: "cita-2", barberId: "barbero-1", customerId: "cliente-2", start, durationMin: 30,
      }),
      /ya tiene una cita/,
    );
  });
});
