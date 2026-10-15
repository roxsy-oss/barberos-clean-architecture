import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { BookAppointment } from "../src/application/book-appointment.ts";
import type { AppointmentRepository } from "../src/application/appointment-repository.ts";
import { DomainError } from "../src/domain/domain-error.ts";
import { FixedClock } from "./fixed-clock.ts";

// Las mismas pruebas del caso de uso, para cualquier adapter del repositorio.
// Si el caso de uso está bien desacoplado, deben pasar igual con todos.
export function bookAppointmentSuite(adapterName: string, makeRepo: () => AppointmentRepository) {
  describe(`BookAppointment con ${adapterName}`, () => {
    // Lunes 19 de octubre de 2026, 9:00 hora local. El local abre a las 10:00.
    const NOW = new Date(2026, 9, 19, 9, 0);
    const at = (h: number, m = 0) => new Date(2026, 9, 19, h, m);

    let repo: AppointmentRepository;
    let clock: FixedClock;
    let book: BookAppointment;

    beforeEach(() => {
      repo = makeRepo();
      clock = new FixedClock(NOW);
      book = new BookAppointment(repo, clock);
    });

    const input = (over: Partial<Parameters<BookAppointment["execute"]>[0]> = {}) => ({
      appointmentId: "cita-1",
      barberId: "barbero-1",
      customerId: "cliente-1",
      start: at(11),
      durationMin: 45,
      ...over,
    });

    it("aparta el horario libre por 10 minutos y lo guarda", async () => {
      const out = await book.execute(input());

      assert.equal(out.status, "apartada");
      assert.equal(out.holdExpiresAt.getTime(), at(9, 10).getTime());
      const saved = await repo.findByBarberAndDay("barbero-1", at(11));
      assert.equal(saved.length, 1);
      assert.equal(saved[0].id, "cita-1");
    });

    it("rechaza una cita que se encima con otra del mismo barbero (BR-03)", async () => {
      await book.execute(input()); // 11:00 a 11:45

      await assert.rejects(
        book.execute(input({ appointmentId: "cita-2", customerId: "cliente-2", start: at(11, 30) })),
        (err: unknown) => err instanceof DomainError && /ya tiene una cita/.test(err.message),
      );
      assert.equal((await repo.findByBarberAndDay("barbero-1", at(11))).length, 1);
    });

    it("permite la cita que empieza justo cuando termina la anterior", async () => {
      await book.execute(input()); // 11:00 a 11:45
      const out = await book.execute(
        input({ appointmentId: "cita-2", customerId: "cliente-2", start: at(11, 45) }),
      );
      assert.equal(out.appointmentId, "cita-2");
    });

    it("permite la misma hora con otro barbero", async () => {
      await book.execute(input());
      const out = await book.execute(
        input({ appointmentId: "cita-2", barberId: "barbero-2", customerId: "cliente-2" }),
      );
      assert.equal(out.appointmentId, "cita-2");
    });

    it("libera el horario cuando el apartado venció sin pago (BR-02)", async () => {
      await book.execute(input());
      clock.advanceMinutes(11);

      const out = await book.execute(
        input({ appointmentId: "cita-2", customerId: "cliente-2" }),
      );
      assert.equal(out.appointmentId, "cita-2");
    });

    it("rechaza fuera del horario del local y no guarda nada (BR-05)", async () => {
      await assert.rejects(book.execute(input({ start: at(19, 30) })), DomainError);
      assert.equal((await repo.findByBarberAndDay("barbero-1", at(19))).length, 0);
    });
  });
}
