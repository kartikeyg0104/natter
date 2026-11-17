import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isMongoId } from 'class-validator';

/** Rejects route params that are not MongoDB ObjectIds (Prisma would otherwise throw a 500). */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isMongoId(value)) {
      throw new BadRequestException(`'${value}' is not a valid id`);
    }
    return value;
  }
}
