import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates that a string is a valid UUID
 */
export function IsUUID(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUUID',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid UUID`;
        },
      },
    });
  };
}

/**
 * Validates that a string is a valid phone number (Indonesian format)
 */
export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          // Indonesian phone number format: +62, 08, or 62
          const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
          return phoneRegex.test(value.replace(/[\s-]/g, ''));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid Indonesian phone number`;
        },
      },
    });
  };
}

/**
 * Validates that a date is not in the past
 */
export function IsNotPastDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNotPastDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // Allow empty values, use @IsNotEmpty if required
          const date = new Date(value);
          const now = new Date();
          now.setHours(0, 0, 0, 0); // Reset time to start of day
          return date >= now;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} cannot be in the past`;
        },
      },
    });
  };
}

/**
 * Validates that a number is positive
 */
export function IsPositiveNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPositiveNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === 'number' && value > 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a positive number`;
        },
      },
    });
  };
}

/**
 * Validates that a string contains only alphanumeric characters and spaces
 */
export function IsAlphanumericWithSpaces(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isAlphanumericWithSpaces',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          const alphanumericRegex = /^[a-zA-Z0-9\s]+$/;
          return alphanumericRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain only letters, numbers, and spaces`;
        },
      },
    });
  };
}

/**
 * Validates that a string is a valid membership type
 */
export function IsMembershipType(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isMembershipType',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const validTypes = ['basic', 'premium', 'vip', 'student', 'corporate'];
          return typeof value === 'string' && validTypes.includes(value.toLowerCase());
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be one of: basic, premium, vip, student, corporate`;
        },
      },
    });
  };
}