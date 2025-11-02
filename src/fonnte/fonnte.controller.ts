import { Controller } from '@nestjs/common';
import { FonnteService } from './fonnte.service';

@Controller('fonnte')
export class FonnteController {
  constructor(private readonly fonnteService: FonnteService) {}
}
