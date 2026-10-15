// Error de negocio: lo lanza el núcleo cuando una regla no se cumple.
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
