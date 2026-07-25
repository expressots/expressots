import type { LocaleObject } from "@/types";

const fieldMessages: LocaleObject = {
  mixed: {
    default: "{label} é inválido",
    required: "{label} obrigatório",
    oneOf: "{label} deve ser um dos seguintes valores: {values}",
    notOneOf: "{label} não deve ser um dos seguintes valores: {values}",
    notType:
      "{label} deve ser do tipo `{type}`, mas o valor final foi: `{finalValue}`{cast}.{nullable}",
    defined: "{label} deve ser definido",
    cast: "(convertido a partir do valor `{value}`)",
    nullable:
      'Se "null" for um valor vazio pretendido, certifique-se de marcar o esquema como `.nullable()`',
  },
  string: {
    length: "{label} deve ter exatamente {length} caracteres",
    min: "{label} deve ter no mínimo {min} caracteres",
    max: "{label} deve ter no máximo {max} caracteres",
    matches: '{label} deve coincidir com o seguinte: "{regex}"',
    email: "{label} deve ser um e-mail válido",
    url: "{label} deve ser uma URL válida",
    uuid: "{label} deve ser um UUID válido",
    trim: "{label} deve ser uma string sem espaços extras",
    lowercase: "{label} deve ser uma string em minúsculas",
    uppercase: "{label} deve ser uma string em maiúsculas",
  },
  number: {
    min: "{label} precisa ser maior ou igual a {min}",
    max: "{label} precisa ser menor ou igual a {max}",
    lessThan: "{label} deve ser menor que {less}",
    moreThan: "{label} deve ser maior que {more}",
    positive: "{label} precisa ser um número positivo",
    negative: "{label} precisa ser um número negativo",
    integer: "{label} precisa ser um número inteiro",
  },
  date: {
    min: "{label} deve ser posterior a {min}",
    max: "{label} deve ser anterior a {max}",
  },

  boolean: {
    isValue: "{label} deve ser {value}",
  },

  object: {
    noUnknown: "{label} possui chaves não especificadas: {unknown}",
  },
  array: {
    min: "{label} deve ter no mínimo {min} itens",
    max: "{label} deve ter no máximo {max} itens",
    length: "{label} deve ter {length} itens",
  },
};

export default fieldMessages;
