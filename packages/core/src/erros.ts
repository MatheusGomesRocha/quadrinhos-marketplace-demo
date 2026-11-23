/** Erro esperado de regra de negócio: a API devolve `status` e a mensagem em português para a tela. */
export class ErroNegocio extends Error {
  constructor(
    public codigo: string,
    mensagem: string,
    public status = 400,
    public detalhes?: unknown,
  ) {
    super(mensagem);
    this.name = 'ErroNegocio';
  }
}
