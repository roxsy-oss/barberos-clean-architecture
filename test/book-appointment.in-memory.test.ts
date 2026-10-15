import { InMemoryAppointmentRepository } from "../src/infrastructure/in-memory-appointment-repository.ts";
import { bookAppointmentSuite } from "./book-appointment.suite.ts";

// Parte 3: el caso de uso probado con el adapter en memoria, sin base de datos.
bookAppointmentSuite("adapter en memoria", () => new InMemoryAppointmentRepository());
