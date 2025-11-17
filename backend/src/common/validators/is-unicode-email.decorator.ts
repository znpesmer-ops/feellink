import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import * as isEmail from 'isemail';

export function IsUnicodeEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUnicodeEmail',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }

          return isEmail.validate(value, {
            allowUnicode: true,
            errorLevel: false,
          });
        },
        defaultMessage(args?: ValidationArguments) {
          const message = validationOptions?.message;
          if (typeof message === 'function') {
            return message(args as ValidationArguments);
          }

          if (typeof message === 'string') {
            return message;
          }

          return 'Lütfen geçerli bir e-posta adresi girin.';
        },
      },
    });
  };
}


