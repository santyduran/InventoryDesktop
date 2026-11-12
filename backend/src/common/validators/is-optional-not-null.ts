import { ValidateIf } from 'class-validator';

/**
 * Como @IsOptional(), pero solo omite la validación cuando el campo no viene.
 * Si llega `null`, se valida igual y se responde 400 en lugar de fallar
 * más adelante con un error 500.
 */
export function IsOptionalNotNull(): PropertyDecorator {
  return ValidateIf((_object, value) => value !== undefined);
}
