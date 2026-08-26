import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class ChitPublishService {
  validateParticipantCount(totalMembers:number, activeParticipantCount:number) {
    if (activeParticipantCount !== totalMembers) throw new BadRequestException({code:'PARTICIPANT_COUNT_MISMATCH',message:`Exactly ${totalMembers} active participants are required.`});
  }
}
