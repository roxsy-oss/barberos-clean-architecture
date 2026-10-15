// Puerto para la hora: el caso de uso no llama a `new Date()` para que las pruebas controlen el tiempo.
export interface Clock {
  now(): Date;
}
